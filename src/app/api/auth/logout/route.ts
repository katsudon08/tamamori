import { NextResponse } from 'next/server';
import { getSession } from '@/features/slack-auth';
import { getRequestOrigin } from '@/shared/lib/http';

export async function GET(request: Request) {
    const session = await getSession();
    session.destroy();

    const origin = getRequestOrigin(request);
    return NextResponse.redirect(`${origin}/`, 302);
}
