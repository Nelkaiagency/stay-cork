import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CircleAlert,
  CircleCheck,
  Clock3,
  Info,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { formatDistanceToNow } from "@/lib/utils-date";
import type { TicketPriority, TicketStatus, TicketType } from "@/lib/types/database";
import type { TrendRow } from "@/components/analytics/ticket-trend-chart";

const TicketTrendChart = dynamic(
  () => import("@/components/analytics/ticket-trend-chart"),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse rounded-xl bg-slate-50" /> }
);

interface DashboardTicket {
  id: string;
  property_id: string;
  title: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  property: { id: string; name: string; housekeeping_status: string | null } | null;
  assigned_staff: { name: string } | null;
  label: { label_name: string } | null;
}

interface DashboardProperty {
  id: string;
  name: string;
  status: string | null;
  housekeeping_status: string | null;
  capacity: number | null;
}

function badgeClasses(status: TicketStatus) {
  if (status === "done") return "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
  if (status === "in_progress") return "bg-blue-50 text-blue-700 ring-blue-600/10";
  if (status === "blocked") return "bg-red-50 text-red-700 ring-red-600/10";
  return "bg-slate-100 text-slate-700 ring-slate-500/10";
}

function priorityClasses(priority: TicketPriority) {
  if (priority === "urgent") return "bg-red-50 text-red-700";
  if (priority === "high") return "bg-orange-50 text-orange-700";
  if (priority === "medium") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function typeLabel(type: TicketType) {
  if (type === "housekeeping") return "Housekeeping";
  if (type === "renovation") return "Renovation";
  return "Maintenance";
}

function propertyStatusLabel(status: string | null, housekeeping: string | null) {
  if (status === "under_construction") return { label: "Under renovation", className: "bg-amber-50 text-amber-700" };
  if (housekeeping === "dirty") return { label: "Needs cleaning", className: "bg-red-50 text-red-700" };
  return { label: "Operational", className: "bg-emerald-50 text-emerald-700" };
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: typeof BriefcaseBusiness;
  tone: "blue" | "amber" | "green" | "slate";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-950">{value}</span>
            <span className="truncate text-xs text-slate-400">{helper}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, children, tone = "green" }: { icon: typeof CircleCheck; children: React.ReactNode; tone?: "green" | "amber" | "blue" }) {
  const toneClass = tone === "amber" ? "text-amber-600" : tone === "blue" ? "text-blue-600" : "text-emerald-600";
  return (
    <div className="flex items-start gap-3 text-sm text-slate-700">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneClass}`} />
      <span>{children}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const { businessId, appUserId } = await getCurrentBusiness();
  const supabase = createClient();

  const [
    { data: ticketsRaw },
    { data: propertiesRaw },
    { data: currentUser },
    { data: trendRaw },
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, property_id, title, type, status, priority, created_at, updated_at, assigned_to, property:properties(id, name, housekeeping_status), assigned_staff:app_users!assigned_to(name), label:issue_labels!label_id(label_name)")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("properties")
      .select("id, name, status, housekeeping_status, capacity")
      .eq("business_id", businessId)
      .order("name"),
    supabase.from("app_users").select("name").eq("id", appUserId).single(),
    supabase.rpc("get_ticket_trend", { p_business_id: businessId, p_days: 30 }),
  ]);

  const tickets = (ticketsRaw ?? []) as unknown as DashboardTicket[];
  const properties = (propertiesRaw ?? []) as DashboardProperty[];
  const trend: TrendRow[] = ((trendRaw ?? []) as TrendRow[]).map((row) => ({
    day: row.day,
    opened_count: Number(row.opened_count),
    resolved_count: Number(row.resolved_count),
  }));

  const activeTickets = tickets.filter((ticket) => ticket.status !== "done");
  const blockedTickets = tickets.filter((ticket) => ticket.status === "blocked");
  const attentionTickets = activeTickets.filter(
    (ticket) => ticket.status === "blocked" || ticket.priority === "urgent" || ticket.priority === "high"
  );
  const activeAssignedStaff = new Set(activeTickets.map((ticket) => ticket.assigned_to).filter(Boolean));
  const activePropertyIds = new Set(activeTickets.map((ticket) => ticket.property_id));
  const renovationInProgress = tickets.filter((ticket) => ticket.type === "renovation" && ticket.status === "in_progress").length;
  const housekeepingActive = activeTickets.filter((ticket) => ticket.type === "housekeeping").length;

  const priorityScore: Record<TicketPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
  const priorityItems = [...attentionTickets]
    .sort((a, b) => {
      const blockedDiff = Number(b.status === "blocked") - Number(a.status === "blocked");
      if (blockedDiff !== 0) return blockedDiff;
      const priorityDiff = priorityScore[b.priority] - priorityScore[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })
    .slice(0, 4);

  const propertyCounts = new Map<string, number>();
  activeTickets.forEach((ticket) => propertyCounts.set(ticket.property_id, (propertyCounts.get(ticket.property_id) ?? 0) + 1));
  const topProperties = [...properties]
    .sort((a, b) => (propertyCounts.get(b.id) ?? 0) - (propertyCounts.get(a.id) ?? 0))
    .slice(0, 3);

  const latestJobs = activeTickets.slice(0, 5);
  const firstName = currentUser?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-full">
      {/* Mobile hero */}
      <section className="bg-[#0d2b54] px-4 pb-24 pt-5 text-white lg:hidden">
        <p className="text-sm text-blue-100/70">Operations overview</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Good morning, {firstName}</h2>
        <p className="mt-1 text-sm text-blue-100/75">Here&apos;s what&apos;s happening today.</p>
      </section>

      {/* Mobile dashboard */}
      <div className="relative -mt-16 space-y-4 px-4 pb-6 lg:hidden">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-900/5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-950">Today&apos;s Summary</h3>
            <span className="text-xs font-medium text-slate-400">Live</span>
          </div>
          <div className="mt-4 space-y-3">
            <SummaryRow icon={BriefcaseBusiness as typeof CircleCheck} tone="blue">
              {activeTickets.length} jobs are active across {activePropertyIds.size} properties.
            </SummaryRow>
            <SummaryRow icon={CircleAlert} tone="amber">
              {attentionTickets.length} jobs need attention{blockedTickets.length ? `, including ${blockedTickets.length} blocked` : ""}.
            </SummaryRow>
            <SummaryRow icon={Users}>
              {activeAssignedStaff.size} team members currently hold active assignments.
            </SummaryRow>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <BriefcaseBusiness className="h-5 w-5 text-blue-600" />
            <p className="mt-3 text-2xl font-semibold text-slate-950">{activeTickets.length}</p>
            <p className="text-[11px] font-medium text-slate-500">Active jobs</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <CircleAlert className="h-5 w-5 text-amber-600" />
            <p className="mt-3 text-2xl font-semibold text-slate-950">{attentionTickets.length}</p>
            <p className="text-[11px] font-medium text-slate-500">Attention</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <CircleCheck className="h-5 w-5 text-emerald-600" />
            <p className="mt-3 text-2xl font-semibold text-slate-950">{tickets.filter((ticket) => ticket.status === "done").length}</p>
            <p className="text-[11px] font-medium text-slate-500">Completed</p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-950">My Active Jobs</h3>
            <Link href="/tickets" className="text-xs font-semibold text-blue-600">View all</Link>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {latestJobs.slice(0, 3).map((ticket) => (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block py-3 first:pt-1 last:pb-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{ticket.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {ticket.property?.name ?? "Unknown property"}
                      {ticket.assigned_staff?.name ? ` · ${ticket.assigned_staff.name}` : ""}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${badgeClasses(ticket.status)}`}>
                    {ticket.status.replace("_", " ")}
                  </span>
                  {ticket.label?.label_name && (
                    <span className="truncate text-[10px] font-medium text-slate-400">{ticket.label.label_name}</span>
                  )}
                  <span className="ml-auto text-[10px] text-slate-400">{formatDistanceToNow(ticket.updated_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <Link
          href="/tickets/new"
          className="flex h-12 items-center justify-center rounded-2xl bg-[#0d2b54] text-sm font-semibold text-white shadow-sm"
        >
          Create new ticket
        </Link>
      </div>

      {/* Desktop dashboard */}
      <div className="hidden px-8 py-7 lg:block">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Active Jobs" value={activeTickets.length} helper={`${activePropertyIds.size} properties`} icon={BriefcaseBusiness} tone="blue" />
            <StatCard label="Needs Attention" value={attentionTickets.length} helper={blockedTickets.length ? `${blockedTickets.length} blocked` : "No blocked jobs"} icon={CircleAlert} tone="amber" />
            <StatCard label="Properties" value={properties.length} helper={`${properties.filter((property) => property.status === "active").length} active`} icon={Building2} tone="green" />
            <StatCard label="Staff Active" value={activeAssignedStaff.size} helper="with assigned work" icon={Users} tone="slate" />
          </div>

          <div className="grid grid-cols-12 gap-5">
            <section className="col-span-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Daily Operations Summary</h2>
                  <p className="mt-1 text-sm text-slate-500">A concise view of today&apos;s field operations.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">Live data</span>
              </div>
              <div className="mt-5 space-y-4">
                <SummaryRow icon={CircleCheck}>{activeTickets.length} jobs are currently active across {activePropertyIds.size} properties.</SummaryRow>
                <SummaryRow icon={CircleAlert} tone="amber">{attentionTickets.length} jobs need attention{blockedTickets.length ? `, including ${blockedTickets.length} blocked` : ""}.</SummaryRow>
                <SummaryRow icon={Info} tone="blue">{renovationInProgress} renovation jobs are currently in progress.</SummaryRow>
                <SummaryRow icon={Info} tone="blue">{housekeepingActive} housekeeping jobs are still active.</SummaryRow>
                <SummaryRow icon={Users}>{activeAssignedStaff.size} staff members currently have active assignments.</SummaryRow>
              </div>
              <p className="mt-6 text-xs italic text-slate-400">Updated from Stay Cork operations data</p>
            </section>

            <section className="col-span-7 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Priority Items</h2>
                  <p className="mt-1 text-sm text-slate-500">Jobs most likely to need management attention.</p>
                </div>
                <Link href="/tickets" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View all</Link>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {priorityItems.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">No priority items right now.</div>
                ) : (
                  priorityItems.map((ticket) => (
                    <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="flex items-center gap-3 py-3.5 transition hover:bg-slate-50/70">
                      <CircleAlert className={`h-4 w-4 shrink-0 ${ticket.priority === "urgent" || ticket.status === "blocked" ? "text-red-500" : "text-amber-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{ticket.title}</p>
                          {ticket.label?.label_name && (
                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{ticket.label.label_name}</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {ticket.property?.name ?? "Unknown property"}
                          {ticket.assigned_staff?.name ? ` · ${ticket.assigned_staff.name}` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${priorityClasses(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className="w-14 text-right text-xs text-slate-400">{formatDistanceToNow(ticket.updated_at)}</span>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-12 gap-5">
            <section className="col-span-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Property Overview</h2>
                  <p className="mt-1 text-sm text-slate-500">The properties carrying the most active work.</p>
                </div>
                <Link href="/properties" className="text-xs font-semibold text-blue-600">View all</Link>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {topProperties.map((property) => {
                  const state = propertyStatusLabel(property.status, property.housekeeping_status);
                  return (
                    <Link key={property.id} href={`/properties/${property.id}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{property.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{property.capacity ? `Capacity ${property.capacity}` : "Property"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${state.className}`}>{state.label}</span>
                      <div className="min-w-[76px] text-right">
                        <p className="text-sm font-semibold text-slate-900">{propertyCounts.get(property.id) ?? 0}</p>
                        <p className="text-[10px] text-slate-400">active jobs</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="col-span-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Open vs Resolved</h2>
                  <p className="mt-1 text-sm text-slate-500">Ticket volume over the last 30 days.</p>
                </div>
                <span className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500">Last 30 days</span>
              </div>
              <div className="mt-4">
                <TicketTrendChart data={trend} />
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Current Jobs</h2>
                <p className="mt-0.5 text-sm text-slate-500">Most recently updated active work.</p>
              </div>
              <Link href="/tickets" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                View all tickets <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Ticket</th>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Assigned to</th>
                    <th className="px-6 py-3 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestJobs.map((ticket) => (
                    <tr key={ticket.id} className="text-sm transition hover:bg-slate-50/70">
                      <td className="px-6 py-3.5">
                        <Link href={`/tickets/${ticket.id}`} className="font-semibold text-slate-900 hover:text-blue-700">{ticket.title}</Link>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{ticket.property?.name ?? "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600">{typeLabel(ticket.type)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ring-1 ring-inset ${badgeClasses(ticket.status)}`}>
                          {ticket.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${priorityClasses(ticket.priority)}`}>{ticket.priority}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{ticket.assigned_staff?.name ?? "Unassigned"}</td>
                      <td className="px-6 py-3.5 text-right text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDistanceToNow(ticket.updated_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
