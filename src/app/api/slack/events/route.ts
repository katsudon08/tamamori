import { NextResponse, after } from 'next/server';
import { verifySignature, slackEventSchema } from '@/features/slack-auth';
import { processSlackEvent } from '@/features/bonsai-growth';
import { getEnv } from '@/shared/config';

export async function POST(request: Request) {
    // 1. body 取得
    const body = await request.text();

    // 2. 署名検証 → 失敗で 401
    const timestamp = request.headers.get('x-slack-request-timestamp') ?? '';
    const signature = request.headers.get('x-slack-signature') ?? '';
    if (
        !verifySignature({
            body,
            timestamp,
            signature,
            signingSecret: getEnv().SLACK_SIGNING_SECRET,
        })
    ) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Zod バリデーション → 失敗で 200（Slack にエラーを返さない）
    let parsed;
    try {
        parsed = slackEventSchema.safeParse(JSON.parse(body));
    } catch {
        console.error('[slack-events] invalid JSON');
        return new NextResponse(null, { status: 200 });
    }

    if (!parsed.success) {
        console.error('[slack-events] validation failed:', parsed.error.message);
        return new NextResponse(null, { status: 200 });
    }

    const data = parsed.data;

    // 4. URL Verification
    if (data.type === 'url_verification') {
        return NextResponse.json({ challenge: data.challenge });
    }

    // 5. 即 200 返却 + after() で非同期処理
    after(async () => {
        await processSlackEvent(data);
    });

    return new NextResponse(null, { status: 200 });
}
