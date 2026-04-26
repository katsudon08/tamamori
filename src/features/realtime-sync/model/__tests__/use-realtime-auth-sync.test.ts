import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// useEffect モック — コールバックとクリーンアップをキャプチャ
let effectCallback: (() => (() => void) | void) | null = null;
jest.mock('react', () => ({
    useEffect: jest.fn((cb: () => (() => void) | void) => {
        effectCallback = cb;
    }),
}));

// token-cache の onTokenRefresh をモック化し、登録された callback を制御する
let registeredCallback: ((token: string) => void) | null = null;
const mockUnsubscribe = jest.fn();
const mockOnTokenRefresh = jest.fn((cb: (token: string) => void) => {
    registeredCallback = cb;
    return mockUnsubscribe;
});

jest.mock('@/shared/lib/supabase', () => ({
    onTokenRefresh: (cb: (token: string) => void) => mockOnTokenRefresh(cb),
}));

import { useRealtimeAuthSync } from '../use-realtime-auth-sync';

describe('useRealtimeAuthSync', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        effectCallback = null;
        registeredCallback = null;
    });

    test('onTokenRefresh が登録され、新トークンで supabase.realtime.setAuth が呼ばれる', () => {
        const mockSetAuth = jest.fn();
        const supabase = { realtime: { setAuth: mockSetAuth } } as unknown as {
            realtime: { setAuth: jest.Mock };
        };

        useRealtimeAuthSync(supabase as unknown as Parameters<typeof useRealtimeAuthSync>[0]);
        effectCallback!();

        expect(mockOnTokenRefresh).toHaveBeenCalledTimes(1);
        // token-cache 側で再取得が起きたことをシミュレート
        registeredCallback!('jwt-B');

        expect(mockSetAuth).toHaveBeenCalledWith('jwt-B');
    });

    test('unmount で onTokenRefresh の購読解除 (unsubscribe) が呼ばれる', () => {
        const mockSetAuth = jest.fn();
        const supabase = { realtime: { setAuth: mockSetAuth } } as unknown as {
            realtime: { setAuth: jest.Mock };
        };

        useRealtimeAuthSync(supabase as unknown as Parameters<typeof useRealtimeAuthSync>[0]);
        const cleanup = effectCallback!() as () => void;

        cleanup();

        expect(mockUnsubscribe).toHaveBeenCalled();
    });
});
