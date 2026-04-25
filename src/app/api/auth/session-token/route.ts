import { NextResponse } from 'next/server';
import { getSession, isAuthenticated, issueSupabaseJwt } from '@/features/slack-auth';

const SECURITY_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Cookie',
} as const;

/**
 * GET /api/auth/session-token
 *
 * iron-session を Root of Trust とし、認証済みなら Supabase RLS 用 JWT を都度ミントして返す。
 * cookie には載せず、ブラウザはメモリキャッシュ (token-cache) でのみ保持する。
 *
 * - 認証済み: 200 `{ token, expiresAt }`
 * - 未認証 / セッション復号失敗: 401 `{ token: null, reason: 'unauthenticated' }`
 * - 発行失敗 (鍵未設定など): 500 `{ token: null, reason: 'server_error' }`
 *
 * いずれの場合も `Cache-Control: private, no-store` を付与し中間 proxy / ブラウザキャッシュへの保存を防ぐ。
 */
export async function GET() {
    let session;
    try {
        session = await getSession();
    } catch {
        return NextResponse.json(
            { token: null, reason: 'unauthenticated' },
            { status: 401, headers: SECURITY_HEADERS },
        );
    }

    if (!isAuthenticated(session)) {
        return NextResponse.json(
            { token: null, reason: 'unauthenticated' },
            { status: 401, headers: SECURITY_HEADERS },
        );
    }

    try {
        const { token, expiresAt } = await issueSupabaseJwt({
            userId: session.userId,
            slackTeamId: session.slackTeamId,
            slackUserId: session.slackUserId,
        });
        return NextResponse.json({ token, expiresAt }, { status: 200, headers: SECURITY_HEADERS });
    } catch (err) {
        console.error('[session-token] issue failed:', err);
        return NextResponse.json(
            { token: null, reason: 'server_error' },
            { status: 500, headers: SECURITY_HEADERS },
        );
    }
}
