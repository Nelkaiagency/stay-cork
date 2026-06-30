"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Trash2 } from "lucide-react";
import { deleteTicketPhoto } from "@/app/(app)/tickets/[id]/actions";
import { createClient } from "@/lib/supabase/client";
import { type Ticket, type TicketSubtask, type TicketPhoto, type SubtaskStatus, type TicketStatus, type TicketActivity, type SupplyRun } from "@/lib/types/database";
import { SupplySection } from "./supply-section";
import { formatDistanceToNow } from "@/lib/utils-date";
import { getLabelClasses } from "@/lib/label-colors";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorToast } from "@/components/ui/error-toast";
import { SubtaskItem } from "./subtask-item";
import { cn } from "@/lib/utils";

interface TicketDetailProps {
  ticket: Ticket & { label?: { id: string; label_name: string } | null };
  subtasks: TicketSubtask[];
  photos: TicketPhoto[];
  activity: TicketActivity[];
  userId: string;
  isAdmin?: boolean;
  assignableStaff?: { id: string; name: string; skills?: string[] | null }[];
  adminName?: string;
  supplyRuns?: SupplyRun[];
  canAddSupplyRun?: boolean;
}

const TICKET_STATUSES: TicketStatus[] = ["open", "in_progress", "blocked", "done"];

const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open:        "border-slate-300 bg-slate-50",
  in_progress: "border-blue-300 bg-blue-50",
  blocked:     "border-red-300 bg-red-50",
  done:        "border-emerald-300 bg-emerald-50",
};

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open:        "Open",
  in_progress: "In Progress",
  blocked:     "Blocked",
  done:        "Done",
};

