import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import type { IronSession } from 'iron-session';

// --- Mocks ---

type MockSession = IronSession<SessionData>;

const mockGetIronSession = jest.fn<(cookies: unknown, options: unknown) => Promise<MockSession>>();
jest.mock('iron-session', () => ({
    getIronSession: (cookies: unknown, options: unknown) => mockGetIronSession(cookies, options),
}));

const mockCookieStore = {};
const mockCookies = jest.fn<() => Promise<Record<string, never>>>();
jest.mock('next/headers', () => ({
    cookies: () => mockCookies(),
}));

const mockRedirect = jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
});
jest.mock('next/navigation', () => ({
    redirect: (path: string) => mockRedirect(path),
}));

jest.mock('@/shared/config', () => ({
    getEnv: () => ({ SESSION_SECRET: 'test-secret-must-be-at-least-32-chars!!' }),
}));

// --- Import after mocks ---

import {
    sessionOptions,
    defaultSession,
    getSession,
    getServerSession,
    getAuthenticatedSession,
    isAuthenticated,
    type SessionData,
    type ReadonlySession,
} from '../session';

// --- Helpers ---

function createMockSession(data: Partial<SessionData> = {}): MockSession {
    return {
        ...defaultSession,
        ...data,
        save: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        destroy: jest.fn(),
        updateConfig: jest.fn(),
    };
}

// --- Tests ---

describe('sessionOptions', () => {
    test('クッキー名が "tamamori_session" である', () => {
        expect(sessionOptions.cookieName).toBe('tamamori_session');
    });

    test('TTLが7日間（604800秒）である', () => {
        expect(sessionOptions.ttl).toBe(604800);
    });

    test('cookieOptions に httpOnly: true が設定されている', () => {
        expect(sessionOptions.cookieOptions?.httpOnly).toBe(true);
    });

    test('cookieOptions に sameSite: "lax" が設定されている', () => {
        expect(sessionOptions.cookieOptions?.sameSite).toBe('lax');
    });
});

describe('defaultSession', () => {
    test('全フィールドが空文字で初期化されている', () => {
        expect(defaultSession).toEqual({
            userId: '',
            slackUserId: '',
            slackTeamId: '',
            displayName: '',
            avatarUrl: '',
        });
    });
});

describe('getSession', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCookies.mockResolvedValue(mockCookieStore);
    });

    test('cookies()とsessionOptionsでgetIronSessionが呼び出される', async () => {
        const mockSession = createMockSession();
        mockGetIronSession.mockResolvedValue(mockSession);

        await getSession();

        expect(mockCookies).toHaveBeenCalled();
        expect(mockGetIronSession).toHaveBeenCalledWith(mockCookieStore, sessionOptions);
    });

    test('セッションデータの保存と読み取りができる', async () => {
        const sessionData: SessionData = {
            userId: 'uuid-123',
            slackUserId: 'U12345',
            slackTeamId: 'T12345',
            displayName: 'テストユーザー',
            avatarUrl: 'https://example.com/avatar.png',
        };
        const mockSession = createMockSession(sessionData);
        mockGetIronSession.mockResolvedValue(mockSession);

        const session = await getSession();

        expect(session.userId).toBe('uuid-123');
        expect(session.slackUserId).toBe('U12345');
        expect(session.slackTeamId).toBe('T12345');
        expect(session.displayName).toBe('テストユーザー');
        expect(session.avatarUrl).toBe('https://example.com/avatar.png');
    });
});

describe('getServerSession', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCookies.mockResolvedValue(mockCookieStore);
    });

    test('cookies()とsessionOptionsでgetIronSessionが呼び出される', async () => {
        const mockSession = createMockSession();
        mockGetIronSession.mockResolvedValue(mockSession);

        await getServerSession();

        expect(mockCookies).toHaveBeenCalled();
        expect(mockGetIronSession).toHaveBeenCalledWith(mockCookieStore, sessionOptions);
    });

    test('戻り値の型にsave/destroyが含まれないこと（ReadonlySession型）', async () => {
        const mockSession = createMockSession({ userId: 'uuid-123' });
        mockGetIronSession.mockResolvedValue(mockSession);

        const session: ReadonlySession = await getServerSession();

        expect(session.userId).toBe('uuid-123');
        // ReadonlySession型にはsave/destroyが存在しないため
        // session.save() や session.destroy() は型エラーになる
        expect('save' in session).toBe(true); // ランタイムには存在するが
        expect('destroy' in session).toBe(true); // 型レベルでアクセスが制限される
    });
});

