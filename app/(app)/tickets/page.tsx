import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { TicketList } from "@/components/tickets/ticket-list";
import type { Property, Ticket, TicketStatus, TicketType } from "@/lib/types/database";

interface TicketsPageProps {
  searchParams: {
    status?: string;
    property?: string;
    type?: string;
    q?: string;
  };
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const { businessId } = await getCurrentBusiness();
  const supabase = createClient();

  let ticketsQuery = supabase
    .from("tickets")
    .select("*, property:properties(id, name, address, housekeeping_status, business_id, created_at), assigned_staff:app_users!assigned_to(name), label:issue_labels!label_id(id, label_name)")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  if (searchParams.status) ticketsQuery = ticketsQuery.eq("status", searchParams.status);
  if (searchParams.property) ticketsQuery = ticketsQuery.eq("property_id", searchParams.property);
  if (searchParams.type) ticketsQuery = ticketsQuery.eq("type", searchParams.type);
  if (searchParams.q?.trim()) {
    const q = searchParams.q.trim().replace(/[%_,]/g, " ");
    ticketsQuery = ticketsQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const [{ data: properties }, { data: tickets }] = await Promise.all([
    supabase.from("properties").select("id, name").eq("business_id", businessId).order("name"),
    ticketsQuery,
  ]);

  return (
    <TicketList
      tickets={(tickets as Ticket[]) ?? []}
      properties={(properties as Pick<Property, "id" | "name">[]) ?? []}
      activeStatus={(searchParams.status as TicketStatus) ?? null}
      activeProperty={searchParams.property ?? null}
      activeType={(searchParams.type as TicketType) ?? null}
      query={searchParams.q ?? ""}
      canCreate
    />
  );
}
