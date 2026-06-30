"use client";

import { useRef, useState } from "react";
import { createProperty } from "@/app/(app)/properties/new/actions";

const PROPERTY_TYPES = [
  { value: "unit",     label: "Unit (apartment/studio)" },
  { value: "room",     label: "Room" },
  { value: "dorm_bed", label: "Dorm bed" },
];

const PROPERTY_STATUSES = [
  { value: "planned",            label: "Planned" },
  { value: "under_construction", label: "Under construction" },
  { value: "active",             label: "Active" },
  { value: "inactive",           label: "Inactive" },
];

const ROOM_UNIT_TYPES = new Set(["unit", "room"]);

export function NewPropertyForm({ hasError }: { hasError: boolean }) {
  const [propertyType, setPropertyType] = useState("unit");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const showRooms = ROOM_UNIT_TYPES.has(propertyType);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    await createProperty(fd);
    setSubmitting(false);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      {hasError && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to create property. Please try again.
        </p>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700" htmlFor="name">
          Property name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Room 12, Unit A3"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
        />
      </div>

      {/* Address */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700" htmlFor="address">
          Address <span className="text-xs text-slate-400">(optional)</span>
        </label>
        <input
          id="address"
          name="address"
          type="text"
          placeholder="e.g. 42 Patrick Street, Cork"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
        />
      </div>

      {/* Type + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="property_type">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            id="property_type"
            name="property_type"
            required
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="status">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            id="status"
            name="status"
            required
            defaultValue="planned"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
          >
            {PROPERTY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Capacity */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700" htmlFor="capacity">
          Capacity <span className="text-xs text-slate-400">(optional)</span>
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="Max guests"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
        />
      </div>

      {/* Bedrooms / Bathrooms — room and unit types only */}
      {showRooms && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="bedrooms">
              Bedrooms
            </label>
            <input
              id="bedrooms"
              name="bedrooms"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="bathrooms">
              Bathrooms
            </label>
            <input
              id="bathrooms"
              name="bathrooms"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Has kitchen */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="has_kitchen"
          value="true"
          className="h-4 w-4 rounded border-slate-300 accent-[var(--brand-primary)]"
        />
        <span className="text-sm font-medium text-slate-700">Has shared kitchen</span>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50 mt-1"
      >
        {submitting ? "Creating…" : "Create property"}
      </button>
    </form>
  );
}
