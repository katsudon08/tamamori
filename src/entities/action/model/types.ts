import { z } from 'zod';

export const actionTypeSchema = z.enum(['message', 'reaction', 'thanks']);

export const actionLogSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  action_type: actionTypeSchema,
  slack_event_id: z.string(),
  slack_channel: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime(),
});

export type ActionType = z.infer<typeof actionTypeSchema>;
export type ActionLog = z.infer<typeof actionLogSchema>;
