"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Hammer,
  Home,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type BrandConfig } from "@/lib/config/white-label";
import { cn } from "@/lib/utils";

interface DesktopSidebarProps {
  brand: BrandConfig;
  userName: string;
  role: string;
}

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, hiddenFor: [] as string[] },
  { href: "/properties", label: "Properties", icon: Building2, hiddenFor: ["maintenance", "housekeeping"] },
  { href: "/tickets", label: "Tickets", icon: ClipboardList, hiddenFor: [] as string[] },
  { href: "/housekeeping", label: "Housekeeping", icon: Home, hiddenFor: ["maintenance"] },
  { href: "/tickets?type=renovation", label: "Renovations", icon: Hammer, hiddenFor: ["housekeeping"] },
  { href: "/schedule", label: "Schedule", icon: CalendarDays, hiddenFor: [] as string[] },
  { href: "/team", label: "Team", icon: Users, hiddenFor: ["maintenance", "housekeeping"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, hiddenFor: ["maintenance", "housekeeping"] },
  { href: "/report", label: "Reports", icon: FileText, hiddenFor: ["maintenance", "housekeeping"] },
];

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function DesktopSidebar({ brand, userName, role }: DesktopSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const visibleItems = items.filter((item) => !item.hiddenFor.includes(role));

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-[#0d2b54] text-white lg:flex">
      <div className="flex h-20 items-center gap-3 px-6">
        {brand.logoUrl ? (
          <Image src={brand.logoUrl} alt={brand.name} width={36} height={36} className="rounded-lg" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2ad43]/35 bg-[#e2ad43]/10 text-[#f0b94e]">
            <Building2 className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight">{brand.name}</p>
          <p className="text-xs text-blue-100/60">Operations</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const hrefPath = href.split("?")[0];
          const active = pathname === hrefPath || (hrefPath !== "/dashboard" && pathname.startsWith(`${hrefPath}/`));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-blue-50/80 hover:bg-white/[0.07] hover:text-white"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", active ? "text-[#efb54b]" : "text-blue-100/80")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 rounded-xl px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
            {userName
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="text-xs text-blue-100/55">{roleLabel(role)}</p>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="rounded-lg p-2 text-blue-100/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
