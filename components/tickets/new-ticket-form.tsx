"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Property,
  IssueLabel,
  AppUser,
  TicketType,
  TicketPriority,
  PropertyType,
} from "@/lib/types/database";

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  room:     "Room",
  dorm_bed: "Bed",
  unit:     "Unit",
};

const TICKET_TYPES: { value: TicketType; label: string }[] = [
  { value: "maintenance",  label: "Maintenance" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "renovation",   label: "Renovation" },
];

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
  { value: "urgent", label: "Urgent" },
];

const INPUT_CLS =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent disabled:opacity-50";

interface NewTicketFormProps {
  properties: Pick<Property, "id" | "name" | "property_type">[];
  labels: Pick<IssueLabel, "id" | "ticket_type" | "label_name">[];
  staff: Pick<AppUser, "id" | "name" | "role" | "skills">[];
  isAdmin?: boolean;
  appUserId: string;
  action: (formData: FormData) => Promise<string>;
}

export function NewTicketForm({
  properties,
  labels,
  staff,
  isAdmin = false,
  appUserId,
  action,
}: NewTicketFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [type, setType] = useState<TicketType | "">("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLabels = labels.filter((l) => l.ticket_type === type);
  const filteredStaff = staff.filter((s) =>
    type === "housekeeping" ? s.role === "housekeeping" : s.role === "maintenance"
  );
  const showLabels = type === "maintenance" || type === "housekeeping";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []) as File[];
    if (!files.length) return;
    setSelectedFiles((prev) => [...prev, ...files]);
    setPreviewUrls((prev) => [...prev, ...files.map((f: File) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
    setPreviewUrls((prev: string[]) => prev.filter((_: string, i: number) => i !== index));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      let ticketId: string;

      // 1. Create the ticket via server action
      try {
        ticketId = await action(fd);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create ticket");
        return;
      }

      // 2. Upload photos (best-effort — ticket is already created)
      const failedNames: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split(".").pop() ?? "jpg";
        const storagePath = `${ticketId}/${Date.now()}-${i}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("ticket-photos")
          .upload(storagePath, file, { upsert: false });

        if (uploadErr) {
          failedNames.push(file.name);
          continue;
        }

        await supabase.from("ticket_photos").insert({
          ticket_id: ticketId,
          subtask_id: null,
          storage_path: storagePath,
          url: null,
          uploaded_by: appUserId,
        });
      }

      // 3. Navigate to the new ticket
      if (failedNames.length > 0) {
        // Surface a non-blocking warning but still navigate — ticket exists
        setError(
          `${failedNames.length} photo${failedNames.length > 1 ? "s" : ""} failed to upload (${failedNames.join(", ")}). You can add them from the ticket page.`
        );
        // Give the user a moment to read the error before navigating
        await new Promise((r) => setTimeout(r, 2500));
      }

      router.push(`/tickets/${ticketId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Location */}
      <select name="property_id" required className={INPUT_CLS}>
        <option value="">Location *</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {PROPERTY_TYPE_LABELS[p.property_type]} — {p.name}
          </option>
        ))}
      </select>

      {/* Ticket type */}
      <select
        name="type"
        required
        className={INPUT_CLS}
        value={type}
        onChange={(e) => setType(e.target.value as TicketType | "")}
      >
        <option value="">Ticket type *</option>
        {TICKET_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Label / category — maintenance + housekeeping only */}
      {showLabels && (
        <select name="label_id" className={INPUT_CLS} disabled={!type}>
          <option value="">Category (optional)</option>
          {filteredLabels.map((l) => (
            <option key={l.id} value={l.id}>{l.label_name}</option>
          ))}
        </select>
      )}

      {/* Title */}
      <input
        name="title"
        type="text"
        required
        placeholder="Title *"
        className={INPUT_CLS}
      />

      {/* Description */}
      <textarea
        name="description"
        rows={3}
        placeholder="Additional details (optional)"
        className={`${INPUT_CLS} resize-none`}
      />

      {/* Priority */}
      <select name="priority" required className={INPUT_CLS}>
        <option value="">Priority *</option>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Assignee — admin only, not for renovation (per-stage assignments instead) */}
      {isAdmin && type && type !== "renovation" && (
        <select name="assigned_to" className={INPUT_CLS}>
          <option value="">Assign to (optional)</option>
          {filteredStaff.map((s) => {
            const skillSuffix = s.skills?.length ? ` (${s.skills.join(", ")})` : "";
            return (
              <option key={s.id} value={s.id}>{s.name}{skillSuffix}</option>
            );
          })}
        </select>
      )}

      {/* Photo upload */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          {selectedFiles.length > 0
            ? `${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""} selected · Add more`
            : "Add photos (optional)"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {previewUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Preview ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => removePhoto(i)}
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => router.back()}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-base font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-base font-semibold text-white disabled:opacity-50 transition-opacity"
        >
          {isPending
            ? selectedFiles.length > 0
              ? "Uploading…"
              : "Creating…"
            : "Create ticket"}
        </button>
      </div>
    </form>
  );
}
