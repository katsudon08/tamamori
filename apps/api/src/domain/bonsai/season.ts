import type { Season } from './types.js';

// JST は UTC+9。getTime() はミリ秒基準のため 9 時間をミリ秒に変換したオフセット
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// レスポンス時刻から季節を導出する (visual.md §3 / §8: 基準TZ=JST。TZライブラリは使わない)
// now はすべて引数で受け取る（ADR-008: domain は純粋。new Date() を呼ばない）
export function season(now: Date): Season {
  // JST (UTC+9) の月を求める。getMonth は実行環境TZ依存のため使わず、
  // now を JST 分ずらした時刻の getUTCMonth を用いる
  const jstMonth = new Date(now.getTime() + JST_OFFSET_MS).getUTCMonth() + 1;

  if (jstMonth >= 3 && jstMonth <= 5) return 'spring';
  if (jstMonth >= 6 && jstMonth <= 8) return 'summer';
  if (jstMonth >= 9 && jstMonth <= 11) return 'autumn';
  return 'winter'; // 12 / 1 / 2
}
