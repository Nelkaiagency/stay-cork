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
    supabase
      .from("properties")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("tenants")
      .select("id, tenant_name, check_out_date, property_id, status, business_id, property:properties!property_id(id, name, address, housekeeping_status)")
      .eq("business_id", businessId)
      .eq("status", "current")
      .order("check_out_date", { ascending: true }),
  ]);

  const turnoverList = (turnovers as unknown as (Tenant & { property: Pick<Property, "id" | "name" | "address" | "housekeeping_status"> })[]) ?? [];

  function PropertyCard({ property }: { property: Property }) {
    return (
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
          <StatusBadge status={property.housekeeping_status} />
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">
      {/* Turnover priority — properties with current guests sorted by checkout */}
      {turnoverList.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">Turnover due</h2>
          </div>
          <ul className="flex flex-col gap-2">
            {turnoverList.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/housekeeping/${t.property_id}`}
                  className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 hover:border-amber-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{t.property?.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.tenant_name} · out {formatDate(t.check_out_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={t.property?.housekeeping_status ?? "dirty"} />
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* All active properties */}
      <section className="flex flex-col gap-3">
        {turnoverList.length > 0 && (
          <h2 className="text-sm font-semibold text-slate-700">All properties</h2>
        )}
        {!properties?.length ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <Home className="h-10 w-10" />
            <p className="text-sm">No properties found</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {(properties as Property[]).map((property) => (
              <li key={property.id}>
                <PropertyCard property={property} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
