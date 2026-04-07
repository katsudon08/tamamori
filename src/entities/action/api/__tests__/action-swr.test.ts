import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// SWR モック
const mockUseSWR = jest.fn<(...args: unknown[]) => { data: unknown; error: unknown }>();
jest.mock('swr', () => ({
    __esModule: true,
    default: (...args: unknown[]) => mockUseSWR(...args),
}));

// Supabase ブラウザクライアント モック
const mockOrder = jest.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>();
const mockGte = jest.fn<(...args: unknown[]) => { order: typeof mockOrder }>(() => ({
    order: mockOrder,
}));
const mockEq = jest.fn<(...args: unknown[]) => { gte: typeof mockGte }>(() => ({ gte: mockGte }));
const mockSelect = jest.fn<(...args: unknown[]) => { eq: typeof mockEq }>(() => ({ eq: mockEq }));
const mockFrom = jest.fn<(...args: unknown[]) => { select: typeof mockSelect }>(() => ({
    select: mockSelect,
}));

jest.mock('@/shared/lib/supabase', () => ({
    createBrowserClient: () => ({ from: mockFrom }),
}));

import { useActionLogs } from '../action-swr';

describe('action SWR フック', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('useActionLogs', () => {
        test('userIdとstartDateが指定された場合、正しいSWRキーでフックを呼ぶ', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useActionLogs('uuid-user-1', '2025-01-01');

            expect(mockUseSWR).toHaveBeenCalledWith(
                ['action-logs', 'uuid-user-1', '2025-01-01'],
                expect.any(Function),
            );
        });

        test('userIdがundefinedの場合、SWRキーがnullになる', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useActionLogs(undefined, '2025-01-01');

            expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
        });

        test('fetcherが日付範囲フィルタリングを含むクエリを構築する', async () => {
            mockOrder.mockResolvedValue({ data: [], error: null });
            mockUseSWR.mockImplementation(
                (_key: unknown, fetcher: unknown) => {
                    (fetcher as (...args: unknown[]) => unknown)(['action-logs', 'uuid-user-1', '2025-01-01']);
                    return { data: null, error: null };
                },
            );

            useActionLogs('uuid-user-1', '2025-01-01');

            expect(mockFrom).toHaveBeenCalledWith('action_log');
            expect(mockSelect).toHaveBeenCalledWith('action_type, created_at');
            expect(mockEq).toHaveBeenCalledWith('user_id', 'uuid-user-1');
            expect(mockGte).toHaveBeenCalledWith('created_at', '2025-01-01');
            expect(mockOrder).toHaveBeenCalledWith('created_at', {
                ascending: true,
            });
        });

        test('fetcherがSupabaseエラー時にthrowする', async () => {
            const dbError = { message: 'DB error' };
            mockOrder.mockResolvedValue({ data: null, error: dbError });

            let capturedFetcher: (...args: unknown[]) => unknown = () => {};
            mockUseSWR.mockImplementation(
                (_key: unknown, fetcher: unknown) => {
                    capturedFetcher = fetcher as (...args: unknown[]) => unknown;
                    return { data: null, error: null };
                },
            );

            useActionLogs('uuid-user-1', '2025-01-01');

            await expect(
                capturedFetcher(['action-logs', 'uuid-user-1', '2025-01-01']),
            ).rejects.toEqual(dbError);
        });
    });
});
