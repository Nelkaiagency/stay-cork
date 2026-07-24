import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CurrentBusiness {
  businessId: string;
  appUserId: string;
  role: string;
  authUserId: string;
}

export async function getCurrentBusiness(): Promise<CurrentBusiness> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, business_id, role")
    .eq("auth_id", user.id)
    .single();

  if (!appUser?.business_id) redirect("/no-business");

  return {
    businessId: appUser.business_id,
    appUserId: appUser.id,
    role: appUser.role,
    authUserId: user.id,
  };
}
