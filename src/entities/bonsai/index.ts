// Public API
export { growthStageSchema, branchSchema, visualStateSchema, bonsaiSchema } from './model/types';
export { getBonsaiByUserId, createBonsai, updateBonsai } from './api/bonsai-api';
export { useBonsai, useAllBonsai } from './api/bonsai-swr';
export { StageIndicator } from './ui/StageIndicator';
export { BonsaiProgressBar } from './ui/BonsaiProgressBar';

export type { GrowthStage, Branch, BonsaiVisualState, Bonsai } from './model/types';
