import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

const mockCheckEventExists = jest.fn<(id: string) => Promise<boolean>>().mockResolvedValue(false);
const mockInsertAction = jest
    .fn<(data: unknown) => Promise<Record<string, unknown>>>()
    .mockResolvedValue({ id: 'action-uuid' });

jest.mock('@/entities/action', () => ({
    checkEventExists: (...args: unknown[]) => mockCheckEventExists(...(args as [string])),
    insertAction: (...args: unknown[]) => mockInsertAction(...(args as [unknown])),
}));

const mockGetUserBySlackId = jest
    .fn<(id: string) => Promise<Record<string, string>>>()
    .mockResolvedValue({
        id: 'user-uuid-123',
        slack_user_id: 'U01XXXX',
        slack_team_id: 'T01XXXX',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
    });

jest.mock('@/entities/user', () => ({
    getUserBySlackId: (...args: unknown[]) => mockGetUserBySlackId(...(args as [string])),
}));

const mockGetBonsaiByUserId = jest
    .fn<(id: string) => Promise<Record<string, unknown>>>()
    .mockResolvedValue({
        id: 'bonsai-uuid-123',
        user_id: 'user-uuid-123',
        total_messages: 10,
        total_reactions: 5,
        total_thanks: 2,
        growth_stage: 'sprout',
        visual_state: {},
    });
const mockUpdateBonsai = jest
    .fn<(id: unknown, data: unknown) => Promise<Record<string, unknown>>>()
    .mockResolvedValue({ id: 'bonsai-uuid-123' });

jest.mock('@/entities/bonsai', () => ({
    getBonsaiByUserId: (...args: unknown[]) => mockGetBonsaiByUserId(...(args as [string])),
    updateBonsai: (...args: unknown[]) => mockUpdateBonsai(...(args as [unknown, unknown])),
}));

jest.mock('@/shared/config', () => ({
    env: {
        SLACK_WATCHED_CHANNELS: ['C01XXXX', 'C02XXXX'],
    },
}));

// fetchGrowthRules は DB を呼ぶためモック
jest.mock('../../model/growth-rules', () => ({
    fetchGrowthRules: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
        { id: '1', stage: 'seed', min_messages: 0, min_reactions: 0, min_thanks: 0, sort_order: 0 },
        {
            id: '2',
            stage: 'sprout',
            min_messages: 5,
            min_reactions: 0,
            min_thanks: 0,
            sort_order: 1,
        },
        {
            id: '3',
            stage: 'young',
            min_messages: 15,
            min_reactions: 5,
            min_thanks: 0,
            sort_order: 2,
        },
    ]),
}));

// --- helpers -------------------------------------------------------------

interface EventCallbackFixture {
    type: 'event_callback';
    event_id: string;
    team_id: string;
    event: Record<string, unknown>;
}

function makeMessagePayload(overrides: Partial<EventCallbackFixture> = {}): EventCallbackFixture {
    return {
        type: 'event_callback',
        event_id: 'Ev01XXXX',
        team_id: 'T01XXXX',
        event: {
            type: 'message',
            user: 'U01XXXX',
            text: '今日もがんばりましょう！',
            channel: 'C01XXXX',
            ts: '1234567890.123456',
        },
        ...overrides,
    };
}

function makeReactionPayload(overrides: Partial<EventCallbackFixture> = {}): EventCallbackFixture {
    return {
        type: 'event_callback',
        event_id: 'Ev02XXXX',
        team_id: 'T01XXXX',
        event: {
            type: 'reaction_added',
            user: 'U01XXXX',
            reaction: 'thumbsup',
            item: {
                type: 'message',
                channel: 'C01XXXX',
                ts: '1234567890.123456',
            },
        },
        ...overrides,
    };
}

function makeThanksPayload(): EventCallbackFixture {
    return makeMessagePayload({
        event: {
            type: 'message',
            user: 'U01XXXX',
            text: 'レビューありがとうございます！',
            channel: 'C01XXXX',
            ts: '1234567890.123456',
        },
    });
}

// --- tests ---------------------------------------------------------------

