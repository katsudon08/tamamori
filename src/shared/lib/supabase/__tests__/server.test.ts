import { describe, test, expect, jest } from '@jest/globals';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

jest.mock('../../../config', () => ({
    getEnv: () => ({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    }),
}));

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({ from: jest.fn() })),
}));

const mockedCreateSupabaseClient = jest.mocked(createSupabaseClient);

describe('createClient (サーバーサイド)', () => {
    test('モック環境変数でクライアント生成がthrowしない', async () => {
        const { createClient } = await import('../server');
        expect(() => createClient()).not.toThrow();
    });

    test('createClient に正しい引数を渡す', async () => {
        const { createClient } = await import('../server');

        createClient();

        expect(mockedCreateSupabaseClient).toHaveBeenCalledWith(
            'https://example.supabase.co',
            'test-service-role-key',
        );
    });
});
