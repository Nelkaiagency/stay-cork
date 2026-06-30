"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AlertTriangle,
  Plus,
  X,
  Clock,
} from "lucide-react";
import { addShift, deleteShift } from "@/app/(app)/schedule/actions";
import type { Shift, ShiftCollision, AppUser, Property, Ticket } from "@/lib/types/database";

interface ScheduleViewProps {
  viewDate: string;
  today: string;
  shifts: Shift[];
  staff: Pick<AppUser, "id" | "name" | "role">[];
  properties: Pick<Property, "id" | "name">[];
  tickets: Pick<Ticket, "id" | "title" | "type">[];
  isAdmin: boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatViewDate(dateStr: string, today: string): string {
  const label = new Date(dateStr + "T00:00:00").toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return dateStr === today ? `Today · ${label}` : label;
}

function fmt24(t: string): string {
  // t is "HH:MM:SS" — return "HH:MM"
  return t.slice(0, 5);
}

function parseMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minsToHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// "HH:MM:SS-HH:MM:SS" → overlap "HH:MM–HH:MM"
function overlapRange(timeA: string, timeB: string): string {
  const [aS, aE] = timeA.split("-");
  const [bS, bE] = timeB.split("-");
  const start = minsToHHMM(Math.max(parseMinutes(aS), parseMinutes(bS)));
  const end   = minsToHHMM(Math.min(parseMinutes(aE), parseMinutes(bE)));
  return `${start}–${end}`;
}

// "HH:MM:SS-HH:MM:SS" → "HH:MM–HH:MM"
function fmtTimeRange(t: string): string {
  const [s, e] = t.split("-");
  return `${fmt24(s)}–${fmt24(e)}`;
}

function computeCollisions(shiftList: Shift[]): ShiftCollision[] {
  const result: ShiftCollision[] = [];
  for (let i = 0; i < shiftList.length; i++) {
    for (let j = i + 1; j < shiftList.length; j++) {
      const a = shiftList[i];
      const b = shiftList[j];
      if (!a.property_id || a.property_id !== b.property_id) continue;
      if (a.app_user_id === b.app_user_id) continue;
      if (a.start_time < b.end_time && b.start_time < a.end_time) {
        result.push({
          property_name: a.property?.name ?? b.property?.name ?? "",
          staff_a: a.staff?.name ?? "Unknown",
          staff_b: b.staff?.name ?? "Unknown",
          time_a: `${a.start_time}-${a.end_time}`,
          time_b: `${b.start_time}-${b.end_time}`,
        });
      }
    }
  }
  return result;
}

const INPUT_CLS =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent";

// ── component ─────────────────────────────────────────────────────────────────

export function ScheduleView({
  viewDate,
  today,
  shifts,
  staff,
  properties,
  tickets,
  isAdmin,
}: ScheduleViewProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localShifts, setLocalShifts] = useState(shifts);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Sync localShifts when the server re-renders after add/delete
  useEffect(() => {
    setLocalShifts(shifts);
  }, [shifts]);

  const localCollisions = isAdmin ? computeCollisions(localShifts) : [];

  const selectedStaffRole = staff.find((s) => s.id === selectedStaffId)?.role ?? null;
  const filteredTickets = selectedStaffRole === "housekeeping"
    ? tickets.filter((t) => t.type === "housekeeping")
    : selectedStaffRole === "maintenance"
    ? tickets.filter((t) => t.type === "maintenance" || t.type === "renovation")
    : [];

  function handleDeleteShift(shiftId: string) {
    const removed = localShifts.find((s) => s.id === shiftId);
    if (!removed) return;
    setLocalShifts((prev) => prev.filter((s) => s.id !== shiftId));
    setDeleteError(null);
    startDeleteTransition(async () => {
      try {
        await deleteShift(shiftId);
      } catch (err) {
        setLocalShifts((prev) =>
          [...prev, removed].sort((a, b) => a.start_time.localeCompare(b.start_time))
        );
        setDeleteError(err instanceof Error ? err.message : "Failed to remove shift");
      }
    });
  }

  const prevDate = addDays(viewDate, -1);
  const nextDate = addDays(viewDate, 1);

  // Group by staff member (preserving order from server — sorted by start_time)
  const grouped = new Map<string, { name: string; shifts: Shift[] }>();
  for (const shift of localShifts) {
    const id = shift.app_user_id;
    if (!grouped.has(id)) {
      grouped.set(id, { name: shift.staff?.name ?? "Unknown", shifts: [] });
    }
    grouped.get(id)!.shifts.push(shift);
  }

