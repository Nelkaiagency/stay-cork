import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { buildBrandConfig, brandCssVars } from "@/lib/config/white-label";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { businessId, role, appUserId } = await getCurrentBusiness();

  const supabase = createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  const brand = buildBrandConfig(business);

  return (
    <div style={brandCssVars(brand)} className="flex flex-col min-h-screen">
      <Header brand={brand} appUserId={appUserId} />
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <BottomNav role={role} />
    </div>
  );
}
