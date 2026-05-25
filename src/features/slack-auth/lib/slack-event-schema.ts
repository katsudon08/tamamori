import { z } from 'zod';

// --- イベント内部スキーマ ---

const messageEventSchema = z.object({
    type: z.literal('message'),
    subtype: z.string().optional(),
    user: z.string(),
    text: z.string(),
    channel: z.string(),
    ts: z.string(),
});

const reactionAddedEventSchema = z.object({
    type: z.literal('reaction_added'),
    user: z.string(),
    reaction: z.string(),
    item: z.object({
        type: z.string(),
        channel: z.string(),
        ts: z.string(),
    }),
});

const innerEventSchema = z.discriminatedUnion('type', [
    messageEventSchema,
    reactionAddedEventSchema,
]);

// --- トップレベルスキーマ ---

const urlVerificationSchema = z.object({
    type: z.literal('url_verification'),
    challenge: z.string(),
    token: z.string(),
});

const eventCallbackSchema = z.object({
    type: z.literal('event_callback'),
    event_id: z.string(),
    team_id: z.string(),
    event: innerEventSchema,
});

export const slackEventSchema = z.discriminatedUnion('type', [
    urlVerificationSchema,
    eventCallbackSchema,
]);

export type SlackEvent = z.infer<typeof slackEventSchema>;
export type UrlVerification = z.infer<typeof urlVerificationSchema>;
export type EventCallback = z.infer<typeof eventCallbackSchema>;
export type MessageEvent = z.infer<typeof messageEventSchema>;
export type ReactionAddedEvent = z.infer<typeof reactionAddedEventSchema>;
