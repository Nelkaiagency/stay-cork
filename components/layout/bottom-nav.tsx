"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Home,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home, hiddenFor: [] as string[] },
  { href: "/tickets", label: "Tickets", icon: ClipboardList, hiddenFor: [] as string[] },
  { href: "/properties", label: "Properties", icon: Building2, hiddenFor: ["maintenance", "housekeeping"] },
];

const MORE_ITEMS = [
  { href: "/housekeeping", label: "Housekeeping", icon: Home, hiddenFor: ["maintenance"] },
  { href: "/schedule", label: "Schedule", icon: CalendarDays, hiddenFor: [] as string[] },
  { href: "/team", label: "Team", icon: Users, hiddenFor: ["maintenance", "housekeeping"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, hiddenFor: ["maintenance", "housekeeping"] },
  { href: "/report", label: "Reports", icon: FileText, hiddenFor: ["maintenance", "housekeeping"] },
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
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    if (moreOpen) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [moreOpen]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-safe shadow-[0_-8px_24px_rgba(15,23,42,0.04)] backdrop-blur lg:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {visiblePrimary.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[68px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-[#0d2b54]" : "text-slate-500"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-blue-600")} />
              {label}
            </Link>
          );
        })}

        {visibleMore.length > 0 && (
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "flex min-w-[68px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors",
                moreActive || moreOpen ? "text-[#0d2b54]" : "text-slate-500"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              More
            </button>

            {moreOpen && (
              <div className="absolute bottom-full right-0 mb-3 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {visibleMore.map(({ href, label, icon: Icon }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active ? "bg-slate-100 text-[#0d2b54]" : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
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
