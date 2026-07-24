"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

export interface StageDurationRow {
  stage_name: string;
  avg_hours: number;
  sample_size: number;
}

function fmtHours(h: number): string {
  if (h < 1) return "<1h";
  if (h < 24) return `${Math.round(h)}h`;
  const d = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  return rem > 0 ? `${d}d ${rem}h` : `${d}d`;
}

const tooltipStyle = {
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  fontSize: "12px",
  boxShadow: "0 1px 4px rgba(0,0,0,.06)",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row: StageDurationRow = payload[0].payload;
  return (
    <div style={tooltipStyle} className="bg-white px-3 py-2">
      <p className="font-semibold text-slate-700 text-xs mb-0.5">{row.stage_name}</p>
      <p className="text-slate-500 text-xs">{fmtHours(row.avg_hours)} avg · n={row.sample_size}</p>
    </div>
  );
}

export default function StageDurationChart({ data }: { data: StageDurationRow[] }) {
  const sorted = [...data].sort((a, b) => b.avg_hours - a.avg_hours);
  const barHeight = 36;
  const height = sorted.length * barHeight + 20;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={fmtHours}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          type="category"
          dataKey="stage_name"
          width={108}
          tick={{ fontSize: 11, fill: "#475569" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="avg_hours" radius={[0, 4, 4, 0]} label={{ position: "right", formatter: (v: unknown) => fmtHours(v as number), fontSize: 11, fill: "#94a3b8" }}>
          {sorted.map((_, i) => (
            <Cell key={i} fill="#6366f1" fillOpacity={1 - i * 0.07} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
