"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";

export async function createTicketAction(formData: FormData): Promise<string> {
  const { businessId, appUserId } = await getCurrentBusiness();
  const supabase = createClient();

  const propertyId = formData.get("property_id") as string;
  const type = formData.get("type") as string;
  const title = ((formData.get("title") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim() || null;
  const priority = formData.get("priority") as string;
  const assignedTo = (formData.get("assigned_to") as string) || null;
  const labelId = (formData.get("label_id") as string) || null;

  if (!propertyId || !type || !title || !priority) {
    throw new Error("Property, type, title, and priority are required");
  }

  const { data: newTicket, error } = await supabase.rpc("create_ticket_with_subtasks", {
    p_business_id: businessId,
    p_property_id: propertyId,
    p_title: title,
    p_description: description,
    p_type: type,
    p_priority: priority,
    p_created_by: appUserId,
    p_assigned_to: assignedTo,
    p_label_id: labelId,
  });

  if (error) throw new Error(error.message);

  const ticketId =
    typeof newTicket === "string"
      ? newTicket
      : (newTicket as { id?: string })?.id ?? null;

  if (!ticketId) throw new Error("Ticket was created but no ID was returned");

  revalidatePath("/dashboard");
  revalidatePath("/tickets");

  return ticketId;
}
