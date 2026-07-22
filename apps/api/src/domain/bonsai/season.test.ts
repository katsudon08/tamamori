import { describe, expect, it } from 'vitest';

import { season } from './season.js';

// JST の月から季節を導出 (visual.md §3 / §8: 基準TZ=JST、TZライブラリ不使用)
// Date は UTC 指定 ('...Z') で作る。getUTCMonth を使うため実行環境TZに依存しない
describe('season', () => {
  it('5/31 (JST) は spring（月境界の手前）', () => {
    expect(season(new Date('2026-05-31T00:00:00Z'))).toBe('spring');
  });

  it('6/1 (JST) は summer（月境界）', () => {
    expect(season(new Date('2026-06-01T00:00:00Z'))).toBe('summer');
  });

  it('9/1 (JST) は autumn', () => {
    expect(season(new Date('2026-09-01T00:00:00Z'))).toBe('autumn');
  });

  it('12/1 (JST) は winter', () => {
    expect(season(new Date('2026-12-01T00:00:00Z'))).toBe('winter');
  });

  it('2/28 (JST) は winter', () => {
    expect(season(new Date('2026-02-28T00:00:00Z'))).toBe('winter');
  });

  it('3/1 (JST) は spring', () => {
    expect(season(new Date('2026-03-01T00:00:00Z'))).toBe('spring');
  });

  it('UTC→JST 変換: UTC 2026-05-31T15:00:00Z は JST で 6/1 0:00 → summer', () => {
    expect(season(new Date('2026-05-31T15:00:00Z'))).toBe('summer');
  });

  it('UTC→JST 変換: UTC 2026-05-31T14:59:59Z は JST でまだ 5/31 → spring', () => {
    expect(season(new Date('2026-05-31T14:59:59Z'))).toBe('spring');
  });

  it('UTC→JST 変換: 大晦日 UTC 2026-12-31T15:00:00Z は JST で 1/1 → winter', () => {
    expect(season(new Date('2026-12-31T15:00:00Z'))).toBe('winter');
  });
});
