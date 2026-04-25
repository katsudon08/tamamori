import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

type Session = {
    userId: string;
    slackUserId: string;
    slackTeamId: string;
    displayName: string;
    avatarUrl: string;
};

const mockGetSession = jest.fn<() => Promise<Session>>();
const mockIsAuthenticated = jest.fn((s: Session) =>
    s.userId !== '' && s.slackTeamId !== '',
);
const mockIssueSupabaseJwt = jest.fn<
    (input: { userId: string; slackTeamId: string; slackUserId: string }) => Promise<{
        token: string;
        expiresAt: number;
    }>
>();

jest.mock('@/features/slack-auth', () => ({
    getSession: () => mockGetSession(),
    isAuthenticated: (s: Session) => mockIsAuthenticated(s),
    issueSupabaseJwt: (input: unknown) => mockIssueSupabaseJwt(input as never),
}));

const FROZEN_NOW = 1745305200; // 2025-04-22 00:20:00 UTC 相当
const FROZEN_EXP = FROZEN_NOW + 3600;

const authedSession: Session = {
    userId: '00000000-0000-4000-a000-000000000001',
    slackUserId: 'U_USER_A',
    slackTeamId: 'T_TEAM_A',
    displayName: 'POC User A',
    avatarUrl: '',
};

const anonSession: Session = {
    userId: '',
    slackUserId: '',
    slackTeamId: '',
    displayName: '',
    avatarUrl: '',
};

beforeEach(() => {
    jest.clearAllMocks();
    mockIssueSupabaseJwt.mockResolvedValue({ token: 'signed.jwt.token', expiresAt: FROZEN_EXP });
});

// --- tests ---------------------------------------------------------------

describe('GET /api/auth/session-token', () => {
    test('認証済みなら 200 で { token, expiresAt } を返す', async () => {
        mockGetSession.mockResolvedValueOnce(authedSession);
        const { GET } = await import('../route');

        const response = await GET();
        const body = (await response.json()) as { token: string; expiresAt: number };

        expect(response.status).toBe(200);
        expect(body.token).toBe('signed.jwt.token');
        expect(body.expiresAt).toBe(FROZEN_EXP);
    });

    test('issueSupabaseJwt は session 由来の userId / slackTeamId / slackUserId で呼ばれる', async () => {
        mockGetSession.mockResolvedValueOnce(authedSession);
        const { GET } = await import('../route');

        await GET();

        expect(mockIssueSupabaseJwt).toHaveBeenCalledWith({
            userId: authedSession.userId,
            slackTeamId: authedSession.slackTeamId,
            slackUserId: authedSession.slackUserId,
        });
    });

    test('未認証 (userId 空) なら 401 + { token: null, reason: "unauthenticated" }', async () => {
        mockGetSession.mockResolvedValueOnce(anonSession);
        const { GET } = await import('../route');

        const response = await GET();
        const body = (await response.json()) as { token: null; reason: string };

        expect(response.status).toBe(401);
        expect(body.token).toBeNull();
        expect(body.reason).toBe('unauthenticated');
        expect(mockIssueSupabaseJwt).not.toHaveBeenCalled();
    });

    test('Cache-Control / X-Content-Type-Options / Vary ヘッダが付く', async () => {
        mockGetSession.mockResolvedValueOnce(authedSession);
        const { GET } = await import('../route');

        const response = await GET();

        expect(response.headers.get('Cache-Control')).toBe('private, no-store');
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(response.headers.get('Vary')).toBe('Cookie');
    });

    test('401 レスポンスにも Cache-Control が付く', async () => {
        mockGetSession.mockResolvedValueOnce(anonSession);
        const { GET } = await import('../route');

        const response = await GET();

        expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    });

    test('issueSupabaseJwt が throw した場合は 500 + { token: null, reason: "server_error" }', async () => {
        mockGetSession.mockResolvedValueOnce(authedSession);
        mockIssueSupabaseJwt.mockRejectedValueOnce(new Error('signing failed'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { GET } = await import('../route');

        const response = await GET();
        const body = (await response.json()) as { token: null; reason: string };

        expect(response.status).toBe(500);
        expect(body.token).toBeNull();
        expect(body.reason).toBe('server_error');
        errorSpy.mockRestore();
    });

    test('getSession が throw した場合 (cookie 改ざん等) は 401 にフォールバック', async () => {
        mockGetSession.mockRejectedValueOnce(new Error('decrypt failed'));
        const { GET } = await import('../route');

        const response = await GET();

        expect(response.status).toBe(401);
        expect(mockIssueSupabaseJwt).not.toHaveBeenCalled();
    });
});
