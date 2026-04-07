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
        if (containsThanks(event.text)) {
            actions.push('thanks');
        }
        return actions;
    }

    if (event.type === 'reaction_added') {
        return ['reaction'];
    }

    return [];
}

function containsThanks(text: string): boolean {
    return THANKS_KEYWORDS.some((keyword) => text.includes(keyword));
}
