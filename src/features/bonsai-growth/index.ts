// Public API
export { classifyEvent, findThanksKeyword, type SlackInnerEvent } from './lib/classify-event';
export { hashForBranch } from './lib/hash';
export { getNextStageThresholds } from './lib/get-next-stage-thresholds';
export { determineStage, computeVisualState, type Counters } from './model/growth-engine';
export { fetchGrowthRules, type GrowthRule } from './model/growth-rules';
export { processSlackEvent } from './api/process-event';
