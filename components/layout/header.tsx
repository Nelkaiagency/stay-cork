"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Building2, LogOut } from "lucide-react";
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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-[#0d2b54] px-4 text-white shadow-sm lg:hidden">
      <div className="flex items-center gap-3">
        {brand.logoUrl ? (
          <Image src={brand.logoUrl} alt={brand.name} width={32} height={32} className="rounded-lg" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#efb54b]/30 bg-[#efb54b]/10 text-[#efb54b]">
            <Building2 className="h-5 w-5" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold leading-tight">{brand.name}</p>
          <p className="text-[11px] text-blue-100/60">Operations</p>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        <div className="text-white [&_button]:text-white [&_svg]:text-white">
          <NotificationBell appUserId={appUserId} />
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="rounded-lg p-2 text-blue-100/75 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </nav>
    </header>
  );
}
