import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { aggregateDaily } from "../lib/aggregate-daily";
import type { ActionLog } from "@/entities/action";
import { EmptyState } from "@/shared/ui";

type GrowthTimelineProps = {
  actions: ActionLog[];
  className?: string;
};

const CHART_COLORS = {
  message: "var(--color-main)",
  reaction: "var(--color-sub)",
  thanks: "var(--color-accent)",
} as const;

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function GrowthTimeline({ actions, className }: GrowthTimelineProps) {
  const data = aggregateDaily(actions);

  if (data.length === 0) {
    return (
      <EmptyState
        title="データがありません"
        description="選択した期間にアクティビティがありません"
        className={className}
      />
    );
  }

  return (
    <figure className={className ?? ""} aria-label="日別アクティビティチャート">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-main-light)" />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{
              backgroundColor: "var(--background)",
              border: "1px solid var(--color-main-light)",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="message"
            name="メッセージ"
            stroke={CHART_COLORS.message}
            fill={CHART_COLORS.message}
            fillOpacity={0.3}
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="reaction"
            name="リアクション"
            stroke={CHART_COLORS.reaction}
            fill={CHART_COLORS.reaction}
            fillOpacity={0.3}
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="thanks"
            name="感謝"
            stroke={CHART_COLORS.thanks}
            fill={CHART_COLORS.thanks}
            fillOpacity={0.3}
            stackId="1"
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}
