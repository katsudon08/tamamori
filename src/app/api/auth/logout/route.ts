import { NextResponse } from 'next/server';
import { getSession } from '@/features/slack-auth';

export async function GET(request: Request) {
    const session = await getSession();
    session.destroy();

    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/`, 302);
}
