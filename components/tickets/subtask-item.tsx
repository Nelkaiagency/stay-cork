"use client";

import { useRef, useState } from "react";
import { Camera, Circle, Lock, MinusCircle, ChevronDown, ChevronUp, CheckCircle2, Trash2 } from "lucide-react";
import { type TicketSubtask, type TicketPhoto, type SubtaskStatus } from "@/lib/types/database";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

const STATUS_TRANSITIONS: Record<SubtaskStatus, SubtaskStatus[]> = {
  not_started: ["in_progress"],
  in_progress: ["done", "not_started"],
  done: ["not_started"],
  blocked: [],
  skipped: ["not_started"],
};

const STATUS_ACTION_LABELS: Partial<Record<SubtaskStatus, string>> = {
  in_progress: "Start",
  done: "Mark done",
  not_started: "Reopen",
};

interface SubtaskItemProps {
  subtask: TicketSubtask;
  index: number;
  blocked: boolean;
  dependency: TicketSubtask | null;
  photosForSubtask: TicketPhoto[];
  uploading: boolean;
  checklist?: boolean;
  isAdmin?: boolean;
  assignableStaff?: { id: string; name: string; skills?: string[] | null }[];
  onAssign?: (subtaskId: string, staffId: string | null) => void;
  userId?: string;
  onStatusChange: (subtask: TicketSubtask, newStatus: SubtaskStatus) => Promise<void>;
  onSkip: (subtask: TicketSubtask, reason: string) => Promise<void>;
  onPhotoUpload: (subtaskId: string, file: File) => Promise<void>;
  onDeletePhoto?: (photo: TicketPhoto) => void;
}

export function SubtaskItem({
  subtask,
  index,
  blocked,
  dependency,
  photosForSubtask,
  uploading,
  checklist = false,
  isAdmin = false,
  assignableStaff = [],
  userId,
  onAssign,
  onStatusChange,
  onSkip,
  onPhotoUpload,
  onDeletePhoto,
}: SubtaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [skipMode, setSkipMode] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [skipping, setSkipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDone = subtask.status === "done";
  const isSkipped = subtask.status === "skipped";
  const transitions = blocked ? [] : STATUS_TRANSITIONS[subtask.status] ?? [];

  async function handleAction(newStatus: SubtaskStatus) {
    setUpdating(true);
    await onStatusChange(subtask, newStatus);
    setUpdating(false);
  }

  async function confirmSkip() {
    const reason = skipReason.trim();
    if (!reason) return;
    setSkipping(true);
    await onSkip(subtask, reason);
    setSkipMode(false);
    setSkipReason("");
    setSkipping(false);
  }

  function handleRowClick() {
    if (expanded) {
      setSkipMode(false);
      setSkipReason("");
    }
    setExpanded((v) => !v);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onPhotoUpload(subtask.id, file);
    e.target.value = "";
  }

  return (
    <li
      className={cn(
        "rounded-xl border transition-all",
        isDone
          ? "bg-slate-50 border-slate-200"
          : isSkipped
          ? "bg-amber-50/40 border-amber-200/70"
          : blocked
          ? "bg-slate-50 border-slate-200 opacity-60"
          : "bg-white border-slate-200 shadow-sm"
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={handleRowClick}
      >
        {/* Leading indicator */}
        <div className="shrink-0">
          {checklist ? (
            isDone
              ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              : <Circle className="h-5 w-5 text-slate-300" />
          ) : isSkipped ? (
            <MinusCircle className="h-5 w-5 text-amber-400" />
          ) : isDone ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : blocked ? (
            <Lock className="h-4 w-4 text-slate-400" />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
              {index}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isDone ? "line-through text-slate-400" :
            isSkipped ? "text-slate-400" :
            "text-slate-900"
          )}>
            {subtask.title}
          </p>
          {!checklist && isSkipped && subtask.skip_reason && (
            <p className="text-xs italic text-amber-600/70 mt-0.5 truncate">
              Skipped: {subtask.skip_reason}
            </p>
          )}
          {!checklist && blocked && dependency && (
            <p className="text-xs text-slate-400 mt-0.5">
              Blocked — waiting on: {dependency.title}
            </p>
          )}
          {!checklist && !blocked && subtask.assigned_staff?.name && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {subtask.assigned_staff.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!checklist && <StatusBadge status={subtask.status} />}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 flex flex-col gap-3">
          {subtask.notes && (
            <p className="text-xs text-slate-600 leading-relaxed">{subtask.notes}</p>
          )}

          {/* Photos for this subtask */}
          {photosForSubtask.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photosForSubtask.filter((p) => p.url).map((photo) => (
                <div key={photo.id} className="relative shrink-0">
                  <a href={photo.url!} target="_blank" rel="noopener noreferrer" className="block">
                    <Image
                      src={photo.url!}
                      alt="Subtask photo"
                      width={72}
                      height={72}
                      className="rounded-lg object-cover w-[72px] h-[72px]"
                    />
                  </a>
                  {onDeletePhoto && (isAdmin || userId === photo.uploaded_by) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeletePhoto(photo); }}
                      aria-label="Delete photo"
                      className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 active:bg-red-600 transition-colors"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Per-stage assignment — sequenced (renovation) mode, admin only */}
          {!checklist && isAdmin && onAssign && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Assigned to</label>
              <select
                value={subtask.assigned_to ?? ""}
                onChange={(e) => { e.stopPropagation(); onAssign(subtask.id, e.target.value || null); }}
                onClick={(e) => e.stopPropagation()}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              >
                <option value="">Unassigned</option>
                {assignableStaff.map((s) => {
                  const suffix = s.skills?.length ? ` (${s.skills.join(", ")})` : "";
                  return <option key={s.id} value={s.id}>{s.name}{suffix}</option>;
                })}
              </select>
            </div>
          )}

          {skipMode ? (
            /* Skip reason capture */
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmSkip(); if (e.key === "Escape") { setSkipMode(false); setSkipReason(""); } }}
                placeholder="Reason for skipping…"
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-slate-300"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={skipping}
                  disabled={!skipReason.trim()}
                  onClick={(e) => { e.stopPropagation(); confirmSkip(); }}
                >
                  Confirm skip
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); setSkipMode(false); setSkipReason(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {/* Status action buttons */}
              {transitions.map((nextStatus) => (
                <Button
                  key={nextStatus}
                  size="sm"
                  variant={nextStatus === "done" ? "primary" : nextStatus === "not_started" ? "ghost" : "secondary"}
                  loading={updating}
                  disabled={blocked}
                  onClick={(e) => { e.stopPropagation(); handleAction(nextStatus); }}
                >
                  {STATUS_ACTION_LABELS[nextStatus] ?? nextStatus}
                </Button>
              ))}

              {/* Skip — sequenced mode only, not when already terminal */}
              {!checklist && !isDone && !isSkipped && !blocked && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); setSkipMode(true); }}
                >
                  Skip
                </Button>
              )}

              {/* Photo upload — not for skipped items */}
              {!blocked && !isSkipped && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={uploading}
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    <Camera className="h-4 w-4" />
                    Add photo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
