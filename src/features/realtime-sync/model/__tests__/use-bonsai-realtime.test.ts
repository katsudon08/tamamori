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

jest.mock('@/shared/lib/supabase', () => ({
    createBrowserClient: () => ({
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
    }),
}));

import { useBonsaiRealtime } from '../use-bonsai-realtime';

describe('useBonsaiRealtime', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        effectCallback = null;
    });

    test('正しいフィルタで購読が作成される', () => {
        useBonsaiRealtime('user-123');
        // useEffect コールバックを実行
        effectCallback!();

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

    test('payload到着時にmutateが正しいキーで呼ばれる', () => {
        useBonsaiRealtime('user-123');
        effectCallback!();

        capturedOnCallback({ new: { user_id: 'user-123' } });

        expect(mockMutate).toHaveBeenCalledWith(['bonsai', 'user-123']);
        expect(mockMutate).toHaveBeenCalledWith('all-bonsai');
    });

    test('unmount時にremoveChannelが呼ばれる', () => {
        useBonsaiRealtime('user-123');
        const cleanup = effectCallback!() as () => void;

        cleanup();

        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelObj);
    });

    test('userIdがundefinedの場合は購読しない', () => {
        useBonsaiRealtime(undefined);
        effectCallback!();

        expect(mockChannel).not.toHaveBeenCalled();
        expect(mockSubscribe).not.toHaveBeenCalled();
    });
});
