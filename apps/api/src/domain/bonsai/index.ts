// 盆栽ドメイン（成長ルール・計算）の barrel re-export (ADR-008: domain は純粋コア)

export type { ActivityCounts, Season, Stage } from './types.js';

export {
  ACTIVITY_WEIGHTS,
  STAGE_LABELS,
  STAGE_THRESHOLDS,
  VITALITY_FLOOR,
  VITALITY_HALF_LIFE_DAYS,
} from './rules.js';

export { activityScore } from './activity-score.js';
export { resolveStage, stageFromScore } from './stage.js';
export { vitality } from './vitality.js';
export { seed } from './seed.js';
export { season } from './season.js';
