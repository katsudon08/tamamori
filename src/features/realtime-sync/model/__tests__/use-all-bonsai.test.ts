import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// useEffect モック — コールバックとクリーンアップをキャプチャ
let effectCallback: (() => (() => void) | void) | null = null;
jest.mock('react', () => ({
    useEffect: jest.fn((cb: () => (() => void) | void) => {
        effectCallback = cb;
    }),
}));

// SWR mutate モック
const mockMutate = jest.fn();
jest.mock('swr', () => ({
    useSWRConfig: () => ({ mutate: mockMutate }),
}));

const mockGetSessionToken = jest.fn(async () => 'jwt-A');
let registeredRefresh: ((token: string) => void) | null = null;
const mockUnsubscribeRefresh = jest.fn();
const mockOnTokenRefresh = jest.fn((cb: (token: string) => void) => {
    registeredRefresh = cb;
    return mockUnsubscribeRefresh;
});

// Supabase チャンネルモック (createBrowserClient はフック内で都度呼ぶ前提)
type OnCallback = (payload: { new: Record<string, unknown> }) => void;
let capturedOnCallback: OnCallback = () => {};
const mockChannelObj = Symbol('channel');
const mockSubscribe = jest.fn(() => mockChannelObj);
const mockOn = jest.fn((_type: string, _filter: Record<string, unknown>, cb: OnCallback) => {
    capturedOnCallback = cb;
    return { subscribe: mockSubscribe };
});
const mockChannel = jest.fn<(...args: unknown[]) => { on: typeof mockOn }>(() => ({ on: mockOn }));
const mockRemoveChannel = jest.fn();
const mockSetAuth = jest.fn(async (token: string) => {
    void token;
});
const mockCreateBrowserClient = jest.fn(() => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    realtime: { setAuth: mockSetAuth },
}));

jest.mock('@/shared/lib/supabase', () => ({
    createBrowserClient: () => mockCreateBrowserClient(),
    getSessionToken: () => mockGetSessionToken(),
    onTokenRefresh: (cb: (token: string) => void) => mockOnTokenRefresh(cb),
}));

import { useAllBonsaiRealtime } from '../use-all-bonsai';

describe('useAllBonsaiRealtime', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        effectCallback = null;
        registeredRefresh = null;
    });

    test('subscribe 前に realtime.setAuth(jwt) が await される (PoC 由来の必須要件)', async () => {
        useAllBonsaiRealtime('T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        const setAuthOrder = mockSetAuth.mock.invocationCallOrder[0]!;
        const subscribeOrder = mockSubscribe.mock.invocationCallOrder[0]!;
        expect(setAuthOrder).toBeLessThan(subscribeOrder);
        expect(mockSetAuth).toHaveBeenCalledWith('jwt-A');
    });

    test('slack_team_id filter で全盆栽購読が作成される (RLS との二重防御)', async () => {
        useAllBonsaiRealtime('T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        expect(mockChannel).toHaveBeenCalledWith('bonsai-changes-all-T01XXXX');
        expect(mockOn).toHaveBeenCalledWith(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'bonsai',
                filter: 'slack_team_id=eq.T01XXXX',
            },
            expect.any(Function),
        );
        expect(mockSubscribe).toHaveBeenCalled();
    });

    test('createBrowserClient はフック内で呼ばれる (シングルトン撤去)', async () => {
        useAllBonsaiRealtime('T01XXXX');
        await effectCallback!();

        expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1);
    });

    test('payload到着時にmutateが呼ばれる', async () => {
        useAllBonsaiRealtime('T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        capturedOnCallback({ new: { user_id: 'user-456', slack_team_id: 'T01XXXX' } });

        expect(mockMutate).toHaveBeenCalledWith('all-bonsai');
        expect(mockMutate).toHaveBeenCalledWith(['bonsai', 'user-456']);
    });

    test('payload の slack_team_id が異なる場合は mutate しない', async () => {
        useAllBonsaiRealtime('T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        capturedOnCallback({ new: { user_id: 'user-456', slack_team_id: 'T_OTHER' } });

        expect(mockMutate).not.toHaveBeenCalled();
    });

    test('payload.new が欠損している場合は mutate しない', async () => {
        useAllBonsaiRealtime('T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        capturedOnCallback({ new: {} });

        expect(mockMutate).not.toHaveBeenCalled();
    });

    test('onTokenRefresh 経由で setAuth(newToken) が呼ばれる (TTL ロールオーバー対応)', async () => {
        useAllBonsaiRealtime('T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        expect(mockOnTokenRefresh).toHaveBeenCalledTimes(1);
        const initialSetAuthOrder = mockSetAuth.mock.invocationCallOrder[0]!;
        const subscribeRefreshOrder = mockOnTokenRefresh.mock.invocationCallOrder[0]!;
        expect(initialSetAuthOrder).toBeLessThan(subscribeRefreshOrder);

        registeredRefresh!('jwt-B');

        expect(mockSetAuth).toHaveBeenCalledWith('jwt-B');
    });

    test('onTokenRefresh 経由の setAuth が reject しても unhandled にせずログに流す', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        useAllBonsaiRealtime('T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        mockSetAuth.mockRejectedValueOnce(new Error('refresh failed'));
        registeredRefresh!('jwt-B');
        await Promise.resolve();

        expect(consoleSpy).toHaveBeenCalledWith(
            '[useAllBonsaiRealtime] refresh setAuth failed:',
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    test('unmount で removeChannel + onTokenRefresh の unsubscribe が呼ばれる', async () => {
        useAllBonsaiRealtime('T01XXXX');
        const cleanup = (await effectCallback!()) as () => void;
        await Promise.resolve();
        await Promise.resolve();

        cleanup();

        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelObj);
        expect(mockUnsubscribeRefresh).toHaveBeenCalled();
    });

    test('slackTeamId が undefined の場合は購読しない', async () => {
        useAllBonsaiRealtime(undefined);
        await effectCallback!();

        expect(mockSetAuth).not.toHaveBeenCalled();
        expect(mockChannel).not.toHaveBeenCalled();
        expect(mockOnTokenRefresh).not.toHaveBeenCalled();
    });
});
