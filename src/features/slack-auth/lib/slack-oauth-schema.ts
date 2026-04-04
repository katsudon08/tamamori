import { z } from 'zod';

/** OAuthコールバックのクエリパラメータ (code, state) */
export const oauthCallbackParamsSchema = z.object({
    code: z.string(),
    state: z.string(),
});

/** Slack openid.connect.userInfo レスポンス */
export const oauthUserInfoResponseSchema = z.object({
    ok: z.boolean(),
    sub: z.string(),
    'https://slack.com/team_id': z.string(),
    name: z.string(),
    picture: z.string(),
});

export type OAuthCallbackParams = z.infer<typeof oauthCallbackParamsSchema>;
export type OAuthUserInfoResponse = z.infer<typeof oauthUserInfoResponseSchema>;
