import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Building2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { type Property, type PropertyStatus } from "@/lib/types/database";

const STATUS_LABELS: Record<PropertyStatus, string> = {
  planned:            "Planned",
  under_construction: "Under construction",
  active:             "Active",
  inactive:           "Inactive",
};

const STATUS_COLORS: Record<PropertyStatus, string> = {
  planned:            "bg-amber-100 text-amber-700",
  under_construction: "bg-orange-100 text-orange-700",
  active:             "bg-emerald-100 text-emerald-700",
  inactive:           "bg-slate-100 text-slate-500",
};

export default async function PropertiesPage() {
  const { businessId, role } = await getCurrentBusiness();
  if (role !== "admin") notFound();

  const supabase = createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address, status, property_type, housekeeping_status, bedrooms, bathrooms, has_kitchen, has_living_room, notes, capacity, created_at, business_id")
    .eq("business_id", businessId)
    .order("name");

  const list = (properties as Property[]) ?? [];

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Properties</h1>
        <Link
          href="/properties/new"
          className="flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <Building2 className="h-10 w-10" />
          <p className="text-sm">No properties yet</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((property) => (
            <li key={property.id}>
              <Link
                href={`/housekeeping/${property.id}`}
                className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{property.name}</p>
                  {property.address && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{property.address}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[property.status]}`}>
                    {STATUS_LABELS[property.status]}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
