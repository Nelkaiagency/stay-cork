"use client";

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

export interface TrendRow {
  day: string;
  opened_count: number;
  resolved_count: number;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDay(day: string): string {
  const p = day.split("-");
  if (p.length < 3) return day;
  return `${MONTHS[parseInt(p[1]) - 1]} ${parseInt(p[2])}`;
}

const tooltipStyle = {
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  fontSize: "12px",
  boxShadow: "0 1px 4px rgba(0,0,0,.06)",
};

// Solid semi-transparent fills — avoids the SVG url(#id) cross-reference
// problem that causes gradient fills to silently fail in recharts 3.x
const OPENED_FILL   = "#3b82f620"; // blue-500 @ ~12% opacity
const RESOLVED_FILL = "#10b98120"; // emerald-500 @ ~12% opacity

export default function TicketTrendChart({ data }: { data: TrendRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={formatDay}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(label: unknown) => formatDay(String(label))}
          itemStyle={{ color: "#475569" }}
          cursor={{ stroke: "#e2e8f0" }}
        />
        <Legend
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: "12px", paddingTop: "10px", color: "#64748b" }}
        />
        <Area
          type="monotone"
          dataKey="opened_count"
          name="Opened"
          stroke="#3b82f6"
          strokeWidth={2}
          fill={OPENED_FILL}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="resolved_count"
          name="Resolved"
          stroke="#10b981"
          strokeWidth={2}
          fill={RESOLVED_FILL}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
