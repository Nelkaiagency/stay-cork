"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, Home, BarChart2, TrendingUp, Building2, Users, CalendarDays, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_ITEMS = [
  { href: "/dashboard",    label: "Home",       icon: LayoutDashboard, hiddenFor: [] as string[]                  },
  { href: "/housekeeping", label: "Rooms",      icon: Home,            hiddenFor: ["maintenance"]                 },
  { href: "/properties",   label: "Properties", icon: Building2,       hiddenFor: ["maintenance", "housekeeping"] },
  { href: "/schedule",     label: "Schedule",   icon: CalendarDays,    hiddenFor: ["admin"]                       },
];

const MORE_ITEMS = [
  { href: "/schedule",  label: "Schedule",  icon: CalendarDays, hiddenFor: ["maintenance", "housekeeping"] },
  { href: "/team",      label: "Team",      icon: Users,        hiddenFor: ["maintenance", "housekeeping"] },
  { href: "/report",    label: "Report",    icon: BarChart2,    hiddenFor: ["maintenance", "housekeeping"] },
  { href: "/analytics", label: "Analytics", icon: TrendingUp,   hiddenFor: ["maintenance", "housekeeping"] },
];

interface BottomNavProps {
  role: string;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const visiblePrimary = PRIMARY_ITEMS.filter((item) => !item.hiddenFor.includes(role));
  const visibleMore = MORE_ITEMS.filter((item) => !item.hiddenFor.includes(role));
  const moreActive = visibleMore.some((item) => pathname.startsWith(item.href));

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [moreOpen]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white pb-safe">
      <div className="flex h-16 items-center justify-around">
        {visiblePrimary.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors",
                active ? "text-[var(--brand-primary)]" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}

        {visibleMore.length > 0 && (
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors",
                moreActive || moreOpen ? "text-[var(--brand-primary)]" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              More
            </button>

            {moreOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                {visibleMore.map(({ href, label, icon: Icon }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                        active ? "text-[var(--brand-primary)] bg-slate-50" : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
