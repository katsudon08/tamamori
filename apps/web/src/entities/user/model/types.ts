import { z } from "zod";

export const userSchema = z.object({
  id: z.uuid(),
  slack_user_id: z.string(),
  slack_team_id: z.string(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;
