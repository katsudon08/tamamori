import { describe, expect, it } from 'vitest';

import { seed } from './seed.js';

// FNV-1a 32bit の決定論的シード (visual.md §5: user_id から決定論的に算出、保存しない)
describe('seed', () => {
  const userId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const other = '9a8b7c6d-5e4f-3a2b-1c0d-0e1f2a3b4c5d';

  it('同一 userId は同値を返す（決定論的）', () => {
    expect(seed(userId)).toBe(seed(userId));
  });

  it('別 userId は別値を返す（個体差）', () => {
    expect(seed(userId)).not.toBe(seed(other));
  });

  it('非負の値を返す (uint32: 0..4294967295)', () => {
    expect(seed(userId)).toBeGreaterThanOrEqual(0);
    expect(seed(other)).toBeGreaterThanOrEqual(0);
  });

  it('整数を返す (Number.isInteger)', () => {
    expect(Number.isInteger(seed(userId))).toBe(true);
    expect(Number.isInteger(seed(other))).toBe(true);
  });

  it('uint32 の範囲内 (0..4294967295)', () => {
    expect(seed(userId)).toBeLessThanOrEqual(4_294_967_295);
  });

  it('空文字列は FNV-1a offset basis の uint32 = 2166136261', () => {
    expect(seed('')).toBe(2_166_136_261);
  });
});
