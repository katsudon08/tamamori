import { sealData } from 'iron-session';
import type { BrowserContext } from '@playwright/test';

interface SessionOverrides {
    userId?: string;
    slackUserId?: string;
    displayName?: string;
    avatarUrl?: string;
}

/**
 * E2E テスト用の認証セッションクッキーを生成する。
 * iron-session の sealData で暗号化し、開発サーバーと同じ SESSION_SECRET を使用。
 */
export async function createSessionCookie(overrides?: SessionOverrides) {
    const sessionData = {
        userId: 'a0000000-0000-4000-a000-000000000001',
        slackUserId: 'U_E2E_TEST',
        displayName: 'E2E Test User',
        avatarUrl: '',
        ...overrides,
    };

    const sealed = await sealData(sessionData, {
        password: process.env.SESSION_SECRET!,
        ttl: 60 * 60 * 24 * 7,
    });

    return {
        name: 'tamamori_session',
        value: sealed,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax' as const,
    };
}

/** ブラウザコンテキストに認証クッキーを追加する */
export async function addAuthCookies(context: BrowserContext, overrides?: SessionOverrides) {
    const cookie = await createSessionCookie(overrides);
    await context.addCookies([cookie]);
}
