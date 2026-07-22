import { describe, expect, it } from 'vitest';

import { activityScore } from './activity-score.js';

// 重み付き和 (ADR-006 §Decision: message=1, reaction=2, thanks=4)
describe('activityScore', () => {
  it('全て0なら0 (visual.md §2.3: 生カウントは競争的に見せないが計算の基点)', () => {
    expect(activityScore({ message: 0, reaction: 0, thanks: 0 })).toBe(0);
  });

  it('代表値 message10/reaction4/thanks1 = 10+8+4 = 22 (ADR-006 重み付き和)', () => {
    expect(activityScore({ message: 10, reaction: 4, thanks: 1 })).toBe(22);
  });

  it('各種別の重みが個別に効く (ADR-006: message=1)', () => {
    expect(activityScore({ message: 3, reaction: 0, thanks: 0 })).toBe(3);
  });

  it('各種別の重みが個別に効く (ADR-006: reaction=2)', () => {
    expect(activityScore({ message: 0, reaction: 3, thanks: 0 })).toBe(6);
  });

  it('各種別の重みが個別に効く (ADR-006: thanks=4)', () => {
    expect(activityScore({ message: 0, reaction: 0, thanks: 3 })).toBe(12);
  });
});
