import type { ActivityCounts } from './types.js';

import { ACTIVITY_WEIGHTS } from './rules.js';

// 活動カウントから activity_score を重み付き和で算出する (ADR-006 §Decision: 重み付き単一スコア方式)
// = W.message*message + W.reaction*reaction + W.thanks*thanks（整数）
export function activityScore(counts: ActivityCounts): number {
  return (
    ACTIVITY_WEIGHTS.message * counts.message +
    ACTIVITY_WEIGHTS.reaction * counts.reaction +
    ACTIVITY_WEIGHTS.thanks * counts.thanks
  );
}
