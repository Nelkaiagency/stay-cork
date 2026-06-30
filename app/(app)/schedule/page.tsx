import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { ScheduleView } from "@/components/schedule/schedule-view";
import type { Shift, AppUser, Property, Ticket } from "@/lib/types/database";

interface SchedulePageProps {
  searchParams: { date?: string };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const { businessId, role } = await getCurrentBusiness();
  const supabase = createClient();
  const isAdmin = role === "admin";

  const today = new Date().toISOString().slice(0, 10);
  const raw = searchParams.date ?? today;
  const viewDate = DATE_RE.test(raw) ? raw : today;

  const [shiftsRes, staffRes, propertiesRes, ticketsRes] = await Promise.all([
    supabase
      .from("shifts")
      .select(
        "*, staff:app_users!app_user_id(name), property:properties!property_id(id,name), ticket:tickets!ticket_id(id,title)"
      )
      .eq("business_id", businessId)
      .eq("shift_date", viewDate)
      .order("start_time"),

    supabase
      .from("app_users")
      .select("id, name, role")
      .eq("business_id", businessId)
      .in("role", ["maintenance", "housekeeping"])
      .order("name"),

    supabase
      .from("properties")
      .select("id, name")
      .eq("business_id", businessId)
      .order("name"),

    supabase
      .from("tickets")
      .select("id, title, type")
      .eq("business_id", businessId)
      .in("status", ["open", "in_progress"])
      .order("title"),
  ]);

  const shifts = (shiftsRes.data ?? []) as Shift[];
  const staff = (staffRes.data ?? []) as Pick<AppUser, "id" | "name" | "role">[];
  const properties = (propertiesRes.data ?? []) as Pick<Property, "id" | "name">[];
  const tickets = (ticketsRes.data ?? []) as Pick<Ticket, "id" | "title" | "type">[];

  return (
    <ScheduleView
      viewDate={viewDate}
      today={today}
      shifts={shifts}
      staff={staff}
      properties={properties}
      tickets={tickets}
      isAdmin={isAdmin}
    />
  );
}
