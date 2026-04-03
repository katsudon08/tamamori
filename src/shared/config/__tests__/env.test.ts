import { describe, test, expect } from '@jest/globals';
import { ZodError } from 'zod';
import { parseEnv } from '../env-schema';

const VALID_ENV: Record<string, string> = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key-123',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-123',
  SLACK_CLIENT_ID: 'slack-client-id',
  SLACK_CLIENT_SECRET: 'slack-client-secret',
  SLACK_SIGNING_SECRET: 'slack-signing-secret',
  SLACK_BOT_TOKEN: 'xoxb-bot-token',
  SLACK_WATCHED_CHANNELS: 'C01,C02,C03',
  SESSION_SECRET: 'session-secret-value',
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
    expect(env.SESSION_SECRET).toBe('session-secret-value');
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key-123');
  });

  test('SLACK_WATCHED_CHANNELS がカンマ区切り文字列から配列に変換される', () => {
    const env = parseEnv(VALID_ENV);
    expect(env.SLACK_WATCHED_CHANNELS).toEqual(['C01', 'C02', 'C03']);
  });
});
