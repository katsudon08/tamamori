import { z } from 'zod';

// Slack OIDC レスポンスは成功時と失敗時でボディ形状が大きく異なる。
// 単一のオブジェクト schema にしてしまうと「`ok: false` で error code を含む」
// 失敗ボディが parse 段階で落ちて、Slack 側のエラー (例: `invalid_code`) を
// 後続のログに残せなくなる。`ok` を discriminator にした union として扱う。

const oauthTokenSuccessSchema = z.object({
    ok: z.literal(true),
    access_token: z.string(),
    id_token: z.string(),
});

const slackErrorSchema = z.object({
    ok: z.literal(false),
    /** Slack 側の error code (例: 'invalid_code', 'invalid_client_id') */
    error: z.string(),
});

export const oauthTokenResponseSchema = z.discriminatedUnion('ok', [
    oauthTokenSuccessSchema,
    slackErrorSchema,
]);

export type OAuthTokenResponse = z.infer<typeof oauthTokenResponseSchema>;

const oauthUserInfoSuccessSchema = z.object({
    ok: z.literal(true),
    sub: z.string(),
    'https://slack.com/team_id': z.string(),
    name: z.string(),
    picture: z.string(),
});

export const oauthUserInfoResponseSchema = z.discriminatedUnion('ok', [
    oauthUserInfoSuccessSchema,
    slackErrorSchema,
]);

export type OAuthUserInfoResponse = z.infer<typeof oauthUserInfoResponseSchema>;
