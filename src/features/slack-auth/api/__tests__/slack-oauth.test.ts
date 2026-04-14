import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

jest.mock('@/shared/config', () => ({
    getEnv: () => ({
        SLACK_CLIENT_ID: 'test-client-id',
        SLACK_CLIENT_SECRET: 'test-client-secret',
    }),
}));

const mockExchangeOAuthCode = jest
    .fn<(code: string) => Promise<{ accessToken: string; idToken: string }>>()
    .mockResolvedValue({ accessToken: 'xoxp-token', idToken: 'id-token' });

const mockGetUserInfo = jest
    .fn<
        (
            token: string,
        ) => Promise<{ userId: string; teamId: string; name: string; picture: string }>
    >()
    .mockResolvedValue({
        userId: 'U12345',
        teamId: 'T12345',
        name: 'Test User',
        picture: 'https://example.com/avatar.png',
    });

jest.mock('@/shared/lib/slack', () => ({
    exchangeOAuthCode: (...args: unknown[]) => mockExchangeOAuthCode(...(args as [string])),
    getUserInfo: (...args: unknown[]) => mockGetUserInfo(...(args as [string])),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

// --- buildAuthorizationUrl ------------------------------------------------

describe('buildAuthorizationUrl', () => {
    test('正しいベースURLで認可URLを構築する', async () => {
        const { buildAuthorizationUrl } = await import('../slack-oauth');

        const url = buildAuthorizationUrl('test-state', 'https://example.com');
        const parsed = new URL(url);

        expect(parsed.origin + parsed.pathname).toBe('https://slack.com/openid/connect/authorize');
    });

    test('必要なクエリパラメータがすべて含まれる', async () => {
        const { buildAuthorizationUrl } = await import('../slack-oauth');

        const url = buildAuthorizationUrl('test-state', 'https://example.com');
        const params = new URL(url).searchParams;

        expect(params.get('client_id')).toBe('test-client-id');
        expect(params.get('scope')).toBe('openid,profile');
        expect(params.get('redirect_uri')).toBe('https://example.com/api/auth/slack/callback');
        expect(params.get('response_type')).toBe('code');
        expect(params.get('state')).toBe('test-state');
    });

    test('originがredirect_uriに反映される', async () => {
        const { buildAuthorizationUrl } = await import('../slack-oauth');

        const url = buildAuthorizationUrl('s', 'http://localhost:3000');
        const params = new URL(url).searchParams;

        expect(params.get('redirect_uri')).toBe('http://localhost:3000/api/auth/slack/callback');
    });
});

// --- exchangeCodeForToken -------------------------------------------------

describe('exchangeCodeForToken', () => {
    test('shared層のexchangeOAuthCodeに委譲する', async () => {
        const { exchangeCodeForToken } = await import('../slack-oauth');

        const result = await exchangeCodeForToken('test-code');

        expect(mockExchangeOAuthCode).toHaveBeenCalledWith('test-code');
        expect(result).toEqual({ accessToken: 'xoxp-token', idToken: 'id-token' });
    });
});

// --- fetchUserIdentity ----------------------------------------------------

describe('fetchUserIdentity', () => {
    test('shared層のgetUserInfoに委譲する', async () => {
        const { fetchUserIdentity } = await import('../slack-oauth');

        const result = await fetchUserIdentity('xoxp-token');

        expect(mockGetUserInfo).toHaveBeenCalledWith('xoxp-token');
        expect(result).toEqual({
            userId: 'U12345',
            teamId: 'T12345',
            name: 'Test User',
            picture: 'https://example.com/avatar.png',
        });
    });
});
