import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { TicketList } from "@/components/tickets/ticket-list";
import { type Ticket, type Property, type TicketStatus } from "@/lib/types/database";

interface DashboardPageProps {
  searchParams: { status?: string; property?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { businessId } = await getCurrentBusiness();
  const supabase = createClient();

  let ticketsQuery = supabase
    .from("tickets")
    .select("*, property:properties(id, name, address, housekeeping_status, business_id, created_at), assigned_staff:app_users!assigned_to(name), label:issue_labels!label_id(id, label_name)")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  if (searchParams.status) ticketsQuery = ticketsQuery.eq("status", searchParams.status);
  if (searchParams.property) ticketsQuery = ticketsQuery.eq("property_id", searchParams.property);

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
      canCreate={true}
    />
  );
}
