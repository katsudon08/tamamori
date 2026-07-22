import { describe, expect, it } from 'vitest';

import { vitality } from './vitality.js';

// 指数減衰 0.1..1、加点的・非懲罰 (visual.md §4 / half-life=5日, floor=0.1)
describe('vitality', () => {
  const now = new Date('2026-07-21T00:00:00Z');

  it('lastActiveAt=null は下限 0.1 (visual.md §4: 未活動でも枯れない)', () => {
    expect(vitality(now, null)).toBeCloseTo(0.1, 10);
  });

  it('当日 (elapsed 0) は約 1.0', () => {
    expect(vitality(now, new Date('2026-07-21T00:00:00Z'))).toBeCloseTo(1, 10);
  });

  it('5日後 = 0.55 (VITALITY_FLOOR + 0.9*0.5)', () => {
    // 半減期 5日 → 2**(-1) = 0.5、0.1 + 0.9*0.5 = 0.55
    const lastActiveAt = new Date('2026-07-16T00:00:00Z');
    expect(vitality(now, lastActiveAt)).toBeCloseTo(0.55, 10);
  });

  it('10日後 = 0.325 (2**(-2)=0.25、0.1 + 0.9*0.25)', () => {
    const lastActiveAt = new Date('2026-07-11T00:00:00Z');
    expect(vitality(now, lastActiveAt)).toBeCloseTo(0.325, 10);
  });

  it('十分に古い lastActiveAt でも下限 0.1 を割らない (visual.md §4: 非懲罰)', () => {
    const lastActiveAt = new Date('2000-01-01T00:00:00Z');
    const v = vitality(now, lastActiveAt);
    expect(v).toBeGreaterThanOrEqual(0.1);
    expect(v).toBeCloseTo(0.1, 5);
  });

  it('未来の lastActiveAt でも 1.0 を超えない (elapsed 負→0 クランプ)', () => {
    const future = new Date('2026-08-01T00:00:00Z');
    expect(vitality(now, future)).toBeCloseTo(1, 10);
  });
});
