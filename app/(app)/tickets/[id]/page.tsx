import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { TicketDetail } from "@/components/tickets/ticket-detail";
import { type Ticket, type TicketSubtask, type TicketPhoto, type TicketActivity, type SupplyRun } from "@/lib/types/database";

interface TicketPageProps {
  params: { id: string };
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { businessId, appUserId, role } = await getCurrentBusiness();
  const supabase = createClient();
  const isAdmin = role === "admin";

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, property:properties(id, name, address, housekeeping_status, business_id, created_at), assigned_staff:app_users!assigned_to(name), label:issue_labels!label_id(id, label_name)")
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!ticket) notFound();

  const typedTicket = ticket as Ticket;
  const staffRole = typedTicket.type === "housekeeping" ? "housekeeping" : "maintenance";

  const [subtasksRes, rawPhotosRes, activityRes, currentUserRes, staffRes, supplyRunsRes] = await Promise.all([
    supabase
      .from("ticket_subtasks")
      .select("*, assigned_staff:app_users!assigned_to(name)")
      .eq("ticket_id", ticket.id)
      .order("sequence_order", { ascending: true }),
    supabase
      .from("ticket_photos")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("ticket_activity")
      .select("id, action, note, created_at, user:app_users(name)")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("app_users")
      .select("name")
      .eq("id", appUserId)
      .single(),
    isAdmin
      ? supabase
          .from("app_users")
          .select("id, name, skills")
          .eq("business_id", businessId)
          .eq("role", staffRole)
          .order("name")
      : Promise.resolve({ data: [] as { id: string; name: string; skills: string[] | null }[], error: null }),
    typedTicket.type !== "housekeeping"
      ? supabase
          .from("supply_runs")
          .select("*, fulfilled_by_user:app_users!fulfilled_by(name)")
          .eq("ticket_id", ticket.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as SupplyRun[], error: null }),
  ]);

  const { data: subtasks } = subtasksRes;
  const { data: rawPhotos } = rawPhotosRes;
  const { data: activity } = activityRes;
  const adminName = (currentUserRes.data as { name: string } | null)?.name ?? "";
  const assignableStaff = (staffRes.data ?? []) as { id: string; name: string; skills: string[] | null }[];
  const supplyRuns = (supplyRunsRes.data ?? []) as SupplyRun[];

  // Bucket is private — generate 1-hour signed URLs server-side.
  const photos = await Promise.all(
    (rawPhotos ?? []).map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from("ticket-photos")
        .createSignedUrl(photo.storage_path, 3600);
      return { ...photo, url: signed?.signedUrl ?? null };
    })
  );

  return (
    <TicketDetail
      ticket={typedTicket}
      subtasks={(subtasks as TicketSubtask[]) ?? []}
      photos={(photos as TicketPhoto[]) ?? []}
      activity={(activity as unknown as TicketActivity[]) ?? []}
      userId={appUserId}
      isAdmin={isAdmin}
      assignableStaff={assignableStaff}
      adminName={adminName}
      supplyRuns={supplyRuns}
      canAddSupplyRun={role === "admin" || role === "maintenance"}
    />
  );
}