describe('processSlackEvent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCheckEventExists.mockResolvedValue(false);
        mockGetUserBySlackId.mockResolvedValue({
            id: 'user-uuid-123',
            slack_user_id: 'U01XXXX',
            slack_team_id: 'T01XXXX',
            display_name: 'Test User',
            avatar_url: 'https://example.com/avatar.png',
        });
        mockGetBonsaiByUserId.mockResolvedValue({
            id: 'bonsai-uuid-123',
            user_id: 'user-uuid-123',
            total_messages: 10,
            total_reactions: 5,
            total_thanks: 2,
            growth_stage: 'sprout',
            visual_state: {},
        });
    });

    test('監視対象外チャンネルのイベントはスキップされる', async () => {
        const { processSlackEvent } = await import('../process-event');

        const payload = makeMessagePayload({
            event: {
                type: 'message',
                user: 'U01XXXX',
                text: 'hello',
                channel: 'C_UNWATCHED',
                ts: '1234567890.123456',
            },
        });

        await processSlackEvent(payload as never);

        expect(mockCheckEventExists).not.toHaveBeenCalled();
        expect(mockInsertAction).not.toHaveBeenCalled();
    });

    test('重複イベントはスキップされる (冪等性)', async () => {
        mockCheckEventExists.mockResolvedValueOnce(true);
        const { processSlackEvent } = await import('../process-event');

        await processSlackEvent(makeMessagePayload() as never);

        expect(mockInsertAction).not.toHaveBeenCalled();
    });

    test('未登録ユーザーのイベントはスキップされる', async () => {
        const pgrst116 = Object.assign(new Error('not found'), { code: 'PGRST116' });
        mockGetUserBySlackId.mockRejectedValueOnce(pgrst116);
        const { processSlackEvent } = await import('../process-event');

        await processSlackEvent(makeMessagePayload() as never);

        expect(mockInsertAction).not.toHaveBeenCalled();
    });

    test('通常メッセージで message アクションが記録される', async () => {
        const { processSlackEvent } = await import('../process-event');

        await processSlackEvent(makeMessagePayload() as never);

        expect(mockInsertAction).toHaveBeenCalledTimes(1);
        expect(mockInsertAction).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-uuid-123',
                action_type: 'message',
                slack_event_id: 'Ev01XXXX',
                slack_channel: 'C01XXXX',
            }),
        );
    });

    test('感謝メッセージで message + thanks の2つのアクションが記録される', async () => {
        const { processSlackEvent } = await import('../process-event');

        await processSlackEvent(makeThanksPayload() as never);

        expect(mockInsertAction).toHaveBeenCalledTimes(2);
        expect(mockInsertAction).toHaveBeenCalledWith(
            expect.objectContaining({
                action_type: 'message',
                slack_event_id: 'Ev01XXXX',
            }),
        );
        expect(mockInsertAction).toHaveBeenCalledWith(
            expect.objectContaining({
                action_type: 'thanks',
                slack_event_id: 'Ev01XXXX_thanks',
            }),
        );
    });

    test('リアクションで reaction アクションが記録される', async () => {
        const { processSlackEvent } = await import('../process-event');

        await processSlackEvent(makeReactionPayload() as never);

        expect(mockInsertAction).toHaveBeenCalledTimes(1);
        expect(mockInsertAction).toHaveBeenCalledWith(
            expect.objectContaining({
                action_type: 'reaction',
                slack_event_id: 'Ev02XXXX',
                slack_channel: 'C01XXXX',
            }),
        );
    });

    test('通常メッセージで bonsai の total_messages が +1 される', async () => {
        const { processSlackEvent } = await import('../process-event');

        await processSlackEvent(makeMessagePayload() as never);

        expect(mockUpdateBonsai).toHaveBeenCalledWith(
            'bonsai-uuid-123',
            expect.objectContaining({
                total_messages: 11,
                total_reactions: 5,
                total_thanks: 2,
            }),
        );
    });

    test('感謝メッセージで total_messages +1 かつ total_thanks +1', async () => {
        const { processSlackEvent } = await import('../process-event');

        await processSlackEvent(makeThanksPayload() as never);

        expect(mockUpdateBonsai).toHaveBeenCalledWith(
            'bonsai-uuid-123',
            expect.objectContaining({
                total_messages: 11,
                total_thanks: 3,
            }),
        );
    });

    test('リアクションで total_reactions +1', async () => {
        const { processSlackEvent } = await import('../process-event');

        await processSlackEvent(makeReactionPayload() as never);

        expect(mockUpdateBonsai).toHaveBeenCalledWith(
            'bonsai-uuid-123',
            expect.objectContaining({
                total_reactions: 6,
            }),
        );
    });

    test('成長ステージが再判定される', async () => {
        const { processSlackEvent } = await import('../process-event');

        await processSlackEvent(makeMessagePayload() as never);

        expect(mockUpdateBonsai).toHaveBeenCalledWith(
            'bonsai-uuid-123',
            expect.objectContaining({
                growth_stage: expect.any(String),
            }),
        );
    });

    test('visual_state が再計算される', async () => {
        const { processSlackEvent } = await import('../process-event');

        await processSlackEvent(makeMessagePayload() as never);

        expect(mockUpdateBonsai).toHaveBeenCalledWith(
            'bonsai-uuid-123',
            expect.objectContaining({
                visual_state: expect.objectContaining({
                    trunkHeight: expect.any(Number),
                    trunkThickness: expect.any(Number),
                    branches: expect.any(Array),
                    leaves: expect.any(Number),
                    flowers: expect.any(Number),
                }),
            }),
        );
    });

    test('subtypeありメッセージ (bot等) はスキップされる', async () => {
        const { processSlackEvent } = await import('../process-event');

        const payload = makeMessagePayload({
            event: {
                type: 'message',
                subtype: 'bot_message',
                user: 'U01XXXX',
                text: 'bot message',
                channel: 'C01XXXX',
                ts: '1234567890.123456',
            },
        });

        await processSlackEvent(payload as never);

        expect(mockInsertAction).not.toHaveBeenCalled();
        expect(mockUpdateBonsai).not.toHaveBeenCalled();
    });

    test('DB エラーが発生してもクラッシュしない', async () => {
        mockInsertAction.mockRejectedValueOnce(new Error('DB connection failed'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { processSlackEvent } = await import('../process-event');

        await expect(processSlackEvent(makeMessagePayload() as never)).resolves.toBeUndefined();

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('bonsai レコード未存在でスキップされる', async () => {
        mockGetBonsaiByUserId.mockRejectedValueOnce(new Error('not found'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { processSlackEvent } = await import('../process-event');

        await expect(processSlackEvent(makeMessagePayload() as never)).resolves.toBeUndefined();

        expect(mockUpdateBonsai).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
