// 成長ルールの定数を1か所に集約する単一の正 (ADR-006 / visual.md §2.1)
// DB にルール用テーブルは設けず、ここが唯一の定義元。

// 活動種別ごとの重み。頻出する活動ほど小さく、稀な活動ほど大きい (ADR-006 §Decision: 重み付き単一スコア方式)
export const ACTIVITY_WEIGHTS = { message: 1, reaction: 2, thanks: 4 } as const;

// STAGE_THRESHOLDS[i] = stage(i+1) に到達するのに必要な最小 activity_score (visual.md §2.1)
export const STAGE_THRESHOLDS = [0, 40, 100, 260, 650, 1300] as const;

// stage 番号 ↔ 名前ラベルの対応 (visual.md §2.1 の表)
export const STAGE_LABELS = [
  { stage: 1, key: 'seedling', label: '実生' },
  { stage: 2, key: 'young', label: '若木' },
  { stage: 3, key: 'trunk', label: '幹の成長' },
  { stage: 4, key: 'branching', label: '仕立て' },
  { stage: 5, key: 'mature', label: '成熟' },
  { stage: 6, key: 'refined', label: '風格' },
] as const;

// 活力の減衰パラメータ (visual.md §4: 加点的・非懲罰。0..1 で下限に留める)
export const VITALITY_HALF_LIFE_DAYS = 5;
export const VITALITY_FLOOR = 0.1;
