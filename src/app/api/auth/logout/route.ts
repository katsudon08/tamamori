import { NextResponse } from 'next/server';
import { getSession } from '@/features/slack-auth';
import { getRequestOrigin } from '@/shared/lib/http';

export async function GET(request: Request) {
    const session = await getSession();
    session.destroy();

    const origin = getRequestOrigin(request);
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason');
    const redirectPath = reason === 'session_expired' ? '/?error=session_expired' : '/';

    return NextResponse.redirect(`${origin}${redirectPath}`, 302);
}
