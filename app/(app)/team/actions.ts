"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";

export interface AssignedTicketResult {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  property: { name: string } | null;
}

export async function assignTicketToStaff(
  ticketId: string,
  staffId: string,
  staffName: string,
): Promise<AssignedTicketResult> {
  const { businessId, role, appUserId } = await getCurrentBusiness();
  if (role !== "admin") throw new Error("Not authorized");

  const supabase = createClient();

  const { data: adminUser } = await supabase
    .from("app_users")
    .select("name")
    .eq("id", appUserId)
    .single();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .update({ assigned_to: staffId, updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("business_id", businessId)
    .select("id, title, type, status, priority, property:properties(name)")
    .single();

  if (error || !ticket) throw new Error(error?.message ?? "Assignment failed");

  await supabase.from("ticket_activity").insert({
    ticket_id: ticketId,
    user_id: appUserId,
    action: "assigned",
    note: `Assigned to ${staffName} by ${adminUser?.name ?? "admin"}`,
  });

  revalidatePath("/team");
  revalidatePath(`/tickets/${ticketId}`);

  const rawProperty = ticket.property as unknown as { name: string }[] | null;

  return {
    id: ticket.id,
    title: ticket.title,
    type: ticket.type,
    status: ticket.status,
    priority: ticket.priority,
    property: Array.isArray(rawProperty) ? (rawProperty[0] ?? null) : rawProperty,
  } as AssignedTicketResult;
}

export async function unassignTicket(
  ticketId: string,
  staffId: string,
  staffName: string,
): Promise<void> {
  const { businessId, role, appUserId } = await getCurrentBusiness();
  if (role !== "admin") throw new Error("Not authorized");

  const supabase = createClient();

  const { data: adminUser } = await supabase
    .from("app_users")
    .select("name")
    .eq("id", appUserId)
    .single();

  const { error } = await supabase
    .from("tickets")
    .update({ assigned_to: null, updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("business_id", businessId);

  if (error) throw new Error(error.message);

  await supabase.from("ticket_activity").insert({
    ticket_id: ticketId,
    user_id: appUserId,
    action: "unassigned",
    note: `Unassigned from ${staffName} by ${adminUser?.name ?? "admin"}`,
  });

  revalidatePath("/team");
  revalidatePath(`/tickets/${ticketId}`);
}
