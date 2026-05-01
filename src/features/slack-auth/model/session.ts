import type { IronSession, SessionOptions } from 'iron-session';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv } from '@/shared/config';

/** セッションに保存するユーザー情報 */
export interface SessionData {
    userId: string; // users テーブルの UUID (未認証時は空文字)
    slackUserId: string; // Slack user ID (未認証時は空文字)
    slackTeamId: string; // Slack team ID, マルチテナント認可の基準 (未認証時は空文字)
    displayName: string;
    avatarUrl: string;
    oauthState?: string; // CSRF対策用 state (OAuth開始時にセット、コールバック後にクリア)
}

/**
 * Server Component 用の読み取り専用セッション型。
 * `userId` / `slackTeamId` は未認証時に空文字センチネルを取りうるため、
 * テナント認可目的で利用する場合は `AuthenticatedSession` を使うこと。
 */
export type ReadonlySession = Readonly<SessionData>;

/**
 * 認証済み状態のセッション型。`userId` / `slackTeamId` / `slackUserId` のすべてが
 * 非空であることを型レベルで表現する。`(pages)/` 配下の layout ガード通過後と、
 * `/api/auth/session-token` で issueSupabaseJwt に渡す段階で型が確定する。
 *
 * `slackUserId` も非空保証する理由: JWT claim に slack_user_id が含まれるため、
 * ここで欠損していると JWT が空文字 claim を持つことになり監査ログ等の整合性を
 * 損なう。callback で必ずセットされるが型でも強制する。
 */
export type AuthenticatedSession = Readonly<
    Omit<SessionData, 'userId' | 'slackTeamId' | 'slackUserId'> & {
        userId: string; // non-empty
        slackTeamId: string; // non-empty
        slackUserId: string; // non-empty
    }
>;

/** 未認証時のデフォルトセッション */
export const defaultSession: SessionData = {
    userId: '',
    slackUserId: '',
    slackTeamId: '',
    displayName: '',
    avatarUrl: '',
};

/** iron-session 設定 */
export const sessionOptions: SessionOptions = {
    password: getEnv().SESSION_SECRET,
    cookieName: 'tamamori_session',
    ttl: 60 * 60 * 24 * 7, // 7日間
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax' as const,
    },
};

/** Route Handler 用セッション取得（読み書き可能） */
export async function getSession(): Promise<IronSession<SessionData>> {
    return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/**
 * Server Component 用セッション取得（読み取り専用）。
 * 戻り値の `userId` / `slackTeamId` は未認証時に空文字を取りうるため、
 * 値をそのまま信頼してよいのは `(pages)/` 配下の layout ガード通過後のみ。
 * テナント認可目的で使う場合は `getAuthenticatedSession()` を推奨。
 */
export async function getServerSession(): Promise<ReadonlySession> {
    return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** 未認証状態を型ガードで判別する。3 値すべて非空のときだけ認証済み扱い */
export function isAuthenticated(session: ReadonlySession): session is AuthenticatedSession {
    return session.userId !== '' && session.slackTeamId !== '' && session.slackUserId !== '';
}

/**
 * 認証済みセッションを取得する。`userId` または `slackTeamId` が空の場合は
 * `/` にリダイレクトする (= 関数は `never` を返すため以降のコードは実行されない)。
 * `(pages)/` 配下の Server Component から呼び出す用途を想定。
 */
export async function getAuthenticatedSession(): Promise<AuthenticatedSession> {
    const session = await getServerSession();
    if (!isAuthenticated(session)) {
        redirect('/');
    }
    return session;
}
