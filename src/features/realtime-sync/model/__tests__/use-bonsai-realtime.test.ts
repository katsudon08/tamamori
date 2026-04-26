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
    void token; // 受領していることだけ確認
});
const mockCreateBrowserClient = jest.fn(() => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    realtime: { setAuth: mockSetAuth },
}));

jest.mock('@/shared/lib/supabase', () => ({
    createBrowserClient: () => mockCreateBrowserClient(),
    getSessionToken: () => mockGetSessionToken(),
}));

import { useBonsaiRealtime } from '../use-bonsai-realtime';

describe('useBonsaiRealtime', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        effectCallback = null;
    });

    test('subscribe 前に realtime.setAuth(jwt) が await される (PoC 由来の必須要件)', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        await effectCallback!();
        // microtask flush
        await Promise.resolve();
        await Promise.resolve();

        // setAuth は subscribe より前に呼ばれている
        const setAuthOrder = mockSetAuth.mock.invocationCallOrder[0]!;
        const subscribeOrder = mockSubscribe.mock.invocationCallOrder[0]!;
        expect(setAuthOrder).toBeLessThan(subscribeOrder);
        expect(mockSetAuth).toHaveBeenCalledWith('jwt-A');
    });

    test('user_id filter で postgres_changes が購読される', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        expect(mockChannel).toHaveBeenCalledWith('bonsai-changes-user-123');
        expect(mockOn).toHaveBeenCalledWith(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'bonsai',
                filter: 'user_id=eq.user-123',
            },
            expect.any(Function),
        );
        expect(mockSubscribe).toHaveBeenCalled();
    });

    test('createBrowserClient はフック内で呼ばれる (モジュールスコープのシングルトン撤去)', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        await effectCallback!();

        expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1);
    });

    test('payload到着時にmutateが正しいキーで呼ばれる', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        await effectCallback!();
        await Promise.resolve();
        await Promise.resolve();

        capturedOnCallback({ new: { user_id: 'user-123' } });

        expect(mockMutate).toHaveBeenCalledWith(['bonsai', 'user-123']);
        expect(mockMutate).toHaveBeenCalledWith('all-bonsai');
    });

    test('unmount時にremoveChannelが呼ばれる', async () => {
        useBonsaiRealtime('user-123', 'T01XXXX');
        const cleanup = (await effectCallback!()) as () => void;
        await Promise.resolve();
        await Promise.resolve();

        cleanup();

        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelObj);
    });

    test('userId が undefined の場合は購読しない', async () => {
        useBonsaiRealtime(undefined, 'T01XXXX');
        await effectCallback!();

        expect(mockSetAuth).not.toHaveBeenCalled();
        expect(mockChannel).not.toHaveBeenCalled();
    });

    test('slackTeamId が undefined の場合も購読しない (二重防御の前提が崩れるため)', async () => {
        useBonsaiRealtime('user-123', undefined);
        await effectCallback!();

        expect(mockSetAuth).not.toHaveBeenCalled();
        expect(mockChannel).not.toHaveBeenCalled();
    });
});
