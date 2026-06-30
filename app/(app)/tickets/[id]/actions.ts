"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";

export async function deleteTicketPhoto(
  photoId: string,
  storagePath: string,
): Promise<void> {
  const { businessId } = await getCurrentBusiness();
  const supabase = createClient();

  // Minimal fetch: verify the photo belongs to this business, get ticket_id for revalidation
  const { data: photo, error: fetchError } = await supabase
    .from("ticket_photos")
    .select("ticket_id, ticket:tickets!ticket_id(business_id)")
    .eq("id", photoId)
    .single();

  if (fetchError || !photo) throw new Error("Photo not found");

  const ticketBizId = (photo.ticket as unknown as { business_id: string } | null)
    ?.business_id;
  if (ticketBizId !== businessId) throw new Error("Not authorized");

  // Remove from storage first — use the path from the client row directly
  const { error: storageError } = await supabase.storage
    .from("ticket-photos")
    .remove([storagePath]);

  if (storageError) throw new Error(`Storage error: ${storageError.message}`);

  // Then delete the DB row
  const { error: dbError } = await supabase
    .from("ticket_photos")
    .delete()
    .eq("id", photoId);

  if (dbError) throw new Error(dbError.message);

  revalidatePath(`/tickets/${photo.ticket_id}`);
}
