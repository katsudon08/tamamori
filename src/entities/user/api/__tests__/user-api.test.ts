import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Supabase サーバークライアントのモック
const mockSingle = jest.fn<() => Promise<{ data: unknown; error: unknown }>>();
const mockEq = jest.fn<(...args: unknown[]) => { single: typeof mockSingle }>(() => ({
    single: mockSingle,
}));
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

import { upsertUser, getUserBySlackId } from '../user-api';

describe('user-api (サーバー用関数)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('upsertUser', () => {
        test('usersテーブルにslack_user_idでupsertする', async () => {
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
                onConflict: 'slack_user_id',
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

    describe('getUserBySlackId', () => {
        test('slack_user_idでユーザーを取得する', async () => {
            const expected = {
                id: 'uuid-1',
                slack_user_id: 'U01XXXX',
                slack_team_id: 'T01XXXX',
                display_name: 'テストユーザー',
                avatar_url: null,
            };
            mockSingle.mockResolvedValue({ data: expected, error: null });

            const result = await getUserBySlackId('U01XXXX');

            expect(mockFrom).toHaveBeenCalledWith('users');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockEq).toHaveBeenCalledWith('slack_user_id', 'U01XXXX');
            expect(result).toEqual(expected);
        });

        test('エラー時にthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
            });

            await expect(getUserBySlackId('U_INVALID')).rejects.toEqual({
                message: 'Not found',
            });
        });
    });
});
