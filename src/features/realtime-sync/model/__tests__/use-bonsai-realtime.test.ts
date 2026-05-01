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

// token-cache: subscribe 前に await される getSessionToken と onTokenRefresh
const mockGetSessionToken = jest.fn(async () => 'jwt-A');
let registeredRefresh: ((token: string) => void) | null = null;
const mockUnsubscribeRefresh = jest.fn();
const mockOnTokenRefresh = jest.fn((cb: (token: string) => void) => {
    registeredRefresh = cb;
    return mockUnsubscribeRefresh;
});

// Supabase チャンネルモック
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

import { useBonsaiRealtime } from '../use-bonsai-realtime';

describe('useBonsaiRealtime', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        effectCallback = null;
        registeredRefresh = null;
    });

    test('subscribe 前に realtime.setAuth(jwt) が await される (PoC 由来の必須要件)', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        const setAuthOrder = mockSetAuth.mock.invocationCallOrder[0]!;
        const subscribeOrder = mockSubscribe.mock.invocationCallOrder[0]!;
        expect(setAuthOrder).toBeLessThan(subscribeOrder);
        expect(mockSetAuth).toHaveBeenCalledWith('jwt-A');
    });

    test('slack_team_id filter で postgres_changes が購読される (RLS と二重防御)', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        expect(mockChannel).toHaveBeenCalledWith('bonsai-changes-T01XXXX-user-123');
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
        useBonsaiRealtime('user-123', 'T01XXXX');
        await effectCallback!();

        expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1);
    });

    test('payload の user_id が一致する場合に bonsai キャッシュを mutate する', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        capturedOnCallback({ new: { user_id: 'user-123', slack_team_id: 'T01XXXX' } });

        expect(mockMutate).toHaveBeenCalledWith(['bonsai', 'user-123']);
    });

    test('payload の user_id が異なる場合は mutate しない (テナント内の他人の UPDATE 受信時)', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        capturedOnCallback({ new: { user_id: 'user-other', slack_team_id: 'T01XXXX' } });

        expect(mockMutate).not.toHaveBeenCalled();
    });

    test('onTokenRefresh 経由で setAuth(newToken) が呼ばれる (TTL ロールオーバー対応)', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        expect(mockOnTokenRefresh).toHaveBeenCalledTimes(1);
        // token-cache 側で再取得が起きたことをシミュレート
        registeredRefresh!('jwt-B');

        expect(mockSetAuth).toHaveBeenCalledWith('jwt-B');
    });

    test('unmount で removeChannel + onTokenRefresh の unsubscribe が呼ばれる', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        const cleanup = (await effectCallback!()) as () => void;
        await Promise.resolve();
        await Promise.resolve();

        cleanup();

        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelObj);
        expect(mockUnsubscribeRefresh).toHaveBeenCalled();
    });

    test('userId が undefined の場合は購読しない', async () => {
        useBonsaiRealtime(undefined, 'T01XXXX');
        await effectCallback!();

        expect(mockSetAuth).not.toHaveBeenCalled();
        expect(mockChannel).not.toHaveBeenCalled();
        expect(mockOnTokenRefresh).not.toHaveBeenCalled();
    });

    test('slackTeamId が undefined の場合も購読しない', async () => {
        useBonsaiRealtime('user-123', undefined);
        await effectCallback!();

        expect(mockSetAuth).not.toHaveBeenCalled();
        expect(mockChannel).not.toHaveBeenCalled();
        expect(mockOnTokenRefresh).not.toHaveBeenCalled();
    });
});
