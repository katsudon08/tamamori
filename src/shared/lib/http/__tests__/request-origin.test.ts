import { describe, test, expect } from '@jest/globals';
import { getRequestOrigin } from '../request-origin';

// --- getRequestOrigin -----------------------------------------------------

describe('getRequestOrigin', () => {
    test('x-forwarded-host があれば https://<host> を返す', () => {
        const request = new Request('http://localhost:3000/api/auth/slack', {
            headers: { 'x-forwarded-host': 'example.ngrok-free.dev' },
        });

        expect(getRequestOrigin(request)).toBe('https://example.ngrok-free.dev');
    });

    test('x-forwarded-proto があれば尊重する', () => {
        const request = new Request('http://localhost:3000/api/auth/slack', {
            headers: {
                'x-forwarded-host': 'example.ngrok-free.dev',
                'x-forwarded-proto': 'http',
            },
        });

        expect(getRequestOrigin(request)).toBe('http://example.ngrok-free.dev');
    });

    test('forwarded ヘッダーが無ければ request.url の origin を返す', () => {
        const request = new Request('http://localhost:3000/api/auth/slack');

        expect(getRequestOrigin(request)).toBe('http://localhost:3000');
    });
});
