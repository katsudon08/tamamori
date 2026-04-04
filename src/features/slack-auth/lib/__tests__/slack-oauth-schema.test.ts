import { describe, test, expect } from '@jest/globals';
import { oauthCallbackParamsSchema, oauthUserInfoResponseSchema } from '../slack-oauth-schema';

describe('oauthCallbackParamsSchema', () => {
    test('正常なOAuthコールバックパラメータがパースできること', () => {
        const params = {
            code: 'test-auth-code',
            state: 'test-csrf-token',
        };

        const result = oauthCallbackParamsSchema.parse(params);

        expect(result).toEqual(params);
    });

    test('必須フィールド (code) 欠損でZodErrorが発生すること', () => {
        const params = {
            state: 'test-csrf-token',
        };

        expect(() => oauthCallbackParamsSchema.parse(params)).toThrow();
    });

    test('必須フィールド (state) 欠損でZodErrorが発生すること', () => {
        const params = {
            code: 'test-auth-code',
        };

        expect(() => oauthCallbackParamsSchema.parse(params)).toThrow();
    });
});

describe('oauthUserInfoResponseSchema', () => {
    test('正常なトークン交換レスポンスがパースできること', () => {
        const response = {
            ok: true,
            sub: 'U12345',
            'https://slack.com/team_id': 'T12345',
            name: 'Test User',
            picture: 'https://example.com/avatar.png',
        };

        const result = oauthUserInfoResponseSchema.parse(response);

        expect(result).toEqual(response);
    });

    test('必須フィールド欠損でZodErrorが発生すること', () => {
        const response = {
            ok: true,
            sub: 'U12345',
            // name, picture, team_id が欠損
        };

        expect(() => oauthUserInfoResponseSchema.parse(response)).toThrow();
    });

    test('ok が false の場合でもスキーマ自体はパースできること', () => {
        const response = {
            ok: false,
            sub: 'U12345',
            'https://slack.com/team_id': 'T12345',
            name: 'Test User',
            picture: 'https://example.com/avatar.png',
        };

        const result = oauthUserInfoResponseSchema.parse(response);

        expect(result.ok).toBe(false);
    });
});
