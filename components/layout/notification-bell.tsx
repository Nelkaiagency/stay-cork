"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Notification } from "@/lib/types/database";
import { formatDistanceToNow } from "@/lib/utils-date";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  appUserId: string;
}

export function NotificationBell({ appUserId }: NotificationBellProps) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", appUserId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (data) setNotifications(data as Notification[]);
    }
    load();
  }, [appUserId, supabase]);

  // Live updates — new notifications appear without refresh
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${appUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${appUserId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [appUserId, supabase]);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function markRead(n: Notification) {
    if (n.read_at) return;
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read_at: now } : x))
    );
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", n.id);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (!unreadIds.length) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .in("id", unreadIds);
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-0.5 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[var(--brand-primary)] hover:opacity-70 transition-opacity"
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-400">
                No notifications
              </li>
            ) : (
              notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => markRead(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors hover:bg-slate-50",
                      !n.read_at && "bg-blue-50/60"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          !n.read_at ? "bg-[var(--brand-primary)]" : "bg-transparent"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDistanceToNow(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
