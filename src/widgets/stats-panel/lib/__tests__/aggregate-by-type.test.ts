import { describe, test, expect } from '@jest/globals';
import { aggregateByType } from '../aggregate-by-type';
import type { ActionLog } from '@/entities/action';

function makeAction(overrides: Partial<ActionLog> = {}): ActionLog {
    return {
        id: '00000000-0000-0000-0000-000000000001',
        user_id: '00000000-0000-0000-0000-000000000010',
        action_type: 'message',
        slack_event_id: 'E001',
        slack_channel: 'C001',
        metadata: {},
        created_at: '2026-04-01T10:00:00Z',
        ...overrides,
    };
}

describe('aggregateByType', () => {
    test('空配列を渡すと全タイプがcount=0で返る', () => {
        const result = aggregateByType([]);
        expect(result).toHaveLength(3);
        expect(result.every((r) => r.count === 0)).toBe(true);
    });

    test('偏ったデータでも正しくカウントする', () => {
        const actions: ActionLog[] = [
            makeAction({ action_type: 'message' }),
            makeAction({ action_type: 'message' }),
            makeAction({ action_type: 'message' }),
            makeAction({ action_type: 'reaction' }),
        ];

        const result = aggregateByType(actions);
        const msg = result.find((r) => r.type === 'message')!;
        const rxn = result.find((r) => r.type === 'reaction')!;
        const thx = result.find((r) => r.type === 'thanks')!;

        expect(msg.count).toBe(3);
        expect(rxn.count).toBe(1);
        expect(thx.count).toBe(0);
    });

    test('固定順序 message, reaction, thanks で返る', () => {
        const result = aggregateByType([]);
        expect(result[0].type).toBe('message');
        expect(result[1].type).toBe('reaction');
        expect(result[2].type).toBe('thanks');
    });

    test('ラベルが和名で返る', () => {
        const result = aggregateByType([]);
        expect(result[0].label).toBe('メッセージ');
        expect(result[1].label).toBe('リアクション');
        expect(result[2].label).toBe('感謝');
    });
});
