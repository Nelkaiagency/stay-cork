import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { HousekeepingView } from "@/components/housekeeping/housekeeping-view";
import { type Property, type HousekeepingChecklistItem, type Tenant } from "@/lib/types/database";

interface HousekeepingPageProps {
  params: { propertyId: string };
}

export default async function HousekeepingPage({ params }: HousekeepingPageProps) {
  const { businessId } = await getCurrentBusiness();
  const supabase = createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", params.propertyId)
    .eq("business_id", businessId)
    .single();

  if (!property) notFound();

  // Fetch each housekeeping_task for this property together with its
  // checklist items in one query, then flatten into a sorted list.
  const { data: tasksData } = await supabase
    .from("housekeeping_tasks")
    .select(`
      id,
      housekeeping_checklist_items (
        id,
        housekeeping_task_id,
        title,
        sequence_order,
        status
      )
    `)
    .eq("property_id", params.propertyId)
    .order("created_at", { ascending: true });

  const checklistItems: HousekeepingChecklistItem[] = (
    (tasksData ?? []) as Array<{
      id: string;
      housekeeping_checklist_items: HousekeepingChecklistItem[];
    }>
  )
    .flatMap((t) => t.housekeeping_checklist_items ?? [])
    .sort((a, b) => a.sequence_order - b.sequence_order);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, tenant_name, check_in_date, check_out_date, status, notes, business_id, property_id, created_at")
    .eq("property_id", property.id)
    .in("status", ["current", "upcoming"])
    .order("check_in_date", { ascending: true });

  return (
    <HousekeepingView
      property={property as Property}
      checklistItems={checklistItems}
      tenants={(tenants as Tenant[]) ?? []}
    />
  );
}
