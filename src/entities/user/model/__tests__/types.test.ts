import { describe, test, expect } from '@jest/globals';
import { ZodError } from 'zod';
import { userSchema } from '../types';

const VALID_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  slack_user_id: 'U01ABC123',
  slack_team_id: 'T01ABC123',
  display_name: 'テストユーザー',
  avatar_url: 'https://example.com/avatar.png',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

describe('userSchema', () => {
  test('有効なユーザーデータをパースできる', () => {
    expect(userSchema.parse(VALID_USER)).toEqual(VALID_USER);
  });

  test('avatar_urlがnullでもパースできる', () => {
    const user = { ...VALID_USER, avatar_url: null };
    expect(userSchema.parse(user)).toEqual(user);
  });

  test('idがUUID形式でない場合にZodErrorをthrowする', () => {
    expect(() => userSchema.parse({ ...VALID_USER, id: 'not-uuid' })).toThrow(ZodError);
  });

  test('必須フィールドが欠損した場合にZodErrorをthrowする', () => {
    expect(() => userSchema.parse({})).toThrow(ZodError);
  });
});
