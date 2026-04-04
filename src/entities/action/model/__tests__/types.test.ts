import { describe, test, expect } from '@jest/globals';
import { ZodError } from 'zod';
import { actionTypeSchema, actionLogSchema } from '../types';

const VALID_ACTION_LOG = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  user_id: '660e8400-e29b-41d4-a716-446655440000',
  action_type: 'message' as const,
  slack_event_id: 'Ev01ABC123',
  slack_channel: 'C01ABC123',
  metadata: { text_snippet: 'Hello world' },
  created_at: '2026-01-01T00:00:00Z',
};

describe('actionTypeSchema', () => {
  test('有効なアクションタイプをパースできる', () => {
    for (const type of ['message', 'reaction', 'thanks']) {
      expect(actionTypeSchema.parse(type)).toBe(type);
    }
  });

  test('無効なアクションタイプでZodErrorをthrowする', () => {
    expect(() => actionTypeSchema.parse('invalid')).toThrow(ZodError);
  });
});

describe('actionLogSchema', () => {
  test('有効なアクションログをパースできる', () => {
    expect(actionLogSchema.parse(VALID_ACTION_LOG)).toEqual(VALID_ACTION_LOG);
  });

  test('slack_channelがnullでもパースできる', () => {
    const log = { ...VALID_ACTION_LOG, slack_channel: null };
    expect(actionLogSchema.parse(log)).toEqual(log);
  });

  test('idがUUID形式でない場合にZodErrorをthrowする', () => {
    expect(() => actionLogSchema.parse({ ...VALID_ACTION_LOG, id: 'not-uuid' })).toThrow(ZodError);
  });

  test('必須フィールドが欠損した場合にZodErrorをthrowする', () => {
    expect(() => actionLogSchema.parse({})).toThrow(ZodError);
  });
});
