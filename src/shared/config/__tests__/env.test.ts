import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { ZodError } from 'zod';
import { parseEnv } from '../env-schema';

const VALID_ENV: Record<string, string> = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key-123',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-123',
    SUPABASE_JWT_SECRET: 'jwt-secret-value-32-chars-long-ok-12',
    SLACK_CLIENT_ID: 'slack-client-id',
    SLACK_CLIENT_SECRET: 'slack-client-secret',
    SLACK_SIGNING_SECRET: 'slack-signing-secret',
    SLACK_BOT_TOKEN: 'xoxb-bot-token',
    SLACK_WATCHED_CHANNELS: 'C01,C02,C03',
    SESSION_SECRET: 'session-secret-value-32-chars-long-ok',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-123',
};

describe('parseEnv', () => {
    test('必須変数が欠損した場合にZodErrorをthrowする', () => {
        expect(() => parseEnv({})).toThrow(ZodError);
    });

    test('全変数が正しく設定されている場合、型付きオブジェクトが返却される', () => {
        const env = parseEnv(VALID_ENV);
        expect(env.SUPABASE_URL).toBe('https://example.supabase.co');
        expect(env.SUPABASE_ANON_KEY).toBe('anon-key-123');
        expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('service-role-key-123');
        expect(env.SLACK_CLIENT_ID).toBe('slack-client-id');
        expect(env.SLACK_CLIENT_SECRET).toBe('slack-client-secret');
        expect(env.SLACK_SIGNING_SECRET).toBe('slack-signing-secret');
        expect(env.SLACK_BOT_TOKEN).toBe('xoxb-bot-token');
        expect(env.SESSION_SECRET).toBe('session-secret-value-32-chars-long-ok');
        expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
        expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key-123');
    });

    test('SLACK_WATCHED_CHANNELS がカンマ区切り文字列から配列に変換される', () => {
        const env = parseEnv(VALID_ENV);
        expect(env.SLACK_WATCHED_CHANNELS).toEqual(['C01', 'C02', 'C03']);
    });

    test('SESSION_SECRET が32文字未満の場合にZodErrorをthrowする', () => {
        expect(() => parseEnv({ ...VALID_ENV, SESSION_SECRET: 'too-short' })).toThrow(ZodError);
    });

    test('SUPABASE_JWT_SECRET が必須かつ正しく型付けされる', () => {
        const env = parseEnv(VALID_ENV);
        expect(env.SUPABASE_JWT_SECRET).toBe('jwt-secret-value-32-chars-long-ok-12');
    });

    test('SUPABASE_JWT_SECRET が32文字未満の場合にZodErrorをthrowする', () => {
        expect(() =>
            parseEnv({ ...VALID_ENV, SUPABASE_JWT_SECRET: 'too-short' }),
        ).toThrow(ZodError);
    });
});

describe('getEnv', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test('インポート時にはparseEnvが実行されない（遅延評価）', async () => {
        const mod = await import('../env');
        // getEnv を呼ばなければ parseEnv は走らない → エラーにならない
        expect(typeof mod.getEnv).toBe('function');
    });

    test('呼び出し時にparseEnvが実行され結果がキャッシュされる', async () => {
        const originalEnv = process.env;
        process.env = { ...originalEnv, ...VALID_ENV };

        try {
            const { getEnv: freshGetEnv } = await import('../env');
            const first = freshGetEnv();
            const second = freshGetEnv();
            expect(first).toBe(second);
            expect(first.SUPABASE_URL).toBe('https://example.supabase.co');
        } finally {
            process.env = originalEnv;
        }
    });
});
