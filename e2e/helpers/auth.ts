import { sealData } from 'iron-session';
import type { BrowserContext } from '@playwright/test';

import { getEnv } from '@/shared/config';

interface SessionOverrides {
    userId?: string;
    slackUserId?: string;
    slackTeamId?: string;
    displayName?: string;
    avatarUrl?: string;
}

const TEST_BASE_URL_FALLBACK = 'http://localhost:3000';

function getBaseURL(): string {
    return process.env.PLAYWRIGHT_BASE_URL || TEST_BASE_URL_FALLBACK;
}

/**
 * E2E テスト用の認証セッションクッキーを生成する。
 * iron-session の sealData で暗号化し、開発サーバーと同じ SESSION_SECRET を使う。
 *
 * cookie の対象 URL は `PLAYWRIGHT_BASE_URL` (ngrok 経由テスト用) を優先し、
 * 未指定なら `localhost:3000` にフォールバックする。playwright 側で url から
 * domain を導出するため、ngrok のような任意ホストでも cookie が有効になる。
 */
export async function createSessionCookie(overrides?: SessionOverrides) {
    const sessionData = {
        userId: 'a0000000-0000-4000-a000-000000000001',
        slackUserId: 'U_E2E_TEST',
        slackTeamId: 'T_E2E_TEST',
        displayName: 'E2E Test User',
        avatarUrl: '',
        ...overrides,
    };

    const sealed = await sealData(sessionData, {
        password: getEnv().SESSION_SECRET,
        ttl: 60 * 60 * 24 * 7,
    });

    return {
        name: 'tamamori_session',
        value: sealed,
        url: getBaseURL(),
        httpOnly: true,
        sameSite: 'Lax' as const,
    };
}

/** ブラウザコンテキストに認証クッキーを追加する */
export async function addAuthCookies(context: BrowserContext, overrides?: SessionOverrides) {
    const cookie = await createSessionCookie(overrides);
    await context.addCookies([cookie]);
}
