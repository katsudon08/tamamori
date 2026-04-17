import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

const mockSave = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockDestroy = jest.fn();
let mockSession: Record<string, unknown> = {};

const mockExchangeCodeForToken = jest
    .fn<(code: string, redirectUri: string) => Promise<{ accessToken: string; idToken: string }>>()
    .mockResolvedValue({ accessToken: 'xoxp-token', idToken: 'id-token' });

const mockFetchUserIdentity = jest
    .fn<() => Promise<{ userId: string; teamId: string; name: string; picture: string }>>()
    .mockResolvedValue({
        userId: 'U12345',
        teamId: 'T12345',
        name: 'Test User',
        picture: 'https://example.com/avatar.png',
    });

jest.mock('@/features/slack-auth', () => {
    const actual = jest.requireActual('@/features/slack-auth/lib/slack-oauth-schema') as {
        oauthCallbackParamsSchema: unknown;
    };
    return {
        oauthCallbackParamsSchema: actual.oauthCallbackParamsSchema,
        getSession: jest
            .fn<() => Promise<Record<string, unknown>>>()
            .mockImplementation(() => Promise.resolve(mockSession)),
        exchangeCodeForToken: (...args: unknown[]) =>
            mockExchangeCodeForToken(...(args as [string, string])),
        fetchUserIdentity: (...args: unknown[]) => mockFetchUserIdentity(...(args as [])),
    };
});

const mockUpsertUser = jest
    .fn<(data: unknown) => Promise<Record<string, string>>>()
    .mockResolvedValue({
        id: 'uuid-123',
        slack_user_id: 'U12345',
        slack_team_id: 'T12345',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
    });

jest.mock('@/entities/user', () => ({
    upsertUser: (...args: unknown[]) => mockUpsertUser(...(args as [unknown])),
}));

const mockGetBonsaiByUserId = jest.fn<(userId: unknown) => Promise<Record<string, string>>>();
const mockCreateBonsai = jest
    .fn<(userId: unknown) => Promise<Record<string, string>>>()
    .mockResolvedValue({ id: 'bonsai-uuid' });

jest.mock('@/entities/bonsai', () => ({
    getBonsaiByUserId: (...args: unknown[]) => mockGetBonsaiByUserId(...(args as [unknown])),
    createBonsai: (...args: unknown[]) => mockCreateBonsai(...(args as [unknown])),
}));

// --- helpers -------------------------------------------------------------

function resetSession(overrides: Record<string, unknown> = {}) {
    mockSession = {
        oauthState: 'valid-state',
        save: mockSave,
        destroy: mockDestroy,
        ...overrides,
    };
}

function callbackUrl(params: Record<string, string> = {}) {
    const defaults = { code: 'test-code', state: 'valid-state' };
    const searchParams = new URLSearchParams({ ...defaults, ...params });
    return `http://localhost:3000/api/auth/slack/callback?${searchParams.toString()}`;
}

// --- tests ---------------------------------------------------------------

describe('GET /api/auth/slack/callback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetSession();
        mockGetBonsaiByUserId.mockResolvedValue({ id: 'existing-bonsai' });
    });

    test('正常フロー: セッション設定 + /gardenリダイレクト', async () => {
        const { GET } = await import('../route');

        const response = await GET(new Request(callbackUrl()));

        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('http://localhost:3000/garden');

        // セッションにユーザー情報がセットされている
        expect(mockSession.userId).toBe('uuid-123');
        expect(mockSession.slackUserId).toBe('U12345');
        expect(mockSession.displayName).toBe('Test User');
        expect(mockSession.avatarUrl).toBe('https://example.com/avatar.png');
        expect(mockSession.oauthState).toBeUndefined();
        expect(mockSave).toHaveBeenCalled();
    });

    test('正常フロー: exchangeCodeForTokenにcodeとredirect_uriが渡される', async () => {
        const { GET } = await import('../route');

        await GET(new Request(callbackUrl()));

        expect(mockExchangeCodeForToken).toHaveBeenCalledWith(
            'test-code',
            'http://localhost:3000/api/auth/slack/callback',
        );
    });

    test('正常フロー: upsertUserに正しい引数が渡される', async () => {
        const { GET } = await import('../route');

        await GET(new Request(callbackUrl()));

        expect(mockUpsertUser).toHaveBeenCalledWith({
            slack_user_id: 'U12345',
            slack_team_id: 'T12345',
            display_name: 'Test User',
            avatar_url: 'https://example.com/avatar.png',
        });
    });

    test('bonsai未存在時にcreateBonsaiが呼ばれる', async () => {
        mockGetBonsaiByUserId.mockRejectedValueOnce(new Error('not found'));
        const { GET } = await import('../route');

        await GET(new Request(callbackUrl()));

        expect(mockCreateBonsai).toHaveBeenCalledWith('uuid-123');
    });

    test('bonsai既存時にcreateBonsaiが呼ばれない', async () => {
        mockGetBonsaiByUserId.mockResolvedValueOnce({ id: 'existing-bonsai' });
        const { GET } = await import('../route');

        await GET(new Request(callbackUrl()));

        expect(mockCreateBonsai).not.toHaveBeenCalled();
    });

    test('不正なクエリパラメータで /?error=auth_failed リダイレクト', async () => {
        const { GET } = await import('../route');
        const url = 'http://localhost:3000/api/auth/slack/callback?invalid=param';

        const response = await GET(new Request(url));

        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('http://localhost:3000/?error=auth_failed');
    });

    test('state不一致で /?error=auth_failed リダイレクト', async () => {
        const { GET } = await import('../route');

        const response = await GET(new Request(callbackUrl({ state: 'wrong-state' })));

        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('http://localhost:3000/?error=auth_failed');
    });

    test('ユーザー情報取得失敗で /?error=auth_failed リダイレクト', async () => {
        mockFetchUserIdentity.mockRejectedValueOnce(new Error('userinfo failed'));
        const { GET } = await import('../route');

        const response = await GET(new Request(callbackUrl()));

        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('http://localhost:3000/?error=auth_failed');
    });

    test('ユーザーupsert失敗で /?error=auth_failed リダイレクト', async () => {
        mockUpsertUser.mockRejectedValueOnce(new Error('db error'));
        const { GET } = await import('../route');

        const response = await GET(new Request(callbackUrl()));

        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('http://localhost:3000/?error=auth_failed');
    });

    test('トークン交換失敗で /?error=auth_failed リダイレクト', async () => {
        mockExchangeCodeForToken.mockRejectedValueOnce(new Error('exchange failed'));
        const { GET } = await import('../route');

        const response = await GET(new Request(callbackUrl()));

        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('http://localhost:3000/?error=auth_failed');
    });
});
