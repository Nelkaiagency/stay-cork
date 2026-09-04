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
  return <div className="w-full animate-pulse rounded-xl bg-slate-50" style={{ height }} />;
}

function Section({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function AnalyticsPage() {
  const { businessId } = await getCurrentBusiness();
  const supabase = createClient();

  const [
    { data: trendRaw, error: trendErr },
    { data: stagesRaw, error: stagesErr },
    { data: workloadRaw, error: workloadErr },
    { data: breakdownRaw, error: breakdownErr },
  ] = await Promise.all([
    supabase.rpc("get_ticket_trend", { p_business_id: businessId, p_days: 30 }),
    supabase.rpc("get_stage_durations", { p_business_id: businessId }),
    supabase.rpc("get_staff_workload", { p_business_id: businessId }),
    supabase.rpc("get_ticket_breakdown", { p_business_id: businessId }),
  ]);

  if (trendErr) console.error("[analytics] get_ticket_trend:", trendErr.message);
  if (stagesErr) console.error("[analytics] get_stage_durations:", stagesErr.message);
  if (workloadErr) console.error("[analytics] get_staff_workload:", workloadErr.message);
  if (breakdownErr) console.error("[analytics] get_ticket_breakdown:", breakdownErr.message);

  const trend: TrendRow[] = ((trendRaw ?? []) as TrendRow[]).map((row) => ({
    day: row.day,
    opened_count: Number(row.opened_count),
    resolved_count: Number(row.resolved_count),
  }));
  const stages = (stagesRaw ?? []) as StageDurationRow[];
  const workload = (workloadRaw ?? []) as StaffWorkloadRow[];
  const breakdown = (breakdownRaw ?? []) as BreakdownRow[];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mb-5 lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Operational trends, delays and workload.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Open vs Resolved" subtitle={`Last 30 days${trend.length ? ` · ${trend.length} days of data` : ""}`}>
          <TicketTrendChart data={trend} />
        </Section>

        {stages.length > 0 && (
          <Section title="Average Stage Duration" subtitle="Where renovation work is taking the longest">
            <StageDurationChart data={stages} />
          </Section>
        )}

        {workload.length > 0 && (
          <Section title="Staff Workload" subtitle="Active work by team member">
            <StaffWorkloadList data={workload} />
          </Section>
        )}

        {breakdown.length > 0 && (
          <Section title="Ticket Breakdown" subtitle="Current work split by type and status">
            <TicketBreakdownCharts data={breakdown} />
          </Section>
        )}
      </div>
    </div>
  );
}
