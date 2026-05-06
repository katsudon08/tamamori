import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Supabase サーバークライアントのモック
// .eq() は .eq() チェーン (複数 filter) と .single() の両方を許容する
const mockSingle = jest.fn<() => Promise<{ data: unknown; error: unknown }>>();
type EqReturn = { eq: (...args: unknown[]) => EqReturn; single: typeof mockSingle };
const eqReturn: EqReturn = {
    eq: (...args: unknown[]) => mockEq(...args),
    single: mockSingle,
};
const mockEq = jest.fn<(...args: unknown[]) => EqReturn>(() => eqReturn);
const mockUpsert = jest.fn<(...args: unknown[]) => { select: () => { single: typeof mockSingle } }>(
    () => ({ select: jest.fn(() => ({ single: mockSingle })) }),
);
const mockSelect = jest.fn<(...args: unknown[]) => { eq: typeof mockEq }>(() => ({ eq: mockEq }));
const mockFrom = jest.fn<(...args: unknown[]) => Record<string, unknown>>(() => ({
    select: mockSelect,
    upsert: mockUpsert,
}));

jest.mock('@/shared/lib/supabase', () => ({
    createServerClient: () => ({ from: mockFrom }),
}));

import { upsertUser, getUserBySlackIdAndTeamId } from '../user-api';

describe('user-api (サーバー用関数)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('upsertUser', () => {
        test('users テーブルに (slack_user_id, slack_team_id) 複合 onConflict で upsert する', async () => {
            const userData = {
                slack_user_id: 'U01XXXX',
                slack_team_id: 'T01XXXX',
                display_name: 'テストユーザー',
                avatar_url: 'https://example.com/avatar.png',
            };
            const expected = { id: 'uuid-1', ...userData };
            mockSingle.mockResolvedValue({ data: expected, error: null });

            const result = await upsertUser(userData);

            expect(mockFrom).toHaveBeenCalledWith('users');
            expect(mockUpsert).toHaveBeenCalledWith(userData, {
                onConflict: 'slack_user_id,slack_team_id',
            });
            expect(result).toEqual(expected);
        });

        test('エラー時にthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { message: 'DB error' },
            });

            await expect(
                upsertUser({
                    slack_user_id: 'U01XXXX',
                    slack_team_id: 'T01XXXX',
                    display_name: 'test',
                    avatar_url: null,
                }),
            ).rejects.toEqual({ message: 'DB error' });
        });
    });

    describe('getUserBySlackIdAndTeamId', () => {
        test('slack_user_id + slack_team_id でユーザーを取得する', async () => {
            const expected = {
                id: 'uuid-1',
                slack_user_id: 'U01XXXX',
                slack_team_id: 'T01XXXX',
                display_name: 'テストユーザー',
                avatar_url: null,
            };
            mockSingle.mockResolvedValue({ data: expected, error: null });

            const result = await getUserBySlackIdAndTeamId('U01XXXX', 'T01XXXX');

            expect(mockFrom).toHaveBeenCalledWith('users');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockEq).toHaveBeenCalledWith('slack_user_id', 'U01XXXX');
            expect(mockEq).toHaveBeenCalledWith('slack_team_id', 'T01XXXX');
            expect(result).toEqual(expected);
        });

        test('該当行なし (PGRST116) でthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'no rows' },
            });

            await expect(getUserBySlackIdAndTeamId('U_INVALID', 'T01XXXX')).rejects.toEqual({
                code: 'PGRST116',
                message: 'no rows',
            });
        });

        test('DB エラー時にthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { message: 'DB error' },
            });

            await expect(getUserBySlackIdAndTeamId('U01XXXX', 'T01XXXX')).rejects.toEqual({
                message: 'DB error',
            });
        });
    });
});
