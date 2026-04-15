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
const mockChannel = jest.fn(() => ({ on: mockOn }));
const mockRemoveChannel = jest.fn();

jest.mock('@/shared/lib/supabase', () => ({
    createBrowserClient: () => ({
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
    }),
}));

import { useAllBonsaiRealtime } from '../use-all-bonsai';

describe('useAllBonsaiRealtime', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        effectCallback = null;
    });

    test('フィルタなしで全盆栽購読が作成される', () => {
        useAllBonsaiRealtime();
        effectCallback!();

        expect(mockChannel).toHaveBeenCalledWith('bonsai-changes-all');
        expect(mockOn).toHaveBeenCalledWith(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'bonsai',
            },
            expect.any(Function),
        );
        expect(mockSubscribe).toHaveBeenCalled();
    });

    test('payload到着時にmutateが呼ばれる', () => {
        useAllBonsaiRealtime();
        effectCallback!();

        capturedOnCallback({ new: { user_id: 'user-456' } });

        expect(mockMutate).toHaveBeenCalledWith('all-bonsai');
        expect(mockMutate).toHaveBeenCalledWith(['bonsai', 'user-456']);
    });

    test('unmount時にremoveChannelが呼ばれる', () => {
        useAllBonsaiRealtime();
        const cleanup = effectCallback!() as () => void;

        cleanup();

        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelObj);
    });
});
