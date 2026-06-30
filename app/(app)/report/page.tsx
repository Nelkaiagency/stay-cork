import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { AlertCircle } from "lucide-react";

interface BusinessReport {
  open_tickets: number;
  in_progress_tickets: number;
  done_tickets_this_week: number;
  avg_resolution_hours: number | null;
  urgent_open: number;
  properties_dirty: number;
  properties_clean: number;
  staff_with_open_assignments: number;
}

function formatHours(hours: number | null): string {
  if (!hours) return "—";
  if (hours < 1) return "<1 hr";
  if (hours < 24) return `${Math.round(hours)} hrs`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "urgent" | "success" | "warning";
}

function StatCard({ label, value, sub, accent = "default" }: StatCardProps) {
  const accentClass = {
    default: "text-slate-900",
    urgent: "text-red-600",
    success: "text-emerald-600",
    warning: "text-amber-600",
  }[accent];

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">{label}</p>
      <span className={`text-3xl font-bold leading-none ${accentClass}`}>{value}</span>
      {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export default async function ReportPage() {
  const { businessId } = await getCurrentBusiness();
  const supabase = createClient();

  const { data: rawData, error } = await supabase
    .rpc("get_business_report", { p_business_id: businessId });

  const report: BusinessReport | null = Array.isArray(rawData)
    ? (rawData[0] ?? null)
    : (rawData as BusinessReport | null);

  if (error || !report) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-slate-400 p-4">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm">Report unavailable — {error?.message ?? "no data returned"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-900">Report</h1>

      {/* Tickets */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tickets</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Open" value={report.open_tickets} />
          <StatCard label="In Progress" value={report.in_progress_tickets} />
          <StatCard
            label="Done this week"
            value={report.done_tickets_this_week}
            accent="success"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Urgent open"
            value={report.urgent_open}
            accent={report.urgent_open > 0 ? "urgent" : "default"}
          />
          <StatCard
            label="Avg resolution"
            value={formatHours(report.avg_resolution_hours)}
            sub="time to close"
          />
        </div>
      </section>

      {/* Properties */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Properties</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Dirty"
            value={report.properties_dirty}
            accent={report.properties_dirty > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Clean"
            value={report.properties_clean}
            accent={report.properties_clean > 0 ? "success" : "default"}
          />
        </div>
      </section>

      {/* Staff */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Staff</h2>
        <div className="grid grid-cols-1 gap-3">
          <StatCard
            label="Staff with open assignments"
            value={report.staff_with_open_assignments}
            sub="team members with at least one open ticket"
          />
        </div>
      </section>
    </div>
  );
}
