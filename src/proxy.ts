import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'tamamori_session';

export function proxy(request: NextRequest) {
    const sessionCookie = request.cookies.get(COOKIE_NAME);

    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/garden', '/bonsai/:path*', '/stats'],
};
