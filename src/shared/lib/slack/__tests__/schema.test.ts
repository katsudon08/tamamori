import { describe, test, expect } from '@jest/globals';
import { oauthTokenResponseSchema, oauthUserInfoResponseSchema } from '../schema';

describe('oauthTokenResponseSchema', () => {
    test('正常なトークン交換レスポンスがパースできること', () => {
        const response = {
            ok: true,
            access_token: 'xoxp-test-token',
            id_token: 'test-id-token',
        };

        const result = oauthTokenResponseSchema.parse(response);

        expect(result).toEqual(response);
    });

    test('必須フィールド (access_token) 欠損でZodErrorが発生すること', () => {
        const response = {
            ok: true,
            id_token: 'test-id-token',
        };

        expect(() => oauthTokenResponseSchema.parse(response)).toThrow();
    });

    test('必須フィールド (id_token) 欠損でZodErrorが発生すること', () => {
        const response = {
            ok: true,
            access_token: 'xoxp-test-token',
        };

        expect(() => oauthTokenResponseSchema.parse(response)).toThrow();
    });

    test('ok が false の場合でもスキーマ自体はパースできること', () => {
        const response = {
            ok: false,
            access_token: 'xoxp-test-token',
            id_token: 'test-id-token',
        };

        const result = oauthTokenResponseSchema.parse(response);

        expect(result.ok).toBe(false);
    });
});

describe('oauthUserInfoResponseSchema', () => {
    test('正常なユーザー情報レスポンスがパースできること', () => {
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
