import { getEnv } from '../../config';
import { oauthTokenResponseSchema, oauthUserInfoResponseSchema } from './schema';

const SLACK_API = 'https://slack.com/api';

export interface OAuthTokenResult {
    accessToken: string;
    idToken: string;
}

export interface SlackUserInfo {
    userId: string;
    teamId: string;
    name: string;
    picture: string;
}

/**
 * 認可コードを Slack の openid.connect.token API でトークンに交換する
 */
export async function exchangeOAuthCode(
    code: string,
    redirectUri: string,
): Promise<OAuthTokenResult> {
    const body = new URLSearchParams({
        code,
        client_id: getEnv().SLACK_CLIENT_ID,
        client_secret: getEnv().SLACK_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
    });

    const res = await fetch(`${SLACK_API}/openid.connect.token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    const data = oauthTokenResponseSchema.parse(await res.json());

    if (!data.ok) {
        throw new Error('exchangeOAuthCode failed');
    }

    return {
        accessToken: data.access_token,
        idToken: data.id_token,
    };
}

/**
 * トークンからユーザー情報を取得する
 */
export async function getUserInfo(token: string): Promise<SlackUserInfo> {
    const res = await fetch(`${SLACK_API}/openid.connect.userInfo`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = oauthUserInfoResponseSchema.parse(await res.json());

    if (!data.ok) {
        throw new Error('getUserInfo failed');
    }

    return {
        userId: data.sub,
        teamId: data['https://slack.com/team_id'],
        name: data.name,
        picture: data.picture,
    };
}
