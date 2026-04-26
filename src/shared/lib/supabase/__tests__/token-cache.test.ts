import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

const mockFetch = jest.fn<typeof fetch>();

beforeEach(() => {
    jest.resetModules();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
    jest.useRealTimers();
});

// --- helpers -------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

/** 現在時刻 (epoch 秒) を返すモック。`Date.now()` を fake timers で固定する */
function setNow(epochSeconds: number) {
    jest.useFakeTimers().setSystemTime(epochSeconds * 1000);
}

// --- getSessionToken -----------------------------------------------------

describe('getSessionToken', () => {
    test('初回呼び出しで /api/auth/session-token を fetch しトークンを返す', async () => {
        setNow(1000);
        mockFetch.mockResolvedValueOnce(
            jsonResponse({ token: 'jwt-A', expiresAt: 1000 + 3600 }),
        );

        const { getSessionToken } = await import('../token-cache');
        const token = await getSessionToken();

        expect(token).toBe('jwt-A');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, init] = mockFetch.mock.calls[0]!;
        expect(url).toBe('/api/auth/session-token');
        expect((init as RequestInit).credentials).toBe('same-origin');
    });

    test('期限内 (残り > 60 秒) のキャッシュは fetch せずに返す', async () => {
        setNow(1000);
        mockFetch.mockResolvedValueOnce(
            jsonResponse({ token: 'jwt-A', expiresAt: 1000 + 3600 }),
        );

        const { getSessionToken } = await import('../token-cache');
        await getSessionToken();
        // 30 分後 (残り 1800 秒) にもう一度
        setNow(1000 + 1800);
        const second = await getSessionToken();

        expect(second).toBe('jwt-A');
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('60 秒バッファ以内に近づいたら再 fetch する', async () => {
        setNow(1000);
        mockFetch
            .mockResolvedValueOnce(jsonResponse({ token: 'jwt-A', expiresAt: 1000 + 3600 }))
            .mockResolvedValueOnce(jsonResponse({ token: 'jwt-B', expiresAt: 1000 + 7200 }));

        const { getSessionToken } = await import('../token-cache');
        await getSessionToken();

        // exp - now = 60 ちょうどになる時刻 (バッファ内)
        setNow(1000 + 3600 - 60);
        const refetched = await getSessionToken();

        expect(refetched).toBe('jwt-B');
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('並列呼び出しは 1 本の fetch にまとまる (inflight 抑止)', async () => {
        setNow(1000);
        let resolveFetch: ((value: Response) => void) | null = null;
        mockFetch.mockImplementationOnce(
            () =>
                new Promise<Response>((resolve) => {
                    resolveFetch = resolve;
                }),
        );

        const { getSessionToken } = await import('../token-cache');
        const a = getSessionToken();
        const b = getSessionToken();
        const c = getSessionToken();

        resolveFetch!(jsonResponse({ token: 'jwt-A', expiresAt: 1000 + 3600 }));
        const results = await Promise.all([a, b, c]);

        expect(results).toEqual(['jwt-A', 'jwt-A', 'jwt-A']);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('401 が返ったらキャッシュをクリアして session_expired を throw', async () => {
        setNow(1000);
        mockFetch.mockResolvedValueOnce(jsonResponse({ token: null, reason: 'unauthenticated' }, 401));

        const { getSessionToken } = await import('../token-cache');
        await expect(getSessionToken()).rejects.toThrow('session_expired');

        // 直後の呼び出しでも再度 fetch される (キャッシュされていない)
        mockFetch.mockResolvedValueOnce(
            jsonResponse({ token: 'jwt-recovered', expiresAt: 1000 + 3600 }),
        );
        const recovered = await getSessionToken();
        expect(recovered).toBe('jwt-recovered');
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('5xx 等の他エラーも throw する (キャッシュは更新しない)', async () => {
        setNow(1000);
        mockFetch.mockResolvedValueOnce(
            jsonResponse({ token: null, reason: 'server_error' }, 500),
        );

        const { getSessionToken } = await import('../token-cache');
        await expect(getSessionToken()).rejects.toThrow();
    });
});

// --- clearSessionToken ---------------------------------------------------

describe('clearSessionToken', () => {
    test('呼び出すと次の getSessionToken で必ず再 fetch する', async () => {
        setNow(1000);
        mockFetch
            .mockResolvedValueOnce(jsonResponse({ token: 'jwt-A', expiresAt: 1000 + 3600 }))
            .mockResolvedValueOnce(jsonResponse({ token: 'jwt-B', expiresAt: 1000 + 7200 }));

        const { getSessionToken, clearSessionToken } = await import('../token-cache');
        const first = await getSessionToken();
        clearSessionToken();
        const second = await getSessionToken();

        expect(first).toBe('jwt-A');
        expect(second).toBe('jwt-B');
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});

// --- onTokenRefresh ------------------------------------------------------

describe('onTokenRefresh', () => {
    test('新しいトークンが取得されるたびに callback が呼ばれる', async () => {
        setNow(1000);
        mockFetch
            .mockResolvedValueOnce(jsonResponse({ token: 'jwt-A', expiresAt: 1000 + 3600 }))
            .mockResolvedValueOnce(jsonResponse({ token: 'jwt-B', expiresAt: 1000 + 7200 }));

        const { getSessionToken, onTokenRefresh, clearSessionToken } = await import(
            '../token-cache'
        );
        const cb = jest.fn<(token: string) => void>();
        onTokenRefresh(cb);

        await getSessionToken();
        clearSessionToken();
        await getSessionToken();

        expect(cb).toHaveBeenCalledTimes(2);
        expect(cb).toHaveBeenNthCalledWith(1, 'jwt-A');
        expect(cb).toHaveBeenNthCalledWith(2, 'jwt-B');
    });

    test('返された unsubscribe を呼ぶと以降 callback されない', async () => {
        setNow(1000);
        mockFetch
            .mockResolvedValueOnce(jsonResponse({ token: 'jwt-A', expiresAt: 1000 + 3600 }))
            .mockResolvedValueOnce(jsonResponse({ token: 'jwt-B', expiresAt: 1000 + 7200 }));

        const { getSessionToken, onTokenRefresh, clearSessionToken } = await import(
            '../token-cache'
        );
        const cb = jest.fn<(token: string) => void>();
        const unsubscribe = onTokenRefresh(cb);

        await getSessionToken();
        unsubscribe();
        clearSessionToken();
        await getSessionToken();

        expect(cb).toHaveBeenCalledTimes(1);
    });

    test('401 で fetch 失敗した場合は callback されない', async () => {
        setNow(1000);
        mockFetch.mockResolvedValueOnce(jsonResponse({ token: null, reason: 'unauthenticated' }, 401));

        const { getSessionToken, onTokenRefresh } = await import('../token-cache');
        const cb = jest.fn<(token: string) => void>();
        onTokenRefresh(cb);

        await expect(getSessionToken()).rejects.toThrow();
        expect(cb).not.toHaveBeenCalled();
    });
});
