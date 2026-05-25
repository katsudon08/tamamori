import { classifyEvent, findThanksKeyword } from '../lib/classify-event';
import { determineStage, computeVisualState, type Counters } from '../model/growth-engine';
import { fetchGrowthRules } from '../model/growth-rules';

import type { ActionType } from '@/entities/action';
import { checkEventExists, insertAction } from '@/entities/action';
import { getUserBySlackIdAndTeamId } from '@/entities/user';
import { getBonsaiByUserId, updateBonsai } from '@/entities/bonsai';
import { getEnv } from '@/shared/config';

// --- ペイロード型（FSD: features間の直接インポート禁止のためローカル定義）---

interface MessageEventPayload {
    type: 'message';
    subtype?: string;
    user: string;
    text: string;
    channel: string;
    ts: string;
}

interface ReactionAddedEventPayload {
    type: 'reaction_added';
    user: string;
    reaction: string;
    item: { type: string; channel: string; ts: string };
}

type InnerEventPayload = MessageEventPayload | ReactionAddedEventPayload;

export interface SlackEventPayload {
    type: 'event_callback';
    event_id: string;
    team_id: string;
    event: InnerEventPayload;
}

const TEXT_SNIPPET_MAX = 100;

/**
 * Slackイベントを処理し、盆栽の状態を更新する。
 * after() 経由で呼び出される非同期パイプライン。
 */
export async function processSlackEvent(payload: SlackEventPayload): Promise<void> {
    try {
        const { event_id, team_id, event } = payload;

        // 1. チャンネルフィルタ
        const channel = extractChannel(event);
        if (!getEnv().SLACK_WATCHED_CHANNELS.includes(channel)) {
            return;
        }

        // 2. 冪等性チェック
        // Slack payload の team_id で絞り、別テナントの同一 event_id を重複扱いしない。
        if (await checkEventExists(event_id, team_id)) {
            return;
        }

        // 3. イベント分類 (イベントのカラムは単一だけど、感謝キーワードを含むとき['message', 'thanks']を返す)
        const actions = classifyEvent(event);
        if (actions.length === 0) {
            return;
        }

        // 4. ユーザー取得 (team-aware lookup)
        // payload.team_id を取得条件に含めることで、lookup 自体で tenant 境界を
        // 確立する (後段に post-check を置かない構造)。PGRST116 は
        // 「未登録」と「別テナント」を区別せず同一エラー扱いとする。
        let user;
        try {
            user = await getUserBySlackIdAndTeamId(event.user, team_id);
        } catch (err) {
            if ((err as { code?: string })?.code === 'PGRST116') {
                return;
            }
            throw err;
        }

        // 5. bonsai 取得
        // PGRST116 (該当行なし = bonsai 未作成 or 他テナント越境) は書き込み対象が無いため
        // 早期 return する。障害系 (非 PGRST116) は上位 catch で error ログさせる。
        // callback 側の PGRST116 ハンドリングと方針を統一している。
        let bonsai;
        try {
            bonsai = await getBonsaiByUserId(user.id, user.slack_team_id);
        } catch (err) {
            if ((err as { code?: string })?.code === 'PGRST116') {
                return;
            }
            throw err;
        }

        // 6. action_log 挿入
        // slack_team_id は user lookup の結果由来 (検証済み値) を渡す。
        // payload.team_id を直接渡すと user との不整合が起き得るため避ける。
        for (let i = 0; i < actions.length; i++) {
            const actionType = actions[i];
            await insertAction({
                user_id: user.id,
                slack_team_id: user.slack_team_id,
                action_type: actionType,
                slack_event_id: i === 0 ? event_id : `${event_id}_${actionType}`,
                slack_channel: channel,
                metadata: buildMetadata(event, actionType),
            });
        }

        // 7. カウンター更新
        const counters: Counters = {
            totalMessages:
                (bonsai.total_messages as number) + (actions.includes('message') ? 1 : 0),
            totalReactions:
                (bonsai.total_reactions as number) + (actions.includes('reaction') ? 1 : 0),
            totalThanks: (bonsai.total_thanks as number) + (actions.includes('thanks') ? 1 : 0),
        };

        // 8. ステージ再判定
        const rules = await fetchGrowthRules();
        const growthStage = determineStage(counters, rules);

        // 9. visual_state 再計算
        const visualState = computeVisualState(counters, user.id);

        // 10. bonsai 更新
        // updateBonsai は (id, slackTeamId) 二重 filter を持つため、bonsai.id が
        // 何らかの理由で別テナントの行を指していても DB レベルで弾かれる
        // (service_role 経路で RLS バイパスのためアプリ層 filter が唯一の防御)。
        await updateBonsai(bonsai.id as string, user.slack_team_id, {
            total_messages: counters.totalMessages,
            total_reactions: counters.totalReactions,
            total_thanks: counters.totalThanks,
            growth_stage: growthStage,
            visual_state: visualState,
        });
    } catch (error) {
        console.error(
            '[slack-events] processing failed:',
            error instanceof Error ? error.message : error,
        );
    }
}

function extractChannel(event: InnerEventPayload): string {
    if (event.type === 'message') {
        return event.channel;
    }
    return event.item.channel;
}

function buildMetadata(
    event: InnerEventPayload,
    actionType: ActionType,
): Record<string, string | null> {
    if (event.type === 'message') {
        if (actionType === 'thanks') {
            return {
                text_snippet: event.text.slice(0, TEXT_SNIPPET_MAX),
                keyword: findThanksKeyword(event.text),
            };
        }
        return { text_snippet: event.text.slice(0, TEXT_SNIPPET_MAX) };
    }

    if (event.type === 'reaction_added') {
        return { emoji: event.reaction, target_ts: event.item.ts };
    }

    return {};
}
