import type { ActionType } from '@/entities/action';

const THANKS_KEYWORDS = ['ありがとう', 'ありがと', 'アリガトウ', '感謝'] as const;

/** classifyEvent が受け取るSlack内部イベントの型 */
export type SlackInnerEvent =
    | { type: 'message'; subtype?: string; text: string }
    | { type: 'reaction_added' };

/**
 * Slackイベントをアクション種別に分類する。
 * メッセージに感謝キーワードが含まれる場合は ['message', 'thanks'] を返す。
 */
export function classifyEvent(event: SlackInnerEvent): ActionType[] {
    if (event.type === 'message') {
        if (event.subtype != null) {
            return [];
        }
        const actions: ActionType[] = ['message'];
        if (findThanksKeyword(event.text) !== null) {
            actions.push('thanks');
        }
        return actions;
    }

    if (event.type === 'reaction_added') {
        return ['reaction'];
    }

    return [];
}

/**
 * テキストに含まれる最初の感謝キーワードを返す。
 * 見つからない場合は null。
 */
export function findThanksKeyword(text: string): string | null {
    return THANKS_KEYWORDS.find((keyword) => text.includes(keyword)) ?? null;
}
