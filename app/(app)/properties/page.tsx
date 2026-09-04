import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Building2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { type Property, type PropertyStatus } from "@/lib/types/database";

const STATUS_LABELS: Record<PropertyStatus, string> = {
  planned: "Planned",
  under_construction: "Under construction",
  active: "Active",
  inactive: "Inactive",
};

const STATUS_COLORS: Record<PropertyStatus, string> = {
  planned: "bg-amber-50 text-amber-700",
  under_construction: "bg-orange-50 text-orange-700",
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
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
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mb-5 flex items-start justify-between gap-4 lg:mb-6">
        <div className="lg:hidden">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Properties</h1>
          <p className="mt-1 text-sm text-slate-500">View operational status across the Stay Cork portfolio.</p>
        </div>
        <div className="ml-auto">
          <Link
            href="/properties/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0d2b54] px-4 text-xs font-semibold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Property
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 text-slate-400 shadow-sm">
          <Building2 className="h-10 w-10" />
          <p className="text-sm">No properties yet</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((property) => (
            <li key={property.id}>
              <Link
                href={`/housekeeping/${property.id}`}
                className="group flex h-full min-h-40 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_COLORS[property.status]}`}>
                    {STATUS_LABELS[property.status]}
                  </span>
                </div>

                <div className="mt-5 min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-950 group-hover:text-blue-700">{property.name}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{property.address || "No address added"}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span>{property.capacity ? `Capacity ${property.capacity}` : property.property_type || "Property"}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                    Open <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
