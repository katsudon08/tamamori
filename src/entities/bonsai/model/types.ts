import { z } from 'zod';

export const growthStageSchema = z.enum([
    'seed',
    'sprout',
    'young',
    'branching',
    'leafy',
    'budding',
    'flowering',
    'full_bloom',
]);

export const branchSchema = z.object({
    angle: z.number(),
    length: z.number(),
    depth: z.number().int(),
    seed: z.number(),
});

export const visualStateSchema = z.object({
    trunkHeight: z.number(),
    trunkThickness: z.number(),
    branches: z.array(branchSchema),
    leaves: z.number().int(),
    leafColor: z.string(),
    flowers: z.number().int(),
    flowerColor: z.string(),
    potColor: z.string(),
});

export const bonsaiSchema = z.object({
    id: z.uuid(),
    user_id: z.uuid(),
    total_messages: z.number().int(),
    total_reactions: z.number().int(),
    total_thanks: z.number().int(),
    growth_stage: growthStageSchema,
    visual_state: visualStateSchema,
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
});

export type GrowthStage = z.infer<typeof growthStageSchema>;
export type Branch = z.infer<typeof branchSchema>;
export type BonsaiVisualState = z.infer<typeof visualStateSchema>;
export type Bonsai = z.infer<typeof bonsaiSchema>;
