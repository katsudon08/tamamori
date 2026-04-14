import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

const mockFetch = jest.fn<typeof global.fetch>();

jest.mock('../../../config', () => ({
    getEnv: () => ({
        SLACK_CLIENT_ID: 'test-client-id',
        SLACK_CLIENT_SECRET: 'test-client-secret',
    }),
}));

beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
});

// --- exchangeOAuthCode ----------------------------------------------------

describe('exchangeOAuthCode', () => {
    const tokenResponse = {
        ok: true,
        access_token: 'xoxp-test-token',
        id_token: 'test-id-token',
    };

    function mockTokenSuccess() {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify(tokenResponse), { status: 200 }),
        );
    }

    test('正しいAPI URL・Content-Type・bodyで送信する', async () => {
        mockTokenSuccess();
        const { exchangeOAuthCode } = await import('../client');

        await exchangeOAuthCode('test-code');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

        expect(url).toBe('https://slack.com/api/openid.connect.token');
        expect(options.method).toBe('POST');
        expect(options.headers).toEqual(
            expect.objectContaining({
                'Content-Type': 'application/x-www-form-urlencoded',
            }),
        );

        const body = new URLSearchParams(options.body as string);
        expect(body.get('code')).toBe('test-code');
        expect(body.get('client_id')).toBe('test-client-id');
        expect(body.get('client_secret')).toBe('test-client-secret');
    });

    test('レスポンスのトークンが正しくパースされる', async () => {
        mockTokenSuccess();
        const { exchangeOAuthCode } = await import('../client');

        const result = await exchangeOAuthCode('test-code');

        expect(result).toEqual({
            accessToken: 'xoxp-test-token',
            idToken: 'test-id-token',
        });
    });

    test('APIエラー時 (ok: false) に例外をthrowする', async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: false, error: 'invalid_code' }), { status: 200 }),
        );
        const { exchangeOAuthCode } = await import('../client');

        await expect(exchangeOAuthCode('bad-code')).rejects.toThrow();
    });

    test('不正なレスポンス（必須フィールド欠損）でZodErrorが発生する', async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
        const { exchangeOAuthCode } = await import('../client');

        await expect(exchangeOAuthCode('test-code')).rejects.toThrow();
    });
});

// --- getUserInfo -----------------------------------------------------------

describe('getUserInfo', () => {
    const userInfoResponse = {
        ok: true,
        sub: 'U12345',
        'https://slack.com/team_id': 'T12345',
        name: 'Test User',
        picture: 'https://example.com/avatar.png',
    };

    function mockUserInfoSuccess() {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify(userInfoResponse), { status: 200 }),
        );
    }

    test('正しいAuthorizationヘッダーで送信する', async () => {
        mockUserInfoSuccess();
        const { getUserInfo } = await import('../client');

        await getUserInfo('xoxp-test-token');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

        expect(url).toBe('https://slack.com/api/openid.connect.userInfo');
        expect(options.method).toBe('GET');
        expect((options.headers as Record<string, string>)['Authorization']).toBe(
            'Bearer xoxp-test-token',
        );
    });

    test('レスポンスからuser情報が正しく抽出される', async () => {
        mockUserInfoSuccess();
        const { getUserInfo } = await import('../client');

        const result = await getUserInfo('xoxp-test-token');

        expect(result).toEqual({
            userId: 'U12345',
            teamId: 'T12345',
            name: 'Test User',
            picture: 'https://example.com/avatar.png',
        });
    });

    test('APIエラー時 (ok: false) に例外をthrowする', async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: false, error: 'token_revoked' }), { status: 200 }),
        );
        const { getUserInfo } = await import('../client');

        await expect(getUserInfo('bad-token')).rejects.toThrow();
    });

    test('不正なレスポンス（必須フィールド欠損）でZodErrorが発生する', async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, sub: 'U12345' }), { status: 200 }),
        );
        const { getUserInfo } = await import('../client');

        await expect(getUserInfo('test-token')).rejects.toThrow();
    });
});
