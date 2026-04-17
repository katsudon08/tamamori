import { createHmac, randomUUID } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';

interface SendSlackMessageEventOptions {
    text?: string;
    channel?: string;
    eventId?: string;
    user?: string;
}

/**
 * 有効な HMAC-SHA256 署名付きで /api/slack/events にメッセージイベントを POST する。
 * SLACK_SIGNING_SECRET と SLACK_WATCHED_CHANNELS を .env.local から読み取る。
 */
export async function sendSlackMessageEvent(
    request: APIRequestContext,
    options: SendSlackMessageEventOptions = {},
): Promise<APIResponse> {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
        throw new Error('SLACK_SIGNING_SECRET が未設定です');
    }

    const watched = process.env.SLACK_WATCHED_CHANNELS?.split(',').filter(Boolean) ?? [];
    const channel = options.channel ?? watched[0];
    if (!channel) {
        throw new Error('SLACK_WATCHED_CHANNELS が空です');
    }

    const payload = {
        type: 'event_callback' as const,
        event_id: options.eventId ?? `Ev_${randomUUID()}`,
        team_id: 'T_E2E_TEST',
        event: {
            type: 'message' as const,
            user: options.user ?? 'U_E2E_TEST',
            text: options.text ?? 'hello from e2e',
            channel,
            ts: `${Math.floor(Date.now() / 1000)}.000000`,
        },
    };

    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = `v0=${createHmac('sha256', signingSecret)
        .update(`v0:${timestamp}:${body}`)
        .digest('hex')}`;

    return request.post('/api/slack/events', {
        headers: {
            'content-type': 'application/json',
            'x-slack-request-timestamp': timestamp,
            'x-slack-signature': signature,
        },
        data: body,
    });
}
