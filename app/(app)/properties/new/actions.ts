"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";

export async function createProperty(formData: FormData) {
  const { businessId, role } = await getCurrentBusiness();
  if (role !== "admin") redirect("/dashboard");

  const supabase = createClient();

  const name = (formData.get("name") as string).trim();
  const address = (formData.get("address") as string | null)?.trim() || null;
  const property_type = formData.get("property_type") as string;
  const status = formData.get("status") as string;
  const capacityRaw = formData.get("capacity") as string;
  const bedroomsRaw = formData.get("bedrooms") as string;
  const bathroomsRaw = formData.get("bathrooms") as string;

  const capacity = capacityRaw ? parseInt(capacityRaw, 10) : null;
  const bedrooms = bedroomsRaw ? parseInt(bedroomsRaw, 10) : null;
  const bathrooms = bathroomsRaw ? parseInt(bathroomsRaw, 10) : null;
  const has_kitchen = formData.get("has_kitchen") === "true";

  const { data, error } = await supabase
    .from("properties")
    .insert({
      business_id: businessId,
      name,
      address,
      property_type,
      status,
      capacity: capacity || null,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      has_kitchen,
      housekeeping_status: "dirty",
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/properties/new?error=1");
  }

  redirect("/properties");
}
