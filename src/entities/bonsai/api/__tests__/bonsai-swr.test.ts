import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// SWR モック
const mockUseSWR = jest.fn<(...args: unknown[]) => { data: unknown; error: unknown }>();
jest.mock('swr', () => ({
    __esModule: true,
    default: (...args: unknown[]) => mockUseSWR(...args),
}));

// Supabase ブラウザクライアント モック（.eq().eq().single() / .eq().order() をチェーン可能に）
const mockOrder = jest.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>();
const mockSingle = jest.fn<() => Promise<{ data: unknown; error: unknown }>>();
type EqChain = {
    single: typeof mockSingle;
    order: typeof mockOrder;
    eq: (...args: unknown[]) => EqChain;
};
const mockEq: jest.Mock<(...args: unknown[]) => EqChain> = jest.fn(
    (): EqChain => ({ single: mockSingle, order: mockOrder, eq: mockEq }),
);
const mockSelect = jest.fn<(...args: unknown[]) => { eq: typeof mockEq; order: typeof mockOrder }>(
    () => ({
        eq: mockEq,
        order: mockOrder,
    }),
);
const mockFrom = jest.fn<(...args: unknown[]) => { select: typeof mockSelect }>(() => ({
    select: mockSelect,
}));

jest.mock('@/shared/lib/supabase', () => ({
    createBrowserClient: () => ({ from: mockFrom }),
}));

import { useBonsai, useAllBonsai } from '../bonsai-swr';

describe('bonsai SWR フック', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('useBonsai', () => {
        test('userId と slackTeamId が指定された場合、正しいSWRキーでフックを呼ぶ', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useBonsai('uuid-user-1', 'T01XXXX');

            expect(mockUseSWR).toHaveBeenCalledWith(
                ['bonsai', 'uuid-user-1'],
                expect.any(Function),
            );
        });

        test('userIdがundefinedの場合、SWRキーがnullになる', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useBonsai(undefined, 'T01XXXX');

            expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
        });

        test('slackTeamIdがundefinedの場合、SWRキーがnullになる', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useBonsai('uuid-user-1', undefined);

            expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
        });

        test('fetcher が bonsai + users!inner JOIN (表示用) + slack_team_id 直接参照 filter を構築する', async () => {
            mockSingle.mockResolvedValue({ data: { id: 'bonsai-1' }, error: null });
            mockUseSWR.mockImplementation((_key: unknown, fetcher: unknown) => {
                (fetcher as (...args: unknown[]) => unknown)(['bonsai', 'uuid-user-1']);
                return { data: null, error: null };
            });

            useBonsai('uuid-user-1', 'T01XXXX');

            expect(mockFrom).toHaveBeenCalledWith('bonsai');
            // display_name/avatar_url の表示用 JOIN は維持
            expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('users!inner'));
            expect(mockEq).toHaveBeenCalledWith('user_id', 'uuid-user-1');
            // RLS と同じ列を参照する形に統一
            expect(mockEq).toHaveBeenCalledWith('slack_team_id', 'T01XXXX');
            // 旧来の users JOIN 経由 filter は使わない
            expect(mockEq).not.toHaveBeenCalledWith('users.slack_team_id', 'T01XXXX');
        });

        test('fetcherがSupabaseエラー時にthrowする', async () => {
            const dbError = { message: 'DB error' };
            mockSingle.mockResolvedValue({ data: null, error: dbError });

            let capturedFetcher: (...args: unknown[]) => unknown = () => {};
            mockUseSWR.mockImplementation((_key: unknown, fetcher: unknown) => {
                capturedFetcher = fetcher as (...args: unknown[]) => unknown;
                return { data: null, error: null };
            });

            useBonsai('uuid-user-1', 'T01XXXX');

            await expect(capturedFetcher(['bonsai', 'uuid-user-1'])).rejects.toEqual(dbError);
        });
    });

    describe('useAllBonsai', () => {
        test('slackTeamId が指定された場合、SWRキーが "all-bonsai" である', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useAllBonsai('T01XXXX');

            expect(mockUseSWR).toHaveBeenCalledWith('all-bonsai', expect.any(Function));
        });

        test('slackTeamIdがundefinedの場合、SWRキーがnullになる', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useAllBonsai(undefined);

            expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
        });

        test('fetcher が users!inner JOIN (表示用) + slack_team_id 直接参照 + created_at 昇順を構築する', async () => {
            mockOrder.mockResolvedValue({ data: [], error: null });
            mockUseSWR.mockImplementation((_key: unknown, fetcher: unknown) => {
                (fetcher as (...args: unknown[]) => unknown)('all-bonsai');
                return { data: null, error: null };
            });

            useAllBonsai('T01XXXX');

            expect(mockFrom).toHaveBeenCalledWith('bonsai');
            expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('users!inner'));
            // RLS と同じ列を参照する形に統一
            expect(mockEq).toHaveBeenCalledWith('slack_team_id', 'T01XXXX');
            expect(mockEq).not.toHaveBeenCalledWith('users.slack_team_id', 'T01XXXX');
            expect(mockOrder).toHaveBeenCalledWith('created_at', {
                ascending: true,
            });
        });

        test('fetcherがSupabaseエラー時にthrowする', async () => {
            const dbError = { message: 'DB error' };
            mockOrder.mockResolvedValue({ data: null, error: dbError });

            let capturedFetcher: (...args: unknown[]) => unknown = () => {};
            mockUseSWR.mockImplementation((_key: unknown, fetcher: unknown) => {
                capturedFetcher = fetcher as (...args: unknown[]) => unknown;
                return { data: null, error: null };
            });

            useAllBonsai('T01XXXX');

            await expect(capturedFetcher('all-bonsai')).rejects.toEqual(dbError);
        });
    });
});
