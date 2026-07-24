"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type BrandConfig } from "@/lib/config/white-label";
import { NotificationBell } from "./notification-bell";

interface HeaderProps {
  brand: BrandConfig;
  appUserId: string;
}

export function Header({ brand, appUserId }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm"
      style={{ borderTopColor: "var(--brand-primary)", borderTopWidth: 3 }}
    >
      <div className="flex items-center gap-3">
        {brand.logoUrl ? (
          <Image src={brand.logoUrl} alt={brand.name} width={28} height={28} className="rounded" />
        ) : (
          <div
            className="h-7 w-7 rounded flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {brand.name[0]}
          </div>
        )}
        <span className="font-semibold text-slate-900 text-sm">{brand.name}</span>
      </div>

      <nav className="flex items-center gap-1">
        <NotificationBell appUserId={appUserId} />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </nav>
    </header>
  );
}
