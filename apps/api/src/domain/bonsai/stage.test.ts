import { describe, expect, it } from 'vitest';

import { resolveStage, stageFromScore } from './stage.js';

// 閾値判定 (visual.md §2.1 / STAGE_THRESHOLDS = [0, 40, 100, 260, 650, 1300])
describe('stageFromScore', () => {
  it('score=0 は stage1 (実生)', () => {
    expect(stageFromScore(0)).toBe(1);
  });

  it('閾値未満 39 は stage1 のまま（境界の手前）', () => {
    expect(stageFromScore(39)).toBe(1);
  });

  it('閾値ちょうど 40 で stage2 (若木) へ到達', () => {
    expect(stageFromScore(40)).toBe(2);
  });

  it('閾値ちょうど 100 で stage3 (幹の成長)', () => {
    expect(stageFromScore(100)).toBe(3);
  });

  it('閾値ちょうど 260 で stage4 (仕立て)', () => {
    expect(stageFromScore(260)).toBe(4);
  });

  it('閾値手前 1299 は stage5 (成熟) のまま（境界の手前）', () => {
    expect(stageFromScore(1299)).toBe(5);
  });

  it('閾値ちょうど 650 で stage5 (成熟)', () => {
    expect(stageFromScore(650)).toBe(5);
  });

  it('閾値ちょうど 1300 で stage6 (風格) へ到達', () => {
    expect(stageFromScore(1300)).toBe(6);
  });

  it('閾値を大きく超えても最大 stage6 に留まる (visual.md §2.1: 到達点は 6)', () => {
    expect(stageFromScore(99_999)).toBe(6);
  });
});

// 単調・不可逆ガード (visual.md §2: 成長段階は単調・不可逆、後退しない)
describe('resolveStage', () => {
  it('score が上がれば前 stage を超えて進む', () => {
    expect(resolveStage(2, 100)).toBe(3);
  });

  it('prev=5, score=0 でも 5 を下回らない（不可逆）', () => {
    expect(resolveStage(5, 0)).toBe(5);
  });

  it('閾値変更をまたいで下がっても前 stage を維持する (visual.md §2: 退化しない)', () => {
    // 現 score では stage2 相当でも、既に stage4 なら 4 を保つ
    expect(resolveStage(4, 40)).toBe(4);
  });

  it('前 stage と同じなら同じ stage を返す', () => {
    expect(resolveStage(3, 100)).toBe(3);
  });
});
