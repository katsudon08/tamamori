import { z } from 'zod';

const envSchema = z.object({
    // Supabase (server)
    SUPABASE_URL: z.string(),
    SUPABASE_ANON_KEY: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),

    // Slack
    SLACK_CLIENT_ID: z.string(),
    SLACK_CLIENT_SECRET: z.string(),
    SLACK_SIGNING_SECRET: z.string(),
    SLACK_BOT_TOKEN: z.string(),
    SLACK_WATCHED_CHANNELS: z.string().transform((v) => v.split(',')),

    // Session
    // iron-session は cookie の暗号化・署名に password (SESSION_SECRET) の強度を
    // 信頼している。32 文字未満だと攻撃者による cookie 改竄の余地が生まれ、
    // session.slackTeamId 起点のテナント認可全体が成立しなくなるため schema で強制する。
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

    // Supabase (client)
    NEXT_PUBLIC_SUPABASE_URL: z.string(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
    return envSchema.parse(source);
}