  function handleAddShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setFormError(null);
    startTransition(async () => {
      try {
        await addShift(fd);
        setShowForm(false);
        setSelectedStaffId("");
        router.refresh();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to add shift");
      }
    });
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto">
      {/* Sticky date-nav header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/schedule?date=${prevDate}`}
            className="-m-2 p-2 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="flex-1 flex items-center justify-center">
            {showDatePicker ? (
              <input
                type="date"
                autoFocus
                defaultValue={viewDate}
                onChange={(e) => {
                  if (e.target.value) {
                    router.push(`/schedule?date=${e.target.value}`);
                    setShowDatePicker(false);
                  }
                }}
                onBlur={() => setShowDatePicker(false)}
                className="text-sm font-semibold text-slate-900 text-center bg-transparent outline-none border-none w-36"
              />
            ) : (
              <button
                onClick={() => setShowDatePicker(true)}
                className="font-semibold text-slate-900 text-sm leading-none hover:text-[var(--brand-primary)] transition-colors"
                title="Jump to date"
              >
                {formatViewDate(viewDate, today)}
              </button>
            )}
          </div>

          <Link
            href={`/schedule?date=${nextDate}`}
            className="-m-2 p-2 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Delete error */}
        {deleteError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        )}

        {/* Collision warnings — admin only */}
        {isAdmin && localCollisions.length > 0 && (
          <div className="flex flex-col gap-2">
            {localCollisions.map((c, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800">
                    {c.staff_a} &amp; {c.staff_b} — both at {c.property_name}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Overlap&nbsp;
                    <span className="font-medium">{overlapRange(c.time_a, c.time_b)}</span>
                    &nbsp;·&nbsp;{c.staff_a}: {fmtTimeRange(c.time_a)}&nbsp;/&nbsp;
                    {c.staff_b}: {fmtTimeRange(c.time_b)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add shift — admin only */}
        {isAdmin && (
          <>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add shift
              </button>
            )}

            {showForm && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">New shift</h3>
                  <button
                    onClick={() => { setShowForm(false); setFormError(null); setSelectedStaffId(""); }}
                    className="-m-2 p-2 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleAddShift} className="flex flex-col gap-3">
                  <select
                    name="app_user_id"
                    required
                    className={INPUT_CLS}
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                  >
                    <option value="">Staff member *</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  <select name="property_id" className={INPUT_CLS}>
                    <option value="">Property (optional)</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>

                  <select name="ticket_id" className={INPUT_CLS} disabled={!selectedStaffId}>
                    <option value="">
                      {selectedStaffId ? "Ticket (optional)" : "Select staff first"}
                    </option>
                    {filteredTickets.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>

                  <input
                    name="shift_date"
                    type="date"
                    defaultValue={viewDate}
                    required
                    className={INPUT_CLS}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Start *</label>
                      <input name="start_time" type="time" required className={INPUT_CLS} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">End *</label>
                      <input name="end_time" type="time" required className={INPUT_CLS} />
                    </div>
                  </div>

                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Notes (optional)"
                    className={`${INPUT_CLS} resize-none`}
                  />

                  {formError && (
                    <p className="text-sm text-red-600">{formError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-base font-semibold text-white disabled:opacity-50 transition-opacity"
                  >
                    {isPending ? "Adding…" : "Add shift"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* Shift list grouped by staff */}
        {grouped.size === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <CalendarDays className="h-10 w-10" />
            <p className="text-sm">No shifts scheduled</p>
            {viewDate !== today && (
              <Link
                href="/schedule"
                className="text-xs text-[var(--brand-primary)] hover:opacity-70 transition-opacity"
              >
                Back to today
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {Array.from(grouped.entries()).map(([uid, group]) => (
                <div
                  key={uid}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                >
                  {/* Staff header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="font-medium text-slate-900">{group.name}</p>
                  </div>

                  {/* Shifts */}
                  <ul className="divide-y divide-slate-100">
                    {group.shifts.map((shift) => (
                      <li key={shift.id} className="flex items-stretch">
                        <div className="flex-1 px-4 py-3 flex flex-col gap-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {fmt24(shift.start_time)}–{fmt24(shift.end_time)}
                            </span>
                            {shift.property && (
                              <span className="shrink-0 rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--brand-primary)]">
                                {shift.property.name}
                              </span>
                            )}
                          </div>

                          {shift.ticket && (
                            <p className="text-xs text-slate-500 truncate">
                              Ticket: {shift.ticket.title}
                            </p>
                          )}
                          {shift.notes && (
                            <p className="text-xs text-slate-400 italic">{shift.notes}</p>
                          )}
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            disabled={isDeletePending}
                            title="Remove shift"
                            className="flex items-center px-3 border-l border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {viewDate !== today && (
              <Link
                href="/schedule"
                className="text-center text-xs text-slate-400 hover:text-[var(--brand-primary)] transition-colors"
              >
                ← Back to today
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
