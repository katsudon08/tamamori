import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { createBrowserClient } from '@supabase/ssr';

jest.mock('@supabase/ssr', () => ({
    createBrowserClient: jest.fn(() => ({ from: jest.fn() })),
}));

const mockedCreateBrowserClient = jest.mocked(createBrowserClient);

describe('createClient (ブラウザサイド)', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    });

    test('モック環境変数でクライアント生成がthrowしない', async () => {
        const { createClient } = await import('../client');
        expect(() => createClient()).not.toThrow();
    });

    test('createBrowserClient に正しい引数を渡す', async () => {
        const { createClient } = await import('../client');

        createClient();

        expect(mockedCreateBrowserClient).toHaveBeenCalledWith(
            'https://example.supabase.co',
            'test-anon-key',
        );
    });
});
