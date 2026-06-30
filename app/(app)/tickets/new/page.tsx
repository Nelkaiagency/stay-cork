import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { NewTicketForm } from "@/components/tickets/new-ticket-form";
import { createTicketAction } from "./actions";
import type { Property, IssueLabel, AppUser } from "@/lib/types/database";

export default async function NewTicketPage() {
  const { businessId, role, appUserId } = await getCurrentBusiness();

  const supabase = createClient();

  const [propertiesRes, labelsRes, staffRes] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, property_type")
      .eq("business_id", businessId)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("issue_labels")
      .select("id, ticket_type, label_name")
      .eq("business_id", businessId)
      .order("label_name"),
    supabase
      .from("app_users")
      .select("id, name, role, skills")
      .eq("business_id", businessId)
      .in("role", ["maintenance", "housekeeping"])
      .order("name"),
  ]);

  const properties = (propertiesRes.data ?? []) as Pick<Property, "id" | "name" | "property_type">[];
  const labels = (labelsRes.data ?? []) as Pick<IssueLabel, "id" | "ticket_type" | "label_name">[];
  const staff = (staffRes.data ?? []) as Pick<AppUser, "id" | "name" | "role" | "skills">[];

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-900">New ticket</h1>
      <NewTicketForm
        properties={properties}
        labels={labels}
        staff={staff}
        isAdmin={role === "admin"}
        appUserId={appUserId}
        action={createTicketAction}
      />
    </div>
  );
}
