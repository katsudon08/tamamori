import { describe, test, expect } from '@jest/globals';
import { slackEventSchema } from '../slack-event-schema';

describe('slackEventSchema', () => {
  test('正常な url_verification ペイロードがパースできること', () => {
    const payload = {
      type: 'url_verification',
      challenge: 'test-challenge-string',
      token: 'test-token',
    };

    const result = slackEventSchema.parse(payload);

    expect(result).toEqual(payload);
    expect(result.type).toBe('url_verification');
  });

  test('正常な event_callback (message) ペイロードがパースできること', () => {
    const payload = {
      type: 'event_callback',
      event_id: 'Ev01XXXX',
      team_id: 'T01XXXX',
      event: {
        type: 'message',
        user: 'U01XXXX',
        text: '今日もがんばりましょう！',
        channel: 'C01XXXX',
        ts: '1234567890.123456',
      },
    };

    const result = slackEventSchema.parse(payload);

    expect(result.type).toBe('event_callback');
    if (result.type === 'event_callback') {
      expect(result.event.type).toBe('message');
    }
  });

  test('正常な event_callback (message) で subtype ありのペイロードがパースできること', () => {
    const payload = {
      type: 'event_callback',
      event_id: 'Ev01XXXX',
      team_id: 'T01XXXX',
      event: {
        type: 'message',
        subtype: 'bot_message',
        user: 'U01XXXX',
        text: 'bot message',
        channel: 'C01XXXX',
        ts: '1234567890.123456',
      },
    };

    const result = slackEventSchema.parse(payload);

    expect(result.type).toBe('event_callback');
    if (result.type === 'event_callback') {
      expect(result.event.type).toBe('message');
    }
  });

  test('正常な event_callback (reaction_added) ペイロードがパースできること', () => {
    const payload = {
      type: 'event_callback',
      event_id: 'Ev02XXXX',
      team_id: 'T01XXXX',
      event: {
        type: 'reaction_added',
        user: 'U01XXXX',
        reaction: 'thumbsup',
        item: {
          type: 'message',
          channel: 'C01XXXX',
          ts: '1234567890.123456',
        },
      },
    };

    const result = slackEventSchema.parse(payload);

    expect(result.type).toBe('event_callback');
    if (result.type === 'event_callback') {
      expect(result.event.type).toBe('reaction_added');
    }
  });

  test('不正なペイロードでZodErrorが発生すること', () => {
    const invalidPayload = {
      type: 'unknown_type',
      data: 'invalid',
    };

    expect(() => slackEventSchema.parse(invalidPayload)).toThrow();
  });

  test('event_callback で event フィールドが欠損している場合にZodErrorが発生すること', () => {
    const payload = {
      type: 'event_callback',
      event_id: 'Ev01XXXX',
      team_id: 'T01XXXX',
    };

    expect(() => slackEventSchema.parse(payload)).toThrow();
  });
});
