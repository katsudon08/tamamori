import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

// supabase-js の createClient をモック化し、渡されるオプションを検証する
type CreateClientArgs = [url: string, key: string, options?: Record<string, unknown>];
const mockCreateClient = jest.fn<(...args: CreateClientArgs) => { from: jest.Mock }>(() => ({
    from: jest.fn(),
}));
jest.mock('@supabase/supabase-js', () => ({
    createClient: (...args: unknown[]) => mockCreateClient(...(args as CreateClientArgs)),
}));

// token-cache の getSessionToken はモックして fetch を発生させない
const mockGetSessionToken = jest.fn(async () => 'mocked-jwt');
jest.mock('../token-cache', () => ({
    getSessionToken: () => mockGetSessionToken(),
}));

beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

// --- tests ---------------------------------------------------------------

describe('createBrowserClient (ブラウザ用 supabase client)', () => {
    test('生成は throw しない', async () => {
        const { createClient } = await import('../client');
        expect(() => createClient()).not.toThrow();
    });

    test('@supabase/supabase-js の createClient に URL と anon key を渡す', async () => {
        const { createClient } = await import('../client');

        createClient();

        expect(mockCreateClient).toHaveBeenCalledTimes(1);
        const [url, key] = mockCreateClient.mock.calls[0]!;
        expect(url).toBe('https://example.supabase.co');
        expect(key).toBe('test-anon-key');
    });

    test('options に accessToken 関数オプションが含まれる', async () => {
        const { createClient } = await import('../client');

        createClient();

        const options = mockCreateClient.mock.calls[0]![2] as {
            accessToken?: () => Promise<string>;
        };
        expect(typeof options.accessToken).toBe('function');
    });

    test('accessToken を呼び出すと token-cache の getSessionToken が走る', async () => {
        const { createClient } = await import('../client');

        createClient();

        const options = mockCreateClient.mock.calls[0]![2] as {
            accessToken?: () => Promise<string>;
        };
        const token = await options.accessToken!();

        expect(token).toBe('mocked-jwt');
        expect(mockGetSessionToken).toHaveBeenCalledTimes(1);
    });

    test('auth オプションは persistSession/autoRefreshToken/detectSessionInUrl が全て false', async () => {
        const { createClient } = await import('../client');

        createClient();

        const options = mockCreateClient.mock.calls[0]![2] as {
            auth?: {
                persistSession: boolean;
                autoRefreshToken: boolean;
                detectSessionInUrl: boolean;
            };
        };
        expect(options.auth).toEqual({
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        });
    });
});
