import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { StaffWorkloadList } from "@/components/analytics/staff-workload-list";
import type { TrendRow } from "@/components/analytics/ticket-trend-chart";
import type { StageDurationRow } from "@/components/analytics/stage-duration-chart";
import type { StaffWorkloadRow } from "@/components/analytics/staff-workload-list";
import type { BreakdownRow } from "@/components/analytics/ticket-breakdown-charts";

const TicketTrendChart = dynamic(
  () => import("@/components/analytics/ticket-trend-chart"),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);
const StageDurationChart = dynamic(
  () => import("@/components/analytics/stage-duration-chart"),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> }
);
const TicketBreakdownCharts = dynamic(
  () => import("@/components/analytics/ticket-breakdown-charts"),
  { ssr: false, loading: () => <ChartSkeleton height={190} /> }
);

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-lg bg-slate-50"
      style={{ height }}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>
    </section>
  );
}

export default async function AnalyticsPage() {
  const { businessId } = await getCurrentBusiness();
  const supabase = createClient();

  const [
    { data: trendRaw,     error: trendErr },
    { data: stagesRaw,    error: stagesErr },
    { data: workloadRaw,  error: workloadErr },
    { data: breakdownRaw, error: breakdownErr },
  ] = await Promise.all([
    supabase.rpc("get_ticket_trend", { p_business_id: businessId, p_days: 30 }),
    supabase.rpc("get_stage_durations", { p_business_id: businessId }),
    supabase.rpc("get_staff_workload", { p_business_id: businessId }),
    supabase.rpc("get_ticket_breakdown", { p_business_id: businessId }),
  ]);

  // Surface RPC errors to the server log so they're never silently swallowed
  if (trendErr)     console.error("[analytics] get_ticket_trend:",     trendErr.message);
  if (stagesErr)    console.error("[analytics] get_stage_durations:",   stagesErr.message);
  if (workloadErr)  console.error("[analytics] get_staff_workload:",    workloadErr.message);
  if (breakdownErr) console.error("[analytics] get_ticket_breakdown:",  breakdownErr.message);

  // Coerce all numeric fields to Number — Postgres bigint can arrive as a
  // string from the JS client, and recharts 3 does not auto-cast strings.
  const trend: TrendRow[] = ((trendRaw ?? []) as TrendRow[]).map((r) => ({
    day: r.day,
    opened_count:   Number(r.opened_count),
    resolved_count: Number(r.resolved_count),
  }));
  const stages   = (stagesRaw   ?? []) as StageDurationRow[];
  const workload = (workloadRaw ?? []) as StaffWorkloadRow[];
  const breakdown = (breakdownRaw ?? []) as BreakdownRow[];

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-900">Analytics</h1>

      <Section title={`Ticket trend — last 30 days${trend.length ? ` · ${trend.length} days` : ""}`}>
        <TicketTrendChart data={trend} />
      </Section>

      {stages.length > 0 && (
        <Section title="Avg stage duration">
          <StageDurationChart data={stages} />
        </Section>
      )}

      {workload.length > 0 && (
        <Section title="Staff workload">
          <StaffWorkloadList data={workload} />
        </Section>
      )}

      {breakdown.length > 0 && (
        <Section title="Ticket breakdown">
          <TicketBreakdownCharts data={breakdown} />
        </Section>
      )}
    </div>
  );
}
