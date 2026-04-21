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
        test('user_id と slackTeamId で盆栽を取得する（users JOIN でテナント検証）', async () => {
            const expected = {
                id: 'uuid-bonsai-1',
                user_id: 'uuid-user-1',
                total_messages: 5,
                growth_stage: 'sprout',
            };
            mockSingle.mockResolvedValue({ data: expected, error: null });

            const result = await getBonsaiByUserId('uuid-user-1', 'T01XXXX');

            expect(mockFrom).toHaveBeenCalledWith('bonsai');
            expect(mockSelect).toHaveBeenCalledWith('*, users!inner(slack_team_id)');
            expect(mockEq).toHaveBeenCalledWith('user_id', 'uuid-user-1');
            expect(mockEq).toHaveBeenCalledWith('users.slack_team_id', 'T01XXXX');
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
        test('初期状態(seed)で盆栽を作成する', async () => {
            const userId = 'uuid-user-1';
            const expected = { id: 'uuid-bonsai-1', user_id: userId, growth_stage: 'seed' };
            mockSingle.mockResolvedValue({ data: expected, error: null });

            const result = await createBonsai(userId);

            expect(mockFrom).toHaveBeenCalledWith('bonsai');
            expect(mockInsert).toHaveBeenCalledWith({ user_id: userId });
            expect(result).toEqual(expected);
        });

        test('エラー時にthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { message: 'Duplicate' },
            });

            await expect(createBonsai('uuid-user-1')).rejects.toEqual({
                message: 'Duplicate',
            });
        });
    });

    describe('updateBonsai', () => {
        test('カウンター・ステージ・visual_stateを更新する', async () => {
            const updateData = {
                total_messages: 10,
                growth_stage: 'sprout' as const,
            };
            const expected = { id: 'uuid-bonsai-1', ...updateData };
            mockSingle.mockResolvedValue({ data: expected, error: null });

            const result = await updateBonsai('uuid-bonsai-1', updateData);

            expect(mockFrom).toHaveBeenCalledWith('bonsai');
            expect(mockUpdate).toHaveBeenCalledWith(updateData);
            expect(mockEq).toHaveBeenCalledWith('id', 'uuid-bonsai-1');
            expect(result).toEqual(expected);
        });

        test('エラー時にthrowする', async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
            });

            await expect(updateBonsai('invalid', {})).rejects.toEqual({
                message: 'Not found',
            });
        });
    });
});
