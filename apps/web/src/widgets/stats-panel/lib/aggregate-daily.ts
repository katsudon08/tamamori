import type { ActionLog } from "@/entities/action";

export type DailyActivity = {
  date: string;
  message: number;
  reaction: number;
  thanks: number;
  total: number;
};

export function aggregateDaily(actions: ActionLog[]): DailyActivity[] {
  const map = new Map<string, { message: number; reaction: number; thanks: number }>();

  for (const action of actions) {
    const date = action.created_at.slice(0, 10);
    const entry = map.get(date) ?? { message: 0, reaction: 0, thanks: 0 };
    entry[action.action_type] += 1;
    map.set(date, entry);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      ...counts,
      total: counts.message + counts.reaction + counts.thanks,
    }));
}
