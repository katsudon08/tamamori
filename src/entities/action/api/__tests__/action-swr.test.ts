import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// SWR モック
const mockUseSWR = jest.fn<(...args: unknown[]) => { data: unknown; error: unknown }>();
jest.mock('swr', () => ({
    __esModule: true,
    default: (...args: unknown[]) => mockUseSWR(...args),
}));

// Supabase ブラウザクライアント モック (.eq().eq().gte().order() のチェーン)
const mockOrder = jest.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>();
const mockGte = jest.fn<(...args: unknown[]) => { order: typeof mockOrder }>(() => ({
    order: mockOrder,
}));
type EqChain = { eq: (...args: unknown[]) => EqChain; gte: typeof mockGte };
const mockEq: jest.Mock<(...args: unknown[]) => EqChain> = jest.fn(
    (): EqChain => ({ eq: mockEq, gte: mockGte }),
);
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
        test('userId / slackTeamId / startDate が指定された場合、SWR key に slackTeamId を含める', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useActionLogs('uuid-user-1', 'T01XXXX', '2025-01-01');

            expect(mockUseSWR).toHaveBeenCalledWith(
                ['action-logs', 'uuid-user-1', 'T01XXXX', '2025-01-01'],
                expect.any(Function),
            );
        });

        test('userId が undefined の場合、SWR キーが null になる', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useActionLogs(undefined, 'T01XXXX', '2025-01-01');

            expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
        });

        test('slackTeamId が undefined の場合、SWR キーが null になる', () => {
            mockUseSWR.mockReturnValue({ data: null, error: null });

            useActionLogs('uuid-user-1', undefined, '2025-01-01');

            expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
        });

        test('fetcher が user_id + slack_team_id + 日付範囲フィルタを構築する', async () => {
            mockOrder.mockResolvedValue({ data: [], error: null });
            mockUseSWR.mockImplementation((_key: unknown, fetcher: unknown) => {
                (fetcher as (...args: unknown[]) => unknown)([
                    'action-logs',
                    'uuid-user-1',
                    'T01XXXX',
                    '2025-01-01',
                ]);
                return { data: null, error: null };
            });

            useActionLogs('uuid-user-1', 'T01XXXX', '2025-01-01');

            expect(mockFrom).toHaveBeenCalledWith('action_log');
            expect(mockSelect).toHaveBeenCalledWith('action_type, created_at');
            expect(mockEq).toHaveBeenCalledWith('user_id', 'uuid-user-1');
            expect(mockEq).toHaveBeenCalledWith('slack_team_id', 'T01XXXX');
            expect(mockGte).toHaveBeenCalledWith('created_at', '2025-01-01');
            expect(mockOrder).toHaveBeenCalledWith('created_at', {
                ascending: true,
            });
        });

        test('fetcher が Supabase エラー時に throw する', async () => {
            const dbError = { message: 'DB error' };
            mockOrder.mockResolvedValue({ data: null, error: dbError });

            let capturedFetcher: (...args: unknown[]) => unknown = () => {};
            mockUseSWR.mockImplementation((_key: unknown, fetcher: unknown) => {
                capturedFetcher = fetcher as (...args: unknown[]) => unknown;
                return { data: null, error: null };
            });

            useActionLogs('uuid-user-1', 'T01XXXX', '2025-01-01');

            await expect(
                capturedFetcher(['action-logs', 'uuid-user-1', 'T01XXXX', '2025-01-01']),
            ).rejects.toEqual(dbError);
        });
    });
});
