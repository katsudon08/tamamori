import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Supabase サーバークライアントのモック
const mockSingle = jest.fn<() => Promise<{ data: unknown; error: unknown }>>();
const mockEq = jest.fn<(...args: unknown[]) => { single: typeof mockSingle }>(() => ({
    single: mockSingle,
}));
const mockInsert = jest.fn<(...args: unknown[]) => { select: () => { single: typeof mockSingle } }>(
    () => ({ select: jest.fn(() => ({ single: mockSingle })) }),
);
const mockSelect = jest.fn<(...args: unknown[]) => { eq: typeof mockEq }>(() => ({ eq: mockEq }));
const mockFrom = jest.fn<(...args: unknown[]) => Record<string, unknown>>(() => ({
    select: mockSelect,
    insert: mockInsert,
}));

jest.mock('@/shared/lib/supabase', () => ({
    createServerClient: () => ({ from: mockFrom }),
}));

import { insertAction, checkEventExists } from '../action-api';

describe('action-api サーバー用関数', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('insertAction', () => {
        test('action_log に slack_team_id 込みでレコードを挿入する', async () => {
            const actionData = {
                user_id: 'uuid-user-1',
                slack_team_id: 'T01XXXX',
                action_type: 'message' as const,
                slack_event_id: 'Ev01XXXX',
                slack_channel: 'C01XXXX',
                metadata: { text_snippet: 'hello' },
            };
            const expected = { id: 'uuid-action-1', ...actionData };
            mockSingle.mockResolvedValue({ data: expected, error: null });

            const result = await insertAction(actionData);

            expect(mockFrom).toHaveBeenCalledWith('action_log');
            expect(mockInsert).toHaveBeenCalledWith(actionData);
            // slack_team_id が INSERT ペイロードに必ず含まれる (RLS + 複合 FK の前提)
            expect((mockInsert.mock.calls[0]![0] as { slack_team_id: string }).slack_team_id).toBe(
                'T01XXXX',
            );
            expect(result).toEqual(expected);
        });

        test('エラー時にthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { message: 'Duplicate' },
            });

            await expect(
                insertAction({
                    user_id: 'uuid-user-1',
                    slack_team_id: 'T01XXXX',
                    action_type: 'message',
                    slack_event_id: 'Ev01XXXX',
                    slack_channel: null,
                    metadata: {},
                }),
            ).rejects.toEqual({ message: 'Duplicate' });
        });
    });

    describe('checkEventExists', () => {
        test('slack_event_idの存在を確認する', async () => {
            mockSingle.mockResolvedValue({
                data: { id: 'uuid-action-1' },
                error: null,
            });

            const result = await checkEventExists('Ev01XXXX');

            expect(mockFrom).toHaveBeenCalledWith('action_log');
            expect(mockSelect).toHaveBeenCalledWith('id');
            expect(mockEq).toHaveBeenCalledWith('slack_event_id', 'Ev01XXXX');
            expect(result).toBe(true);
        });

        test('存在しない場合falseを返す', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
            });

            const result = await checkEventExists('Ev_NOTFOUND');

            expect(result).toBe(false);
        });

        test('PGRST116以外のエラー時にthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { code: 'OTHER', message: 'Unexpected error' },
            });

            await expect(checkEventExists('Ev01XXXX')).rejects.toEqual({
                code: 'OTHER',
                message: 'Unexpected error',
            });
        });
    });
});
