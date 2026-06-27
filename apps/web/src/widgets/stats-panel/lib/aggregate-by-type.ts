import type { ActionLog, ActionType } from "@/entities/action";

export type ActionTypeSummary = {
  type: ActionType;
  label: string;
  count: number;
};

const TYPE_LABELS: Record<ActionType, string> = {
  message: "メッセージ",
  reaction: "リアクション",
  thanks: "感謝",
};

const TYPE_ORDER: ActionType[] = ["message", "reaction", "thanks"];

export function aggregateByType(actions: ActionLog[]): ActionTypeSummary[] {
  const counts: Record<ActionType, number> = { message: 0, reaction: 0, thanks: 0 };

  for (const action of actions) {
    counts[action.action_type] += 1;
  }

  return TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    count: counts[type],
  }));
}
