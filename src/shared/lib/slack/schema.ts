import { z } from 'zod';

/** Slack openid.connect.token レスポンス */
export const oauthTokenResponseSchema = z.object({
    ok: z.boolean(),
    access_token: z.string(),
    id_token: z.string(),
});

export type OAuthTokenResponse = z.infer<typeof oauthTokenResponseSchema>;

/** Slack openid.connect.userInfo レスポンス */
export const oauthUserInfoResponseSchema = z.object({
    ok: z.boolean(),
    sub: z.string(),
    'https://slack.com/team_id': z.string(),
    name: z.string(),
    picture: z.string(),
});

export type OAuthUserInfoResponse = z.infer<typeof oauthUserInfoResponseSchema>;
