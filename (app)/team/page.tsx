import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { type Ticket, type TicketPriority, type TicketStatus } from "@/lib/types/database";
import { StatusBadge } from "@/components/ui/badge";
import { Users, Wrench, Home, ChevronRight } from "lucide-react";

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low:    "bg-slate-100 text-slate-500",
  medium: "bg-amber-100 text-amber-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  skills: string[] | null;
  tickets: (Ticket & { property: { name: string } | null })[];
}

export default async function TeamPage() {
  const { businessId, role } = await getCurrentBusiness();
  if (role !== "admin") notFound();

  const supabase = createClient();

  const [{ data: staffData }, { data: ticketData }] = await Promise.all([
    supabase
      .from("app_users")
      .select("id, name, role, email, skills")
      .eq("business_id", businessId)
      .in("role", ["maintenance", "housekeeping"])
      .order("name"),
    supabase
      .from("tickets")
      .select("id, title, status, priority, type, assigned_to, property:properties(name)")
      .eq("business_id", businessId)
      .in("status", ["open", "in_progress"])
      .not("assigned_to", "is", null)
      .order("updated_at", { ascending: false }),
  ]);

  const staff = (staffData ?? []) as Omit<StaffMember, "tickets">[];
  const tickets = (ticketData ?? []) as unknown as (Ticket & { property: { name: string } | null })[];

  // Index tickets by assignee
  const ticketsByUser = new Map<string, typeof tickets>();
  for (const t of tickets) {
    if (!t.assigned_to) continue;
    if (!ticketsByUser.has(t.assigned_to)) ticketsByUser.set(t.assigned_to, []);
    ticketsByUser.get(t.assigned_to)!.push(t);
  }

  const maintenanceStaff: StaffMember[] = staff
    .filter((s) => s.role === "maintenance")
    .map((s) => ({ ...s, tickets: ticketsByUser.get(s.id) ?? [] }));

  const housekeepingStaff: StaffMember[] = staff
    .filter((s) => s.role === "housekeeping")
    .map((s) => ({ ...s, tickets: ticketsByUser.get(s.id) ?? [] }));

  function MemberCard({ member }: { member: StaffMember }) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900">{member.name}</p>
            {member.role === "maintenance" && member.skills && member.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {member.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--brand-primary)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              member.tickets.length > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {member.tickets.length} active
          </span>
        </div>

        {member.tickets.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-400 italic">No active tickets</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {member.tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {(t.property as { name: string } | null)?.name ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[t.priority]}`}>
                      {t.priority}
                    </span>
                    <StatusBadge status={t.status} />
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  function RoleSection({
    title,
    icon: Icon,
    members,
  }: {
    title: string;
    icon: React.ElementType;
    members: StaffMember[];
  }) {
    if (members.length === 0) return null;
    return (
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        </div>
        <div className="flex flex-col gap-3">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Team</h1>
        <span className="text-xs text-slate-500">
          {tickets.length} active ticket{tickets.length !== 1 ? "s" : ""}
        </span>
      </div>

      {staff.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <Users className="h-10 w-10" />
          <p className="text-sm">No staff members found</p>
        </div>
      ) : (
        <>
          <RoleSection title="Maintenance" icon={Wrench} members={maintenanceStaff} />
          <RoleSection title="Housekeeping" icon={Home} members={housekeepingStaff} />
        </>
      )}
    </div>
  );
}
