import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { getEnv } from '@/shared/config';

/**
 * Supabase RLS 用のカスタム JWT 発行パラメータ。
 * いずれの値も iron-session (`tamamori_session`) から取得した検証済みの値で
 * あることを呼び出し側が保証すること。リクエスト由来の値を直接渡してはならない。
 */
export interface IssueSupabaseJwtInput {
    userId: string; // users.id (UUID)
    slackTeamId: string; // テナント識別子。RLS の auth.jwt() ->> 'slack_team_id' で参照される
    slackUserId: string; // 監査用
}

export interface IssueSupabaseJwtResult {
    token: string;
    /** Unix epoch (秒)。クライアント側で期限切れ直前の prefetch 判定に使う */
    expiresAt: number;
}

/** JWT TTL (秒)。iron-session 7 日とは独立に短命にする (ADR-004 §決定 8 参照) */
const JWT_TTL_SECONDS = 3600;

/**
 * iron-session の検証済み情報を元に Supabase RLS 用 JWT を HS256 で発行する。
 * 鍵は `SUPABASE_JWT_SECRET` (Supabase ダッシュボードの JWT secret と同一値)。
 *
 * claims:
 *   - sub: users.id
 *   - role: 'authenticated' (RLS の TO authenticated を有効化)
 *   - slack_team_id / slack_user_id (テナント識別 + 監査)
 *   - aud: 'authenticated' (Supabase 既定)
 *   - iss: 'tamamori' (発行元識別)
 *   - iat / exp / jti
 */
export async function issueSupabaseJwt(
    input: IssueSupabaseJwtInput,
): Promise<IssueSupabaseJwtResult> {
    const { SUPABASE_JWT_SECRET } = getEnv();
    const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + JWT_TTL_SECONDS;

    const token = await new SignJWT({
        role: 'authenticated',
        slack_team_id: input.slackTeamId,
        slack_user_id: input.slackUserId,
    })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(input.userId)
        .setAudience('authenticated')
        .setIssuer('tamamori')
        .setIssuedAt(now)
        .setExpirationTime(expiresAt)
        .setJti(randomUUID())
        .sign(secret);

    return { token, expiresAt };
}
