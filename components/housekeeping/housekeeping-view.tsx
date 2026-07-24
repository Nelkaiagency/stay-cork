"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Circle, CheckCircle2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  type Property,
  type HousekeepingChecklistItem,
  type ChecklistItemStatus,
  type HousekeepingStatus,
  type Tenant,
} from "@/lib/types/database";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorToast } from "@/components/ui/error-toast";
import { formatDate } from "@/lib/utils-date";
import { cn } from "@/lib/utils";

const HOUSEKEEPING_STATUSES: HousekeepingStatus[] = ["dirty", "in_progress", "clean", "inspected"];

const STATUS_COLORS: Record<HousekeepingStatus, string> = {
  dirty: "border-orange-300 bg-orange-50",
  in_progress: "border-blue-300 bg-blue-50",
  clean: "border-emerald-300 bg-emerald-50",
  inspected: "border-purple-300 bg-purple-50",
};

interface HousekeepingViewProps {
  property: Property;
  checklistItems: HousekeepingChecklistItem[];
  tenants?: Tenant[];
}

export function HousekeepingView({ property, checklistItems, tenants = [] }: HousekeepingViewProps) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<HousekeepingStatus>(property.housekeeping_status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(newStatus: HousekeepingStatus) {
    if (newStatus === status) return;
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase
      .from("properties")
      .update({ housekeeping_status: newStatus })
      .eq("id", property.id);

    if (dbError) {
      setError(dbError.message);
    } else {
      setStatus(newStatus);
      router.refresh();
    }
    setSaving(false);
  }

  const doneCount = checklistItems.filter((i) => i.status === "done").length;

  return (
    <div className="flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 truncate">{property.name}</h1>
            {property.address && <p className="text-xs text-slate-500 truncate">{property.address}</p>}
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {/* Tenants */}
        {(() => {
          const current = tenants.find((t) => t.status === "current");
          const next = tenants.find((t) => t.status === "upcoming");
          if (!current && !next) return null;
          return (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Guests
              </h2>
              <div className="flex flex-col gap-2">
                {current && (
                  <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                    <User className="h-4 w-4 text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{current.tenant_name}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(current.check_in_date)} – due {formatDate(current.check_out_date)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-blue-600 shrink-0">Current</span>
                  </div>
                )}
                {next && (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{next.tenant_name}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(next.check_in_date)} – due {formatDate(next.check_out_date)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-500 shrink-0">Next</span>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* Status selector */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Housekeeping Status
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {HOUSEKEEPING_STATUSES.map((s) => (
              <button
                key={s}
                disabled={saving}
                onClick={() => handleStatusChange(s)}
                className={cn(
                  "rounded-xl border-2 px-4 py-3 text-sm font-medium capitalize text-left transition-all",
                  status === s
                    ? STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-[var(--brand-primary)]"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </section>

        {/* Checklist — only visible while cleaning is in progress */}
        {checklistItems.length > 0 && status === "in_progress" && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Checklist ({doneCount}/{checklistItems.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {checklistItems.map((item) => (
                <ChecklistItemRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        )}
      </div>

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </div>
  );
}

function ChecklistItemRow({ item }: { item: HousekeepingChecklistItem }) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState<ChecklistItemStatus>(item.status);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next: ChecklistItemStatus = status === "done" ? "not_started" : "done";
    setLoading(true);
    setStatus(next); // optimistic
    const { error } = await supabase
      .from("housekeeping_checklist_items")
      .update({ status: next })
      .eq("id", item.id);
    if (error) setStatus(status); // roll back on failure
    setLoading(false);
    router.refresh();
  }

  const isDone = status === "done";

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
        isDone ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 shadow-sm"
      )}
    >
      <button
        onClick={toggle}
        disabled={loading}
        className="shrink-0"
        aria-label={isDone ? "Mark incomplete" : "Mark done"}
      >
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Circle className="h-5 w-5 text-slate-300 hover:text-slate-400 transition-colors" />
        )}
      </button>
      <span className={cn("text-sm flex-1", isDone ? "line-through text-slate-400" : "text-slate-900")}>
        {item.title}
      </span>
    </li>
  );
}
