import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { aggregateByType } from "../lib/aggregate-by-type";
import type { ActionLog } from "@/entities/action";
import { EmptyState } from "@/shared/ui";

type ActionBreakdownProps = {
  actions: ActionLog[];
  className?: string;
};

const TYPE_COLORS: Record<string, string> = {
  message: "var(--color-main)",
  reaction: "var(--color-sub)",
  thanks: "var(--color-accent)",
};

export function ActionBreakdown({ actions, className }: ActionBreakdownProps) {
  const raw = aggregateByType(actions);
  const total = raw.reduce((sum, d) => sum + d.count, 0);
  const data = raw.map((d) => ({ ...d, fill: TYPE_COLORS[d.type] }));

  if (total === 0) {
    return (
      <EmptyState
        title="まだアクションがありません"
        description="Slackで活動するとここにアクション内訳が表示されます"
        className={className}
      />
    );
  }

  return (
    <div className={className ?? ""}>
      <div className="flex flex-wrap gap-4 mb-4">
        {data.map((d) => (
          <div key={d.type} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: TYPE_COLORS[d.type] }}
            />
            <span>{d.label}</span>
            <span className="font-medium">{d.count}</span>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={90} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--background)",
              border: "1px solid var(--color-main-light)",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="count" name="件数" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
