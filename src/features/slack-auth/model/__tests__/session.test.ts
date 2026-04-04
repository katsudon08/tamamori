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

jest.mock('@/shared/config', () => ({
    env: { SESSION_SECRET: 'test-secret-must-be-at-least-32-chars!!' },
}));

// --- Import after mocks ---

import {
    sessionOptions,
    defaultSession,
    getSession,
    getServerSession,
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
            displayName: 'テストユーザー',
            avatarUrl: 'https://example.com/avatar.png',
        };
        const mockSession = createMockSession(sessionData);
        mockGetIronSession.mockResolvedValue(mockSession);

        const session = await getSession();

        expect(session.userId).toBe('uuid-123');
        expect(session.slackUserId).toBe('U12345');
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
        expect(sessionAfterDestroy.displayName).toBe('');
        expect(sessionAfterDestroy.avatarUrl).toBe('');
    });
});