export function TicketDetail({
  ticket,
  subtasks,
  photos,
  activity,
  userId,
  isAdmin = false,
  assignableStaff = [],
  adminName = "",
  supplyRuns = [],
  canAddSupplyRun = false,
}: TicketDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [localSubtasks, setLocalSubtasks] = useState(subtasks);
  const [uploading, setUploading] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>(ticket.status);
  const [savingTicketStatus, setSavingTicketStatus] = useState(false);
  const [localAssignedToId, setLocalAssignedToId] = useState<string | null>(ticket.assigned_to);
  const [localAssignedToName, setLocalAssignedToName] = useState<string | null>(
    ticket.assigned_staff?.name ?? null
  );
  const [assigning, setAssigning] = useState(false);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<Set<string>>(new Set());
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  // Build a lookup for quick dependency checking
  const subtaskById = Object.fromEntries(localSubtasks.map((s) => [s.id, s]));

  function isBlocked(subtask: TicketSubtask): boolean {
    if (!subtask.depends_on) return false;
    const dep = subtaskById[subtask.depends_on];
    return !dep || (dep.status !== "done" && dep.status !== "skipped");
  }

  async function handleAssign(newUserId: string) {
    setAssigning(true);
    setError(null);

    const newName = newUserId
      ? (assignableStaff.find((s) => s.id === newUserId)?.name ?? null)
      : null;
    const prevId = localAssignedToId;
    const prevName = localAssignedToName;

    setLocalAssignedToId(newUserId || null);
    setLocalAssignedToName(newName);

    const { error: dbError } = await supabase
      .from("tickets")
      .update({ assigned_to: newUserId || null, updated_at: new Date().toISOString() })
      .eq("id", ticket.id);

    if (dbError) {
      setLocalAssignedToId(prevId);
      setLocalAssignedToName(prevName);
      setError(dbError.message);
      setAssigning(false);
      return;
    }

    const activityNote = newUserId
      ? `Assigned to ${newName} by ${adminName}`
      : `Unassigned by ${adminName}`;

    await supabase.from("ticket_activity").insert({
      ticket_id: ticket.id,
      user_id: userId,
      action: "assigned",
      note: activityNote,
    });

    router.refresh();
    setAssigning(false);
  }

  function handleSubtaskAssign(subtaskId: string, staffId: string | null) {
    const newName = staffId ? (assignableStaff.find((s) => s.id === staffId)?.name ?? null) : null;
    setLocalSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtaskId
          ? { ...s, assigned_to: staffId, assigned_staff: newName ? { name: newName } : null }
          : s
      )
    );
    supabase
      .from("ticket_subtasks")
      .update({ assigned_to: staffId, updated_at: new Date().toISOString() })
      .eq("id", subtaskId)
      .then(({ error: dbError }) => {
        if (dbError) {
          router.refresh();
          setError(dbError.message);
        }
      });
  }

  async function handleStatusChange(subtask: TicketSubtask, newStatus: SubtaskStatus) {
    setError(null);

    setLocalSubtasks((prev) =>
      prev.map((s) => (s.id === subtask.id ? { ...s, status: newStatus } : s))
    );

    const { error: dbError } = await supabase
      .from("ticket_subtasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", subtask.id);

    if (dbError) {
      setLocalSubtasks((prev) =>
        prev.map((s) => (s.id === subtask.id ? { ...s, status: subtask.status } : s))
      );
      const msg = dbError.message.includes("dependency")
        ? "Cannot start this task — the previous step must be completed first."
        : dbError.message;
      setError(msg);
      return;
    }

    router.refresh();
  }

  async function handleSkip(subtask: TicketSubtask, reason: string) {
    setError(null);

    setLocalSubtasks((prev) =>
      prev.map((s) => s.id === subtask.id ? { ...s, status: "skipped" as const, skip_reason: reason } : s)
    );

    const { error: dbError } = await supabase
      .from("ticket_subtasks")
      .update({ status: "skipped", skip_reason: reason, updated_at: new Date().toISOString() })
      .eq("id", subtask.id);

    if (dbError) {
      setLocalSubtasks((prev) =>
        prev.map((s) => s.id === subtask.id ? { ...s, status: subtask.status, skip_reason: subtask.skip_reason } : s)
      );
      setError(dbError.message);
      return;
    }

    router.refresh();
  }

  async function handleTicketStatusChange(newStatus: TicketStatus) {
    if (newStatus === ticketStatus) return;
    setSavingTicketStatus(true);
    setError(null);
    const prev = ticketStatus;
    setTicketStatus(newStatus);

    const { error: dbError } = await supabase
      .from("tickets")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", ticket.id);

    if (dbError) {
      setTicketStatus(prev);
      setError(dbError.message);
      setSavingTicketStatus(false);
      return;
    }

    await supabase.from("ticket_activity").insert({
      ticket_id: ticket.id,
      user_id: userId,
      action: "status_changed",
      note: `Status changed from ${TICKET_STATUS_LABELS[prev]} to ${TICKET_STATUS_LABELS[newStatus]}`,
    });

    router.refresh();
    setSavingTicketStatus(false);
  }

  async function handlePhotoUpload(subtaskId: string, file: File) {
    setError(null);
    setUploading(subtaskId);

    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${ticket.business_id}/${ticket.id}/${subtaskId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("ticket-photos")
      .upload(storagePath, file, { upsert: false });

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(null);
      return;
    }

    await supabase.from("ticket_photos").insert({
      ticket_id: ticket.id,
      subtask_id: subtaskId,
      storage_path: storagePath,
      url: null,
      uploaded_by: userId,
    });

    setUploading(null);
    router.refresh();
  }

  async function handleDeletePhoto(photo: TicketPhoto) {
    if (!window.confirm("Delete this photo? This can't be undone.")) return;

    setDeletingPhotoId(photo.id);
    setError(null);
    setDeletedPhotoIds((prev) => new Set(prev).add(photo.id));

    try {
      await deleteTicketPhoto(photo.id, photo.storage_path);
      router.refresh();
    } catch (err) {
      setDeletedPhotoIds((prev) => {
        const next = new Set(prev);
        next.delete(photo.id);
        return next;
      });
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    } finally {
      setDeletingPhotoId(null);
    }
  }

  const visiblePhotos = photos.filter((p) => !deletedPhotoIds.has(p.id));

  return (
    <div className="flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="-m-3 p-3 rounded-lg text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 truncate">{ticket.title}</h1>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-xs text-slate-500 truncate">
                {ticket.property?.name}
                {localAssignedToName && <> · {localAssignedToName}</>}
              </span>
              {ticket.label?.label_name && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${getLabelClasses(ticket.label.label_name)}`}>
                  {ticket.label.label_name}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={ticketStatus} />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {/* Description */}
        {ticket.description && (
          <p className="text-sm text-slate-600 leading-relaxed">{ticket.description}</p>
        )}

        {/* Assignment — admin sees dropdown, others see nothing (name already in header) */}
        {isAdmin && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {ticket.type === "renovation" ? "Project supervisor" : "Assign to"}
            </h2>
            <select
              value={localAssignedToId ?? ""}
              onChange={(e) => handleAssign(e.target.value)}
              disabled={assigning}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {assignableStaff.map((s) => {
                const skillSuffix =
                  ticket.type !== "housekeeping" && s.skills?.length
                    ? ` (${s.skills.join(", ")})`
                    : "";
                return (
                  <option key={s.id} value={s.id}>{s.name}{skillSuffix}</option>
                );
              })}
            </select>
          </section>
        )}

        {/* Supply runs — maintenance / renovation tickets only */}
        {ticket.type !== "housekeeping" && (
          <SupplySection
            ticketId={ticket.id}
            businessId={ticket.business_id}
            userId={userId}
            isAdmin={isAdmin}
            canAdd={canAddSupplyRun}
            initialRuns={supplyRuns}
            staffOptions={assignableStaff}
          />
        )}

        {/* Status selector — only for tickets without subtasks */}
        {localSubtasks.length === 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Status
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {TICKET_STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={savingTicketStatus}
                  onClick={() => handleTicketStatusChange(s)}
                  className={cn(
                    "rounded-xl border-2 px-4 py-3 text-sm font-medium capitalize text-left transition-all",
                    ticketStatus === s
                      ? TICKET_STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-[var(--brand-primary)]"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Subtasks — only rendered when the ticket has at least one */}
        {localSubtasks.length > 0 && (() => {
          const isSequenced = localSubtasks.some((s) => s.depends_on !== null);
          const List = isSequenced ? "ol" : "ul";
          return (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Tasks ({localSubtasks.filter((s) => s.status === "done").length}/{localSubtasks.length} done)
              </h2>

              <div className="mb-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(localSubtasks.filter((s) => s.status === "done").length / localSubtasks.length) * 100}%`,
                    backgroundColor: "var(--brand-secondary)",
                  }}
                />
              </div>

              <List className="flex flex-col gap-2">
                {localSubtasks.map((subtask, i) => (
                  <SubtaskItem
                    key={subtask.id}
                    subtask={subtask}
                    index={i + 1}
                    blocked={isBlocked(subtask)}
                    dependency={subtask.depends_on ? subtaskById[subtask.depends_on] : null}
                    photosForSubtask={visiblePhotos.filter((p) => p.subtask_id === subtask.id)}
                    uploading={uploading === subtask.id}
                    checklist={!isSequenced}
                    isAdmin={isAdmin}
                    assignableStaff={isSequenced ? assignableStaff : []}
                    onAssign={isSequenced ? handleSubtaskAssign : undefined}
                    onStatusChange={handleStatusChange}
                    onSkip={handleSkip}
                    onPhotoUpload={handlePhotoUpload}
                  />
                ))}
              </List>
            </section>
          );
        })()}

        {/* Activity feed */}
        {activity.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Activity
            </h2>
            <ul className="flex flex-col gap-2">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex flex-col gap-0.5"
                >
                  <span className="text-sm text-slate-700">
                    {entry.note ?? entry.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-slate-400">
                    {entry.user?.name ? `${entry.user.name} · ` : ""}
                    {formatDistanceToNow(entry.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Photos gallery */}
        {visiblePhotos.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              All Photos ({visiblePhotos.length})
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {visiblePhotos.filter((p) => p.url).map((photo) => (
                <div key={photo.id} className="relative">
                  <a href={photo.url!} target="_blank" rel="noopener noreferrer" className="block">
                    <Image
                      src={photo.url!}
                      alt="Ticket photo"
                      width={120}
                      height={120}
                      className="rounded-lg object-cover aspect-square w-full"
                    />
                  </a>
                  {(isAdmin || userId === photo.uploaded_by) && (
                    <button
                      onClick={() => handleDeletePhoto(photo)}
                      disabled={deletingPhotoId === photo.id}
                      aria-label="Delete photo"
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm disabled:opacity-50 transition-opacity"
                    >
                      {deletingPhotoId === photo.id ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
