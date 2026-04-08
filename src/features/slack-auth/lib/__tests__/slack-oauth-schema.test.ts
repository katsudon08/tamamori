import { describe, test, expect } from '@jest/globals';
import { oauthCallbackParamsSchema } from '../slack-oauth-schema';

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