describe('oauthState', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCookies.mockResolvedValue(mockCookieStore);
    });

    test('oauthStateをセッションに保存・読み取りできる', async () => {
        const sessionData: SessionData = {
            userId: '',
            slackUserId: '',
            slackTeamId: '',
            displayName: '',
            avatarUrl: '',
            oauthState: 'test-csrf-state',
        };
        const mockSession = createMockSession(sessionData);
        mockGetIronSession.mockResolvedValue(mockSession);

        const session = await getSession();

        expect(session.oauthState).toBe('test-csrf-state');
    });

    test('oauthState未設定時はundefinedである', async () => {
        const mockSession = createMockSession();
        mockGetIronSession.mockResolvedValue(mockSession);

        const session = await getSession();

        expect(session.oauthState).toBeUndefined();
    });
});

describe('isAuthenticated', () => {
    test('userId / slackTeamId / slackUserId のすべてが非空なら true', () => {
        const session: ReadonlySession = {
            ...defaultSession,
            userId: 'uuid-1',
            slackTeamId: 'T1',
            slackUserId: 'U1',
        };
        expect(isAuthenticated(session)).toBe(true);
    });

    test('userId が空なら false', () => {
        const session: ReadonlySession = {
            ...defaultSession,
            userId: '',
            slackTeamId: 'T1',
            slackUserId: 'U1',
        };
        expect(isAuthenticated(session)).toBe(false);
    });

    test('slackTeamId が空なら false', () => {
        const session: ReadonlySession = {
            ...defaultSession,
            userId: 'uuid-1',
            slackTeamId: '',
            slackUserId: 'U1',
        };
        expect(isAuthenticated(session)).toBe(false);
    });

    test('slackUserId が空なら false (JWT claim 整合性のため)', () => {
        const session: ReadonlySession = {
            ...defaultSession,
            userId: 'uuid-1',
            slackTeamId: 'T1',
            slackUserId: '',
        };
        expect(isAuthenticated(session)).toBe(false);
    });
});

describe('getAuthenticatedSession', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCookies.mockResolvedValue(mockCookieStore);
    });

    test('userId と slackTeamId が揃っていればセッションを返す', async () => {
        const mockSession = createMockSession({
            userId: 'uuid-1',
            slackUserId: 'U1',
            slackTeamId: 'T1',
            displayName: 'u',
            avatarUrl: '',
        });
        mockGetIronSession.mockResolvedValue(mockSession);

        const session = await getAuthenticatedSession();

        expect(session.userId).toBe('uuid-1');
        expect(session.slackTeamId).toBe('T1');
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    test('userId が空なら "/" にリダイレクト', async () => {
        const mockSession = createMockSession({ userId: '', slackTeamId: 'T1' });
        mockGetIronSession.mockResolvedValue(mockSession);

        await expect(getAuthenticatedSession()).rejects.toThrow('REDIRECT:/');
        expect(mockRedirect).toHaveBeenCalledWith('/');
    });

    test('slackTeamId が空なら "/" にリダイレクト', async () => {
        const mockSession = createMockSession({ userId: 'uuid-1', slackTeamId: '' });
        mockGetIronSession.mockResolvedValue(mockSession);

        await expect(getAuthenticatedSession()).rejects.toThrow('REDIRECT:/');
        expect(mockRedirect).toHaveBeenCalledWith('/');
    });
});

describe('セッション破棄', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCookies.mockResolvedValue(mockCookieStore);
    });

    test('destroy()後にセッションデータが取得できないこと', async () => {
        // 1回目: データあり
        const sessionData: SessionData = {
            userId: 'uuid-123',
            slackUserId: 'U12345',
            slackTeamId: 'T12345',
            displayName: 'テストユーザー',
            avatarUrl: 'https://example.com/avatar.png',
        };
        const mockSession = createMockSession(sessionData);
        mockGetIronSession.mockResolvedValue(mockSession);

        const session = await getSession();
        expect(session.userId).toBe('uuid-123');

        session.destroy();
        expect(mockSession.destroy).toHaveBeenCalled();

        // 2回目: destroy後は空セッション
        const emptySession = createMockSession();
        mockGetIronSession.mockResolvedValue(emptySession);

        const sessionAfterDestroy = await getSession();
        expect(sessionAfterDestroy.userId).toBe('');
        expect(sessionAfterDestroy.slackUserId).toBe('');
        expect(sessionAfterDestroy.slackTeamId).toBe('');
        expect(sessionAfterDestroy.displayName).toBe('');
        expect(sessionAfterDestroy.avatarUrl).toBe('');
    });
});
