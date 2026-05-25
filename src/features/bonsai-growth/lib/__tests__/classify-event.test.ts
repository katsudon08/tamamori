import { describe, test, expect } from '@jest/globals';
import { classifyEvent, findThanksKeyword, type SlackInnerEvent } from '../classify-event';

describe('classifyEvent', () => {
    test('通常メッセージ → ["message"]', () => {
        const event: SlackInnerEvent = {
            type: 'message',
            text: '今日もがんばりましょう！',
        };

        expect(classifyEvent(event)).toEqual(['message']);
    });

    test('"ありがとうございます" を含むメッセージ → ["message", "thanks"]', () => {
        const event: SlackInnerEvent = {
            type: 'message',
            text: 'レビューありがとうございます！',
        };

        expect(classifyEvent(event)).toEqual(['message', 'thanks']);
    });

    test('"ありがと！" を含むメッセージ → ["message", "thanks"]', () => {
        const event: SlackInnerEvent = {
            type: 'message',
            text: 'ありがと！助かった',
        };

        expect(classifyEvent(event)).toEqual(['message', 'thanks']);
    });

    test('"アリガトウ" を含むメッセージ → ["message", "thanks"]', () => {
        const event: SlackInnerEvent = {
            type: 'message',
            text: 'アリガトウございます',
        };

        expect(classifyEvent(event)).toEqual(['message', 'thanks']);
    });

    test('"感謝します" を含むメッセージ → ["message", "thanks"]', () => {
        const event: SlackInnerEvent = {
            type: 'message',
            text: '皆さんに感謝します',
        };

        expect(classifyEvent(event)).toEqual(['message', 'thanks']);
    });

    test('リアクション追加 → ["reaction"]', () => {
        const event: SlackInnerEvent = {
            type: 'reaction_added',
        };

        expect(classifyEvent(event)).toEqual(['reaction']);
    });

    test('botメッセージ (subtype: "bot_message") → []', () => {
        const event: SlackInnerEvent = {
            type: 'message',
            subtype: 'bot_message',
            text: 'bot message',
        };

        expect(classifyEvent(event)).toEqual([]);
    });

    test('メッセージ編集 (subtype: "message_changed") → []', () => {
        const event: SlackInnerEvent = {
            type: 'message',
            subtype: 'message_changed',
            text: 'edited message',
        };

        expect(classifyEvent(event)).toEqual([]);
    });

    test('未知のイベントタイプ → []', () => {
        // @ts-expect-error 未知のイベントタイプに対するランタイム防御をテスト
        expect(classifyEvent({ type: 'app_mention' })).toEqual([]);
    });
});

describe('findThanksKeyword', () => {
    test('"ありがとう" を含むテキスト → "ありがとう"', () => {
        expect(findThanksKeyword('レビューありがとうございます！')).toBe('ありがとう');
    });

    test('"感謝" を含むテキスト → "感謝"', () => {
        expect(findThanksKeyword('皆さんに感謝します')).toBe('感謝');
    });

    test('キーワードなしのテキスト → null', () => {
        expect(findThanksKeyword('今日もがんばりましょう！')).toBeNull();
    });

    test('複数キーワードを含む場合、最初にマッチしたものを返す', () => {
        expect(findThanksKeyword('ありがとう、感謝します')).toBe('ありがとう');
    });
});
