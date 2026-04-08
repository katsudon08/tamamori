// Public API
export { classifyEvent, type SlackInnerEvent } from './lib/classify-event';
export { hashForBranch } from './lib/hash';
export { determineStage, computeVisualState, type Counters } from './model/growth-engine';
export { fetchGrowthRules, type GrowthRule } from './model/growth-rules';
