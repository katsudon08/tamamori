import { describe, test, expect } from '@jest/globals';
import { aggregateDaily } from '../aggregate-daily';
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

describe('aggregateDaily', () => {
    test('空配列を渡すと空配列を返す', () => {
        expect(aggregateDaily([])).toEqual([]);
    });

    test('1日に複数アクションがある場合正しく集計する', () => {
        const actions: ActionLog[] = [
            makeAction({ action_type: 'message', created_at: '2026-04-01T09:00:00Z' }),
            makeAction({ action_type: 'message', created_at: '2026-04-01T14:00:00Z' }),
            makeAction({ action_type: 'reaction', created_at: '2026-04-01T15:00:00Z' }),
        ];

        const result = aggregateDaily(actions);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            date: '2026-04-01',
            message: 2,
            reaction: 1,
            thanks: 0,
            total: 3,
        });
    });

    test('複数日にまたがるアクションを日付昇順でソートする', () => {
        const actions: ActionLog[] = [
            makeAction({ created_at: '2026-04-03T10:00:00Z' }),
            makeAction({ created_at: '2026-04-01T10:00:00Z' }),
            makeAction({ created_at: '2026-04-02T10:00:00Z' }),
        ];

        const result = aggregateDaily(actions);
        expect(result).toHaveLength(3);
        expect(result[0].date).toBe('2026-04-01');
        expect(result[1].date).toBe('2026-04-02');
        expect(result[2].date).toBe('2026-04-03');
    });

    test('全3種のaction_typeが正しくカウントされる', () => {
        const actions: ActionLog[] = [
            makeAction({ action_type: 'message', created_at: '2026-04-01T10:00:00Z' }),
            makeAction({ action_type: 'reaction', created_at: '2026-04-01T11:00:00Z' }),
            makeAction({ action_type: 'thanks', created_at: '2026-04-01T12:00:00Z' }),
            makeAction({ action_type: 'thanks', created_at: '2026-04-01T13:00:00Z' }),
        ];

        const result = aggregateDaily(actions);
        expect(result[0]).toEqual({
            date: '2026-04-01',
            message: 1,
            reaction: 1,
            thanks: 2,
            total: 4,
        });
    });

    test('totalが3種の合計と一致する', () => {
        const actions: ActionLog[] = [
            makeAction({ action_type: 'message', created_at: '2026-04-01T10:00:00Z' }),
            makeAction({ action_type: 'message', created_at: '2026-04-01T11:00:00Z' }),
            makeAction({ action_type: 'reaction', created_at: '2026-04-01T12:00:00Z' }),
            makeAction({ action_type: 'thanks', created_at: '2026-04-01T13:00:00Z' }),
        ];

        const result = aggregateDaily(actions);
        expect(result[0].total).toBe(result[0].message + result[0].reaction + result[0].thanks);
    });
});
