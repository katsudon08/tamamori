import { describe, test, expect } from '@jest/globals';
import { NextRequest } from 'next/server';
import { proxy, config } from '../proxy';

// --- helpers ----------------------------------------------------------------

function createRequest(pathname: string, hasCookie: boolean): NextRequest {
    const url = new URL(pathname, 'http://localhost:3000');
    const req = new NextRequest(url);
    if (hasCookie) {
        req.cookies.set('tamamori_session', 'encrypted-session-value');
    }
    return req;
}

// --- tests ------------------------------------------------------------------

describe('proxy', () => {
    test('未認証で /garden にアクセスすると / にリダイレクトされる', () => {
        const req = createRequest('/garden', false);
        const res = proxy(req);

        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('Location')!).pathname).toBe('/');
    });

    test('認証済みで /garden にアクセスするとパススルーされる', () => {
        const req = createRequest('/garden', true);
        const res = proxy(req);

        expect(res.headers.get('Location')).toBeNull();
    });

    test('/api/slack/events は matcher に含まれない', () => {
        const matchers = config.matcher as string[];
        const apiPath = '/api/slack/events';

        const matchesAny = matchers.some((pattern) =>
            apiPath.startsWith(pattern.replace('/:path*', '')),
        );

        expect(matchesAny).toBe(false);
    });
});
