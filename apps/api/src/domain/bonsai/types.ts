// 盆栽計算の型定義 (visual.md §8 / glossary.md §3)

// 成長段階の序数 (visual.md §2.1: 1..6 を一方向に進む)
export type Stage = 1 | 2 | 3 | 4 | 5 | 6;

// 季節 (visual.md §3: 現実の季節に同期。基準TZ=JST)
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// 活動種別ごとのカウント (db.md §3.3: activity_logs 由来の集計)
export type ActivityCounts = { message: number; reaction: number; thanks: number };
