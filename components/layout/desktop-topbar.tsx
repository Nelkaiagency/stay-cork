"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { NotificationBell } from "./notification-bell";

interface DesktopTopbarProps {
  appUserId: string;
}

const titles: Record<string, string> = {
  "/dashboard": "Overview",
  "/properties": "Properties",
  "/tickets": "Tickets",
  "/housekeeping": "Housekeeping",
  "/schedule": "Schedule",
  "/team": "Team",
  "/analytics": "Analytics",
  "/report": "Reports",
};

function getTitle(pathname: string) {
  const match = Object.entries(titles).find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return match?.[1] ?? "Stay Cork";
}

export function DesktopTopbar({ appUserId }: DesktopTopbarProps) {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <div className="sticky top-0 z-40 hidden h-20 items-center justify-between border-b border-slate-200/80 bg-white/95 px-8 backdrop-blur lg:flex">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">Stay Cork operations workspace</p>
      </div>

      <div className="flex items-center gap-3">
        <form action="/tickets" className="relative hidden xl:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            placeholder="Search tickets..."
            className="h-11 w-80 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
          />
        </form>
        <div className="rounded-xl border border-slate-200 bg-white">
          <NotificationBell appUserId={appUserId} />
        </div>
        <Link
          href="/tickets/new"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0d2b54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#153a6d]"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Link>
      </div>
    </div>
  );
}
