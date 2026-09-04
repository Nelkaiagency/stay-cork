import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { buildBrandConfig, brandCssVars } from "@/lib/config/white-label";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { DesktopTopbar } from "@/components/layout/desktop-topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { businessId, role, appUserId } = await getCurrentBusiness();

  const supabase = createClient();
  const [{ data: business }, { data: appUser }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).single(),
    supabase.from("app_users").select("name").eq("id", appUserId).single(),
  ]);

  const brand = buildBrandConfig(business);
  const userName = appUser?.name ?? "Stay Cork User";

  return (
    <div
      style={brandCssVars(brand)}
      className="min-h-screen bg-[#f6f8fb] text-slate-900 lg:flex"
    >
      <DesktopSidebar brand={brand} userName={userName} role={role} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
        <Header brand={brand} appUserId={appUserId} />
        <DesktopTopbar appUserId={appUserId} />
        <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      <BottomNav role={role} />
    </div>
  );
}
