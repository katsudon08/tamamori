import { NextResponse } from 'next/server';
import { getSession, isAuthenticated } from '@/features/slack-auth';

const SECURITY_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Cookie',
} as const;

/**
 * GET /api/auth/me
 *
 * iron-session から認証済みユーザーの最小プロフィールを返す。
 * apps/web(SPA) が起動時に認証状態を hydrate するための暫定エンドポイント。
 * #94 で apps/api(Hono) の正式エンドポイントへ移設する。
 *
 * - 認証済み: 200 `{ userId, slackUserId, slackTeamId, displayName, avatarUrl }`
 * - 未認証 / セッション復号失敗: 401 `{ reason: 'unauthenticated' }`
 */
export async function GET() {
    let session;
    try {
        session = await getSession();
    } catch (err) {
        const safeMessage = err instanceof Error ? `${err.name}: ${err.message}` : 'unknown';
        console.warn('[auth/me] getSession failed:', safeMessage);
        return NextResponse.json(
            { reason: 'unauthenticated' },
            { status: 401, headers: SECURITY_HEADERS },
        );
    }

    if (!isAuthenticated(session)) {
        return NextResponse.json(
            { reason: 'unauthenticated' },
            { status: 401, headers: SECURITY_HEADERS },
        );
    }

    return NextResponse.json(
        {
            userId: session.userId,
            slackUserId: session.slackUserId,
            slackTeamId: session.slackTeamId,
            displayName: session.displayName,
            avatarUrl: session.avatarUrl,
        },
        { status: 200, headers: SECURITY_HEADERS },
    );
}
