import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { TeamView, type TeamStaffMember } from "@/components/team/team-view";
import { type CardTicket, type CardSubtask, type UnassignedTicket } from "@/components/team/team-member-card";
import { type Ticket, type TicketType } from "@/lib/types/database";

type RawTicket = Ticket & { property: { name: string } | null };

interface RawCardSubtask {
  id: string;
  title: string;
  assigned_to: string;
  status: "not_started" | "in_progress" | "blocked";
  ticket: {
    id: string;
    title: string;
    type: string;
    property: { name: string } | null;
  };
}

export default async function TeamPage() {
  const { businessId, role } = await getCurrentBusiness();
  if (role !== "admin") notFound();

  const supabase = createClient();

  const [{ data: staffData }, { data: ticketData }, { data: unassignedData }, { data: subtaskData }] =
    await Promise.all([
      supabase
        .from("app_users")
        .select("id, name, role, email, skills")
        .eq("business_id", businessId)
        .in("role", ["maintenance", "housekeeping"])
        .order("name"),

      // Active ticket-level assignments
      supabase
        .from("tickets")
        .select("id, title, status, priority, type, assigned_to, property:properties(name)")
        .eq("business_id", businessId)
        .in("status", ["open", "in_progress"])
        .not("assigned_to", "is", null)
        .order("updated_at", { ascending: false }),

      // Unassigned tickets — pick up property name for optimistic display
      supabase
        .from("tickets")
        .select("id, title, type, status, priority, property:properties(name)")
        .eq("business_id", businessId)
        .in("status", ["open", "in_progress"])
        .is("assigned_to", null)
        .order("title"),

      // Per-stage subtask assignments (renovation tickets)
      supabase
        .from("ticket_subtasks")
        .select("id, title, assigned_to, status, ticket:tickets!ticket_id(id, title, type, property:properties(name))")
        .in("status", ["not_started", "in_progress", "blocked"])
        .not("assigned_to", "is", null),
    ]);

  const staff = (staffData ?? []) as Omit<TeamStaffMember, "tickets" | "subtasks">[];
  const tickets = (ticketData ?? []) as unknown as RawTicket[];
  const unassigned = (unassignedData ?? []) as unknown as UnassignedTicket[];
  const subtasks = (subtaskData ?? []) as unknown as RawCardSubtask[];

  // Partition unassigned by type scope
  const maintenanceUnassigned = unassigned.filter((t) =>
    (["maintenance", "renovation"] as TicketType[]).includes(t.type)
  );
  const housekeepingUnassigned = unassigned.filter((t) => t.type === "housekeeping");

  // Index active tickets by assignee
  const ticketsByUser = new Map<string, CardTicket[]>();
  for (const t of tickets) {
    if (!t.assigned_to) continue;
    if (!ticketsByUser.has(t.assigned_to)) ticketsByUser.set(t.assigned_to, []);
    ticketsByUser.get(t.assigned_to)!.push({
      id: t.id,
      title: t.title,
      type: t.type,
      status: t.status,
      priority: t.priority,
      property: (t.property as { name: string } | null) ?? null,
    });
  }

  // Index active stage assignments (subtasks) by assignee
  const subtasksByUser = new Map<string, CardSubtask[]>();
  for (const s of subtasks) {
    if (!subtasksByUser.has(s.assigned_to)) subtasksByUser.set(s.assigned_to, []);
    subtasksByUser.get(s.assigned_to)!.push({
      id: s.id,
      title: s.title,
      status: s.status,
      ticket: {
        id: s.ticket.id,
        title: s.ticket.title,
        property: s.ticket.property,
      },
    });
  }

  const maintenanceStaff: TeamStaffMember[] = staff
    .filter((s) => s.role === "maintenance")
    .map((s) => ({ ...s, tickets: ticketsByUser.get(s.id) ?? [], subtasks: subtasksByUser.get(s.id) ?? [] }));

  const housekeepingStaff: TeamStaffMember[] = staff
    .filter((s) => s.role === "housekeeping")
    .map((s) => ({ ...s, tickets: ticketsByUser.get(s.id) ?? [], subtasks: subtasksByUser.get(s.id) ?? [] }));

  return (
    <TeamView
      maintenanceStaff={maintenanceStaff}
      housekeepingStaff={housekeepingStaff}
      maintenanceUnassigned={maintenanceUnassigned}
      housekeepingUnassigned={housekeepingUnassigned}
      totalActive={tickets.length + subtasks.length}
    />
  );
}
