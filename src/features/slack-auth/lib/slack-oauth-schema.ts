import { z } from 'zod';

/** OAuthコールバックのクエリパラメータ (code, state) */
export const oauthCallbackParamsSchema = z.object({
    code: z.string(),
    state: z.string(),
});

export type OAuthCallbackParams = z.infer<typeof oauthCallbackParamsSchema>;
