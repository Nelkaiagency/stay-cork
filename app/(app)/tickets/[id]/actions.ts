"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";

export async function deleteTicketPhoto(photoId: string): Promise<void> {
  const { businessId } = await getCurrentBusiness();
  const supabase = createClient();

  // Fetch the photo to get its storage path and verify it belongs to this business
  const { data: photo, error: fetchError } = await supabase
    .from("ticket_photos")
    .select("id, storage_path, ticket_id, ticket:tickets!ticket_id(business_id)")
    .eq("id", photoId)
    .single();

  if (fetchError || !photo) throw new Error("Photo not found");

  const ticketBizId = (photo.ticket as unknown as { business_id: string } | null)
    ?.business_id;
  if (ticketBizId !== businessId) throw new Error("Not authorized");

  // Delete the DB row
  const { error: dbError } = await supabase
    .from("ticket_photos")
    .delete()
    .eq("id", photoId);

  if (dbError) throw new Error(dbError.message);

  // Remove from storage (best-effort — don't fail if the file is already gone)
  await supabase.storage.from("ticket-photos").remove([photo.storage_path]);

  revalidatePath(`/tickets/${photo.ticket_id}`);
}
