import type { Stage } from './types.js';

import { STAGE_THRESHOLDS } from './rules.js';

// activity_score から成長段階を閾値判定する (visual.md §2.1 / ADR-006)
// STAGE_THRESHOLDS を降順に走査し、score >= 閾値 を満たす最大の stage を返す
export function stageFromScore(score: number): Stage {
  for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= STAGE_THRESHOLDS[i]!) {
      // 配列インデックス i は stage(i+1) に対応 (STAGE_THRESHOLDS の定義より)
      return (i + 1) as Stage;
    }
  }
  // STAGE_THRESHOLDS[0] === 0 のため通常ここには到達しないが、型を満たすため最小 stage を返す
  return 1;
}

// 前 stage を下回らないよう単調・不可逆を保証する (visual.md §2: 成長段階は単調・不可逆、後退しない)
// = max(prevStage, stageFromScore(score))（閾値変更をまたいでも退化しない）
export function resolveStage(prevStage: Stage, score: number): Stage {
  const next = stageFromScore(score);
  return (next > prevStage ? next : prevStage) as Stage;
}
