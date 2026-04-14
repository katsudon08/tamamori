import { exchangeOAuthCode, getUserInfo } from '@/shared/lib/slack';
import { getEnv } from '@/shared/config';

/**
 * Slack OAuth 認可 URL を構築する
 */
export function buildAuthorizationUrl(state: string, origin: string): string {
    const params = new URLSearchParams({
        client_id: getEnv().SLACK_CLIENT_ID,
        scope: 'openid,profile',
        redirect_uri: `${origin}/api/auth/slack/callback`,
        response_type: 'code',
        state,
    });
    return `https://slack.com/openid/connect/authorize?${params.toString()}`;
}

/**
 * 認可コードをトークンに交換する
 */
export async function exchangeCodeForToken(
    code: string,
): Promise<{ accessToken: string; idToken: string }> {
    return exchangeOAuthCode(code);
}

/**
 * トークンからユーザー情報を取得する
 */
export async function fetchUserIdentity(
    token: string,
): Promise<{ userId: string; teamId: string; name: string; picture: string }> {
    return getUserInfo(token);
}
