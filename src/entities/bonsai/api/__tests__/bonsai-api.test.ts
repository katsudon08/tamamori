import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- サーバー用関数のテスト ---

const mockSingle = jest.fn<() => Promise<{ data: unknown; error: unknown }>>();
type EqChain = { single: typeof mockSingle; eq: (...args: unknown[]) => EqChain };
const mockEq: jest.Mock<(...args: unknown[]) => EqChain> = jest.fn(
    (): EqChain => ({ single: mockSingle, eq: mockEq }),
);
const mockSelect = jest.fn<(...args: unknown[]) => { eq: typeof mockEq }>(() => ({ eq: mockEq }));
const mockInsert = jest.fn<(...args: unknown[]) => { select: () => { single: typeof mockSingle } }>(
    () => ({ select: jest.fn(() => ({ single: mockSingle })) }),
);
const mockUpdate = jest.fn<(...args: unknown[]) => { eq: typeof mockEq }>(() => ({ eq: mockEq }));
const mockFrom = jest.fn<(...args: unknown[]) => Record<string, unknown>>(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
}));

jest.mock('@/shared/lib/supabase', () => ({
    createServerClient: () => ({ from: mockFrom }),
}));

import { getBonsaiByUserId, createBonsai, updateBonsai } from '../bonsai-api';

describe('bonsai-api サーバー用関数', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getBonsaiByUserId', () => {
        test('user_id と slackTeamId で盆栽を取得する (自テーブル slack_team_id 直接参照)', async () => {
            const expected = {
                id: 'uuid-bonsai-1',
                user_id: 'uuid-user-1',
                slack_team_id: 'T01XXXX',
                total_messages: 5,
                growth_stage: 'sprout',
            };
            mockSingle.mockResolvedValue({ data: expected, error: null });

            const result = await getBonsaiByUserId('uuid-user-1', 'T01XXXX');

            expect(mockFrom).toHaveBeenCalledWith('bonsai');
            // RLS ポリシーと同じ列を参照する形に統一 (JOIN は使わない)
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockEq).toHaveBeenCalledWith('user_id', 'uuid-user-1');
            expect(mockEq).toHaveBeenCalledWith('slack_team_id', 'T01XXXX');
            // 旧来の users JOIN 経由の filter が呼ばれていないことを確認
            expect(mockEq).not.toHaveBeenCalledWith('users.slack_team_id', 'T01XXXX');
            expect(result).toEqual(expected);
        });

        test('エラー時にthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
            });

            await expect(getBonsaiByUserId('uuid-invalid', 'T01XXXX')).rejects.toEqual({
                message: 'Not found',
            });
        });
    });

    describe('createBonsai', () => {
        test('userId と slackTeamId を受け取り INSERT に slack_team_id を含める', async () => {
            const userId = 'uuid-user-1';
            const slackTeamId = 'T01XXXX';
            const expected = {
                id: 'uuid-bonsai-1',
                user_id: userId,
                slack_team_id: slackTeamId,
                growth_stage: 'seed',
            };
            mockSingle.mockResolvedValue({ data: expected, error: null });

            const result = await createBonsai(userId, slackTeamId);

            expect(mockFrom).toHaveBeenCalledWith('bonsai');
            expect(mockInsert).toHaveBeenCalledWith({
                user_id: userId,
                slack_team_id: slackTeamId,
            });
            expect(result).toEqual(expected);
        });

        test('エラー時にthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { message: 'Duplicate' },
            });

            await expect(createBonsai('uuid-user-1', 'T01XXXX')).rejects.toEqual({
                message: 'Duplicate',
            });
        });
    });

    describe('updateBonsai', () => {
        test('id + slack_team_id 二重 filter で update する', async () => {
            const updateData = {
                total_messages: 10,
                growth_stage: 'sprout' as const,
            };
            const expected = { id: 'uuid-bonsai-1', ...updateData };
            mockSingle.mockResolvedValue({ data: expected, error: null });

            const result = await updateBonsai('uuid-bonsai-1', 'T01XXXX', updateData);

            expect(mockFrom).toHaveBeenCalledWith('bonsai');
            expect(mockUpdate).toHaveBeenCalledWith(updateData);
            expect(mockEq).toHaveBeenCalledWith('id', 'uuid-bonsai-1');
            expect(mockEq).toHaveBeenCalledWith('slack_team_id', 'T01XXXX');
            expect(result).toEqual(expected);
        });

        test('エラー時にthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
            });

            await expect(updateBonsai('invalid', 'T01XXXX', {})).rejects.toEqual({
                message: 'Not found',
            });
        });
    });
});
