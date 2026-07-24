"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";

export async function addShift(formData: FormData) {
  const { businessId, role } = await getCurrentBusiness();
  if (role !== "admin") throw new Error("Not authorized");

  const app_user_id = formData.get("app_user_id") as string;
  const property_id = (formData.get("property_id") as string) || null;
  const ticket_id = (formData.get("ticket_id") as string) || null;
  const shift_date = formData.get("shift_date") as string;
  const start_time = formData.get("start_time") as string;
  const end_time = formData.get("end_time") as string;
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;

  if (!app_user_id || !shift_date || !start_time || !end_time) {
    throw new Error("Staff member, date, and times are required");
  }

  const supabase = createClient();

  const { error } = await supabase.from("shifts").insert({
    business_id: businessId,
    app_user_id,
    property_id,
    ticket_id,
    shift_date,
    start_time,
    end_time,
    notes,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/schedule");
}

export async function deleteShift(shiftId: string): Promise<void> {
  const { businessId, role } = await getCurrentBusiness();
  if (role !== "admin") throw new Error("Not authorized");

  const supabase = createClient();

  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", shiftId)
    .eq("business_id", businessId);

  if (error) throw new Error(error.message);

  revalidatePath("/schedule");
}
