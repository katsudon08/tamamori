// Public API (apps/web: 表示に必要な部分のみ。
// Slack イベント変換/成長計算(process-event, growth-engine)は apps/api(#94) が担う)
export { getNextStageThresholds } from "./lib/get-next-stage-thresholds";
export { useGrowthRules, type GrowthRule } from "./model/growth-rules";
