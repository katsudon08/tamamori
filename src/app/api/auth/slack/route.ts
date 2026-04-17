import { NextResponse } from 'next/server';
import { buildAuthorizationUrl, getSession } from '@/features/slack-auth';
import { getRequestOrigin } from '@/shared/lib/http';

export async function GET(request: Request) {
    const session = await getSession();

    const state = crypto.randomUUID();
    session.oauthState = state;
    await session.save();

    const origin = getRequestOrigin(request);
    const url = buildAuthorizationUrl(state, origin);

    return NextResponse.redirect(url, 302);
}
