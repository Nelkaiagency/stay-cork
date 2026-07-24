"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, Truck, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type SupplyRun, type SupplyRunStatus } from "@/lib/types/database";
import { formatDate } from "@/lib/utils-date";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<SupplyRunStatus, string> = {
  needed:    "Needed",
  ordered:   "Ordered",
  delivered: "Delivered",
};

const STATUS_COLORS: Record<SupplyRunStatus, string> = {
  needed:    "bg-amber-100 text-amber-700",
  ordered:   "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
};

const NEXT_STATUS: Partial<Record<SupplyRunStatus, SupplyRunStatus>> = {
  needed:  "ordered",
  ordered: "delivered",
};

interface SupplySectionProps {
  ticketId: string;
  businessId: string;
  userId: string;
  isAdmin: boolean;
  canAdd: boolean;
  initialRuns: SupplyRun[];
  staffOptions: { id: string; name: string }[];
}

export function SupplySection({
  ticketId,
  businessId,
  userId,
  isAdmin,
  canAdd,
  initialRuns,
  staffOptions,
}: SupplySectionProps) {
  const router = useRouter();
  const supabase = createClient();
  const [runs, setRuns] = useState<SupplyRun[]>(initialRuns);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [desc, setDesc] = useState("");
  const [supplier, setSupplier] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [neededBy, setNeededBy] = useState("");

  async function handleAdd() {
    if (!desc.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("supply_runs")
      .insert({
        ticket_id: ticketId,
        business_id: businessId,
        description: desc.trim(),
        supplier: supplier.trim() || null,
        vehicle: vehicle.trim() || null,
        needed_by_date: neededBy || null,
        status: "needed",
        created_by: userId,
      })
      .select("*")
      .single();

    if (!error && data) {
      setRuns((prev) => [...prev, data as SupplyRun]);
      setDesc("");
      setSupplier("");
      setVehicle("");
      setNeededBy("");
      setShowForm(false);
    }
    setSubmitting(false);
    router.refresh();
  }

  async function handleStatusAdvance(run: SupplyRun) {
    const next = NEXT_STATUS[run.status];
    if (!next) return;
    setUpdatingId(run.id);
    setRuns((prev) => prev.map((r) => r.id === run.id ? { ...r, status: next } : r));

    const { error } = await supabase
      .from("supply_runs")
      .update({ status: next })
      .eq("id", run.id);

    if (error) {
      setRuns((prev) => prev.map((r) => r.id === run.id ? { ...r, status: run.status } : r));
    }
    setUpdatingId(null);
    router.refresh();
  }

  async function handleFulfilledBy(run: SupplyRun, newUserId: string) {
    setUpdatingId(run.id);

    const { error } = await supabase
      .from("supply_runs")
      .update({ fulfilled_by: newUserId || null })
      .eq("id", run.id);

    if (!error) {
      const staffName = newUserId
        ? (staffOptions.find((s) => s.id === newUserId)?.name ?? null)
        : null;
      setRuns((prev) =>
        prev.map((r) =>
          r.id === run.id
            ? { ...r, fulfilled_by: newUserId || null, fulfilled_by_user: staffName ? { name: staffName } : null }
            : r
        )
      );
    }
    setUpdatingId(null);
    router.refresh();
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Supplies {runs.length > 0 && `(${runs.length})`}
        </h2>
        {canAdd && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--brand-primary)] hover:opacity-70 transition-opacity"
          >
            <PackagePlus className="h-3.5 w-3.5" />
            {showForm ? "Cancel" : "Add run"}
          </button>
        )}
      </div>

      {runs.length > 0 && (
        <ul className="flex flex-col gap-2 mb-3">
          {runs.map((run) => (
            <li key={run.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 flex-1">{run.description}</p>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_COLORS[run.status])}>
                    {STATUS_LABELS[run.status]}
                  </span>
                </div>

                {(run.supplier || run.vehicle || run.needed_by_date) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {run.supplier && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {run.supplier}
                      </span>
                    )}
                    {run.vehicle && <span>Vehicle: {run.vehicle}</span>}
                    {run.needed_by_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(run.needed_by_date)}
                      </span>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <select
                    value={run.fulfilled_by ?? ""}
                    onChange={(e) => handleFulfilledBy(run, e.target.value)}
                    disabled={updatingId === run.id}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-700 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Fulfilled by…</option>
                    {staffOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {NEXT_STATUS[run.status] && (
                <div className="border-t border-slate-100 px-4 py-2">
                  <button
                    disabled={updatingId === run.id}
                    onClick={() => handleStatusAdvance(run)}
                    className="text-xs font-medium text-[var(--brand-primary)] hover:opacity-70 transition-opacity disabled:opacity-40"
                  >
                    Mark as {STATUS_LABELS[NEXT_STATUS[run.status]!]}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {runs.length === 0 && !showForm && (
        <p className="text-sm text-slate-400 italic">No supply runs yet</p>
      )}

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Description *"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && desc.trim()) handleAdd(); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Vehicle"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            />
          </div>
          <input
            type="date"
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-700 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
          />
          <button
            disabled={submitting || !desc.trim()}
            onClick={handleAdd}
            className="rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
          >
            {submitting ? "Adding…" : "Add supply run"}
          </button>
        </div>
      )}
    </section>
  );
}
