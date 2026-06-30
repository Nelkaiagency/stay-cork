"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export interface BreakdownRow {
  dimension: string;
  label: string;
  count: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low:  "#94a3b8",
};

const TYPE_COLORS: Record<string, string> = {
  maintenance:  "#6366f1",
  renovation:   "#f59e0b",
  housekeeping: "#10b981",
};

const tooltipStyle = {
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  fontSize: "12px",
  boxShadow: "0 1px 4px rgba(0,0,0,.06)",
};

function DonutChart({
  data,
  colors,
}: {
  data: { label: string; count: number }[];
  colors: Record<string, string>;
}) {
  if (!data.length) return <p className="text-xs text-slate-400 py-4 text-center">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={190}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="45%"
          innerRadius={44}
          outerRadius={68}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell key={entry.label} fill={colors[entry.label] ?? "#cbd5e1"} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#475569" }} />
        <Legend
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: "11px", color: "#64748b" }}
          formatter={(v) => v.replace(/_/g, " ")}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function TicketBreakdownCharts({ data }: { data: BreakdownRow[] }) {
  const priorityData = data
    .filter((d) => d.dimension === "priority")
    .map(({ label, count }) => ({ label, count }));

  const typeData = data
    .filter((d) => d.dimension === "type")
    .map(({ label, count }) => ({ label, count }));

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          By Priority
        </p>
        <DonutChart data={priorityData} colors={PRIORITY_COLORS} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          By Type
        </p>
        <DonutChart data={typeData} colors={TYPE_COLORS} />
      </div>
    </div>
  );
}
