import { VITALITY_FLOOR, VITALITY_HALF_LIFE_DAYS } from './rules.js';

// getTime() はミリ秒基準。経過日数の算出に用いる 1 日のミリ秒数
const MS_PER_DAY = 86_400_000;

// 最終活動時刻からの指数減衰として活力を 0.1..1 で算出する (visual.md §4: 加点的・非懲罰)
// now / lastActiveAt はすべて引数で受け取る（ADR-008: domain は純粋。new Date() を呼ばない）
export function vitality(now: Date, lastActiveAt: Date | null): number {
  // 未活動でも枯れず、穏やかな下限値に留める (visual.md §4)
  if (lastActiveAt === null) return VITALITY_FLOOR;

  // 未来の lastActiveAt でも 1.0 を超えないよう 0 でクランプする
  const elapsedDays = Math.max(0, (now.getTime() - lastActiveAt.getTime()) / MS_PER_DAY);

  // 下限 VITALITY_FLOOR + 半減期 VITALITY_HALF_LIFE_DAYS の指数減衰
  return VITALITY_FLOOR + (1 - VITALITY_FLOOR) * 2 ** (-elapsedDays / VITALITY_HALF_LIFE_DAYS);
}
