import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { StatusBadge } from "@/components/ui/badge";
import { type Property, type Tenant } from "@/lib/types/database";
import { ChevronRight, Home, CalendarClock } from "lucide-react";
import { formatDate } from "@/lib/utils-date";

export default async function HousekeepingIndexPage() {
  const { businessId } = await getCurrentBusiness();
  const supabase = createClient();

  const [{ data: properties }, { data: turnovers }] = await Promise.all([
    supabase.from("properties").select("*").eq("business_id", businessId).eq("status", "active").order("name"),
    supabase
      .from("tenants")
      .select("id, tenant_name, check_out_date, property_id, status, business_id, property:properties!property_id(id, name, address, housekeeping_status)")
      .eq("business_id", businessId)
      .eq("status", "current")
      .order("check_out_date", { ascending: true }),
  ]);

  const turnoverList = (turnovers as unknown as (Tenant & { property: Pick<Property, "id" | "name" | "address" | "housekeeping_status"> })[]) ?? [];
  const propertyList = (properties as Property[]) ?? [];

  function PropertyCard({ property }: { property: Property }) {
    return (
      <Link
        href={`/housekeeping/${property.id}`}
        className="group flex h-full min-h-36 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Home className="h-5 w-5" />
          </div>
          <StatusBadge status={property.housekeeping_status} />
        </div>
        <div className="mt-5 min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-950 group-hover:text-blue-700">{property.name}</p>
          <p className="mt-1 truncate text-sm text-slate-500">{property.address || "No address added"}</p>
        </div>
        <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
          Open checklist <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </div>
      </Link>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mb-5 lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Housekeeping</h1>
        <p className="mt-1 text-sm text-slate-500">Prioritise turnovers and keep every property ready.</p>
      </div>

      {turnoverList.length > 0 && (
        <section className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Turnovers due</h2>
              <p className="text-xs text-slate-500">Current guests ordered by checkout date.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {turnoverList.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/housekeeping/${tenant.property_id}`}
                className="flex items-center gap-3 rounded-xl border border-amber-100 bg-white px-4 py-3.5 shadow-sm transition hover:border-amber-200"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{tenant.property?.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{tenant.tenant_name} · out {formatDate(tenant.check_out_date)}</p>
                </div>
                <StatusBadge status={tenant.property?.housekeeping_status ?? "dirty"} />
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">All properties</h2>
            <p className="mt-0.5 text-xs text-slate-500">{propertyList.length} active properties</p>
          </div>
        </div>

        {!propertyList.length ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 text-slate-400 shadow-sm">
            <Home className="h-10 w-10" />
            <p className="text-sm">No properties found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {propertyList.map((property) => <PropertyCard key={property.id} property={property} />)}
          </div>
        )}
      </section>
    </div>
  );
}
