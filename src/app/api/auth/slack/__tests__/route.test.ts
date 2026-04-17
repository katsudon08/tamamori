import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

const mockSave = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockSession: Record<string, unknown> = {};

jest.mock('@/features/slack-auth', () => ({
    getSession: jest.fn<() => Promise<typeof mockSession>>().mockResolvedValue(mockSession),
    buildAuthorizationUrl: jest
        .fn<(state: string, origin: string) => string>()
        .mockReturnValue('https://slack.com/openid/connect/authorize?test=1'),
}));

beforeEach(() => {
    jest.clearAllMocks();
    // Reset mockSession
    for (const key of Object.keys(mockSession)) {
        delete mockSession[key];
    }
    mockSession.save = mockSave;
});

// --- tests ---------------------------------------------------------------

describe('GET /api/auth/slack', () => {
    test('セッションにoauthStateが保存される', async () => {
        const { GET } = await import('../route');

        const request = new Request('http://localhost:3000/api/auth/slack');
        await GET(request);

        expect(mockSession.oauthState).toBeDefined();
        expect(typeof mockSession.oauthState).toBe('string');
        expect(mockSave).toHaveBeenCalled();
    });

    test('Slack認可URLへの302リダイレクトが返される', async () => {
        const { GET } = await import('../route');

        const request = new Request('http://localhost:3000/api/auth/slack');
        const response = await GET(request);

        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe(
            'https://slack.com/openid/connect/authorize?test=1',
        );
    });

    test('buildAuthorizationUrlにstateとoriginが渡される', async () => {
        const { buildAuthorizationUrl } = await import('@/features/slack-auth');
        const { GET } = await import('../route');

        const request = new Request('http://localhost:3000/api/auth/slack');
        await GET(request);

        expect(buildAuthorizationUrl).toHaveBeenCalledWith(
            mockSession.oauthState as string,
            'http://localhost:3000',
        );
    });

    test('x-forwarded-host があれば proxy 経由の origin を使う', async () => {
        const { buildAuthorizationUrl } = await import('@/features/slack-auth');
        const { GET } = await import('../route');

        const request = new Request('http://localhost:3000/api/auth/slack', {
            headers: {
                'x-forwarded-host': 'example.ngrok-free.dev',
                'x-forwarded-proto': 'https',
            },
        });
        await GET(request);

        expect(buildAuthorizationUrl).toHaveBeenCalledWith(
            mockSession.oauthState as string,
            'https://example.ngrok-free.dev',
        );
    });
});
