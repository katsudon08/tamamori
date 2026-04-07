import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// SWR モック
const mockUseSWR = jest.fn<(...args: unknown[]) => { data: unknown; error: unknown }>();
jest.mock('swr', () => ({
    __esModule: true,
    default: (...args: unknown[]) => mockUseSWR(...args),
}));

// Supabase ブラウザクライアント モック
const mockOrder = jest.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>();
const mockSingle = jest.fn<() => Promise<{ data: unknown; error: unknown }>>();
const mockEq = jest.fn<(...args: unknown[]) => { single: typeof mockSingle }>(() => ({
    single: mockSingle,
}));
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
        test('userIdが指定された場合、正しいSWRキーでフックを呼ぶ', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useBonsai('uuid-user-1');

            expect(mockUseSWR).toHaveBeenCalledWith(
                ['bonsai', 'uuid-user-1'],
                expect.any(Function),
            );
        });

        test('userIdがundefinedの場合、SWRキーがnullになる', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useBonsai(undefined);

            expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
        });

        test('fetcher が bonsai + users!inner JOIN クエリを構築する', async () => {
            mockSingle.mockResolvedValue({ data: { id: 'bonsai-1' }, error: null });
            mockUseSWR.mockImplementation(
                (_key: unknown, fetcher: unknown) => {
                    (fetcher as (...args: unknown[]) => unknown)(['bonsai', 'uuid-user-1']);
                    return { data: null, error: null };
                },
            );

            useBonsai('uuid-user-1');

            expect(mockFrom).toHaveBeenCalledWith('bonsai');
            expect(mockSelect).toHaveBeenCalledWith(
                expect.stringContaining('users!inner'),
            );
            expect(mockEq).toHaveBeenCalledWith('user_id', 'uuid-user-1');
        });

        test('fetcherがSupabaseエラー時にthrowする', async () => {
            const dbError = { message: 'DB error' };
            mockSingle.mockResolvedValue({ data: null, error: dbError });

            let capturedFetcher: (...args: unknown[]) => unknown = () => {};
            mockUseSWR.mockImplementation(
                (_key: unknown, fetcher: unknown) => {
                    capturedFetcher = fetcher as (...args: unknown[]) => unknown;
                    return { data: null, error: null };
                },
            );

            useBonsai('uuid-user-1');

            await expect(capturedFetcher(['bonsai', 'uuid-user-1'])).rejects.toEqual(
                dbError,
            );
        });
    });

    describe('useAllBonsai', () => {
        test('SWRキーが "all-bonsai" である', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useAllBonsai();

            expect(mockUseSWR).toHaveBeenCalledWith(
                'all-bonsai',
                expect.any(Function),
            );
        });

        test('fetcher が users!inner JOIN + created_at 昇順のクエリを構築する', async () => {
            mockOrder.mockResolvedValue({ data: [], error: null });
            mockUseSWR.mockImplementation(
                (_key: unknown, fetcher: unknown) => {
                    (fetcher as (...args: unknown[]) => unknown)('all-bonsai');
                    return { data: null, error: null };
                },
            );

            useAllBonsai();

            expect(mockFrom).toHaveBeenCalledWith('bonsai');
            expect(mockSelect).toHaveBeenCalledWith(
                expect.stringContaining('users!inner'),
            );
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

            useAllBonsai();

            await expect(capturedFetcher('all-bonsai')).rejects.toEqual(dbError);
        });
    });
});
