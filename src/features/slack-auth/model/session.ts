import type { IronSession, SessionOptions } from 'iron-session';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { env } from '@/shared/config';

/** セッションに保存するユーザー情報 */
export interface SessionData {
    userId: string; // users テーブルの UUID
    slackUserId: string; // Slack user ID
    displayName: string;
    avatarUrl: string;
}

/** Server Component 用の読み取り専用セッション型 */
export type ReadonlySession = Readonly<SessionData>;

/** 未認証時のデフォルトセッション */
export const defaultSession: SessionData = {
    userId: '',
    slackUserId: '',
    displayName: '',
    avatarUrl: '',
};

/** iron-session 設定 */
export const sessionOptions: SessionOptions = {
    password: env.SESSION_SECRET,
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

/** Server Component 用セッション取得（読み取り専用） */
export async function getServerSession(): Promise<ReadonlySession> {
    return getIronSession<SessionData>(await cookies(), sessionOptions);
}
