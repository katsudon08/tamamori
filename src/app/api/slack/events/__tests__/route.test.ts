import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

const mockVerifySignature = jest
    .fn<(params: Record<string, string>) => boolean>()
    .mockReturnValue(true);

jest.mock('@/features/slack-auth', () => {
    const actual = jest.requireActual('@/features/slack-auth/lib/slack-event-schema') as {
        slackEventSchema: unknown;
    };
    return {
        verifySignature: (...args: unknown[]) =>
            mockVerifySignature(...(args as [Record<string, string>])),
        slackEventSchema: actual.slackEventSchema,
    };
});

const mockProcessSlackEvent = jest
    .fn<(payload: unknown) => Promise<void>>()
    .mockResolvedValue(undefined);

jest.mock('@/features/bonsai-growth', () => ({
    processSlackEvent: (...args: unknown[]) =>
        mockProcessSlackEvent(...(args as [unknown])),
}));

jest.mock('@/shared/config', () => ({
    env: {
        SLACK_SIGNING_SECRET: 'test-signing-secret',
    },
}));

const mockAfter = jest.fn();

jest.mock('next/server', () => {
    const actual = jest.requireActual('next/server') as Record<string, unknown>;
    return {
        ...actual,
        after: (...args: unknown[]) => mockAfter(...args),
    };
});

// --- helpers -------------------------------------------------------------

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
    return new Request('http://localhost:3000/api/slack/events', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-slack-request-timestamp': '1234567890',
            'x-slack-signature': 'v0=test-signature',
            ...headers,
        },
        body,
    });
}

const urlVerificationBody = JSON.stringify({
    type: 'url_verification',
    challenge: 'test-challenge-token',
    token: 'test-token',
});

const eventCallbackBody = JSON.stringify({
    type: 'event_callback',
    event_id: 'Ev01XXXX',
    team_id: 'T01XXXX',
    event: {
        type: 'message',
        user: 'U01XXXX',
        text: 'hello',
        channel: 'C01XXXX',
        ts: '1234567890.123456',
    },
});

// --- tests ---------------------------------------------------------------

describe('POST /api/slack/events', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockVerifySignature.mockReturnValue(true);
    });

    test('署名検証失敗で 401 が返される', async () => {
        mockVerifySignature.mockReturnValueOnce(false);
        const { POST } = await import('../route');

        const response = await POST(makeRequest(eventCallbackBody));

        expect(response.status).toBe(401);
    });

    test('url_verification で challenge が正しく返却される', async () => {
        const { POST } = await import('../route');

        const response = await POST(makeRequest(urlVerificationBody));
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json).toEqual({ challenge: 'test-challenge-token' });
    });

    test('event_callback で 200 が返される', async () => {
        const { POST } = await import('../route');

        const response = await POST(makeRequest(eventCallbackBody));

        expect(response.status).toBe(200);
    });

    test('event_callback で processSlackEvent が after() 経由で登録される', async () => {
        const { POST } = await import('../route');

        await POST(makeRequest(eventCallbackBody));

        expect(mockAfter).toHaveBeenCalledTimes(1);
        expect(typeof mockAfter.mock.calls[0][0]).toBe('function');
    });

    test('after() コールバック実行時に processSlackEvent が呼ばれる', async () => {
        const { POST } = await import('../route');

        await POST(makeRequest(eventCallbackBody));

        // after() に渡されたコールバックを実行
        const callback = mockAfter.mock.calls[0][0] as () => Promise<void>;
        await callback();

        expect(mockProcessSlackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'event_callback',
                event_id: 'Ev01XXXX',
            }),
        );
    });

    test('不正な JSON で 200 が返される', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { POST } = await import('../route');

        const response = await POST(makeRequest('not-json'));

        expect(response.status).toBe(200);
        consoleSpy.mockRestore();
    });

    test('Zodバリデーション失敗で 200 が返される', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { POST } = await import('../route');

        const invalidBody = JSON.stringify({ type: 'unknown_type', foo: 'bar' });
        const response = await POST(makeRequest(invalidBody));

        expect(response.status).toBe(200);
        expect(mockAfter).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('verifySignature に正しい引数が渡される', async () => {
        const { POST } = await import('../route');

        await POST(makeRequest(eventCallbackBody));

        expect(mockVerifySignature).toHaveBeenCalledWith({
            body: eventCallbackBody,
            timestamp: '1234567890',
            signature: 'v0=test-signature',
            signingSecret: 'test-signing-secret',
        });
    });
});
