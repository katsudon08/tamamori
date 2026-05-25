import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

const mockDestroy = jest.fn();

jest.mock('@/features/slack-auth', () => ({
    getSession: jest.fn<() => Promise<{ destroy: typeof mockDestroy }>>().mockResolvedValue({
        destroy: mockDestroy,
    }),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

// --- tests ---------------------------------------------------------------

describe('GET /api/auth/logout', () => {
    test('session.destroy() が呼ばれる', async () => {
        const { GET } = await import('../route');

        await GET(new Request('http://localhost:3000/api/auth/logout'));

        expect(mockDestroy).toHaveBeenCalled();
    });

    test('/ への302リダイレクトが返される', async () => {
        const { GET } = await import('../route');

        const response = await GET(new Request('http://localhost:3000/api/auth/logout'));

        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('http://localhost:3000/');
    });

    test('reason=session_expired の場合は landing に error=session_expired を付けて戻す', async () => {
        const { GET } = await import('../route');

        const response = await GET(
            new Request('http://localhost:3000/api/auth/logout?reason=session_expired'),
        );

        expect(mockDestroy).toHaveBeenCalled();
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe(
            'http://localhost:3000/?error=session_expired',
        );
    });

    test('x-forwarded-host があれば proxy 経由の origin へリダイレクトする', async () => {
        const { GET } = await import('../route');

        const response = await GET(
            new Request('http://localhost:3000/api/auth/logout', {
                headers: {
                    'x-forwarded-host': 'example.ngrok-free.dev',
                    'x-forwarded-proto': 'https',
                },
            }),
        );

        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('https://example.ngrok-free.dev/');
    });
});
