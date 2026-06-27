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

  // Fetch properties for filter dropdown
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .eq("business_id", businessId)
    .order("name");

  // Build ticket query with optional filters
  let query = supabase
    .from("tickets")
    .select("*, property:properties(id, name, address, housekeeping_status, business_id, created_at), assigned_staff:app_users!assigned_to(name)")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }
  if (searchParams.property) {
    query = query.eq("property_id", searchParams.property);
  }

  const { data: tickets } = await query;

  return (
    <TicketList
      tickets={(tickets as Ticket[]) ?? []}
      properties={(properties as Pick<Property, "id" | "name">[]) ?? []}
      activeStatus={(searchParams.status as TicketStatus) ?? null}
      activeProperty={searchParams.property ?? null}
    />
  );
}
