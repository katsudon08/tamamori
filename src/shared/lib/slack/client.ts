import { env } from '../../config';

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
): Promise<OAuthTokenResult> {
  const body = new URLSearchParams({
    code,
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
  });

  const res = await fetch(`${SLACK_API}/openid.connect.token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error ?? 'exchangeOAuthCode failed');
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

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error ?? 'getUserInfo failed');
  }

  return {
    userId: data.sub,
    teamId: data['https://slack.com/team_id'],
    name: data.name,
    picture: data.picture,
  };
}
