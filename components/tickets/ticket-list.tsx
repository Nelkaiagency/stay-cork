"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, ClipboardList, Plus, Search } from "lucide-react";
import type { Property, Ticket, TicketStatus, TicketType } from "@/lib/types/database";
import { StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { formatDistanceToNow } from "@/lib/utils-date";
import { getLabelClasses } from "@/lib/label-colors";

const STATUS_OPTIONS: { value: TicketStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

const TYPE_OPTIONS: { value: TicketType | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "maintenance", label: "Maintenance" },
  { value: "renovation", label: "Renovations" },
  { value: "housekeeping", label: "Housekeeping" },
];

interface TicketListProps {
  tickets: Ticket[];
  properties: Pick<Property, "id" | "name">[];
  activeStatus: TicketStatus | null;
  activeProperty: string | null;
  activeType?: TicketType | null;
  query?: string;
  canCreate?: boolean;
}

function priorityClass(priority: Ticket["priority"]) {
  if (priority === "urgent") return "bg-red-50 text-red-700";
  if (priority === "high") return "bg-orange-50 text-orange-700";
  if (priority === "medium") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export function TicketList({
  tickets,
  properties,
  activeStatus,
  activeProperty,
  activeType = null,
  query = "",
  canCreate = false,
}: TicketListProps) {
  const router = useRouter();
  const pathname = usePathname();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "status" && activeStatus) params.set("status", activeStatus);
    if (key !== "property" && activeProperty) params.set("property", activeProperty);
    if (key !== "type" && activeType) params.set("type", activeType);
    if (key !== "q" && query) params.set("q", query);
    if (value) params.set(key, value);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mb-5 flex items-start justify-between gap-4 lg:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">Track maintenance, housekeeping and renovation work.</p>
        </div>
        {canCreate && (
          <Link href="/tickets/new" className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#0d2b54] px-3 text-xs font-semibold text-white">
            <Plus className="h-4 w-4" /> New
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <Select label="Status" value={activeStatus ?? ""} onChange={(e) => updateFilter("status", e.target.value)}>
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Select label="Type" value={activeType ?? ""} onChange={(e) => updateFilter("type", e.target.value)}>
                {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Select label="Property" value={activeProperty ?? ""} onChange={(e) => updateFilter("property", e.target.value)}>
                <option value="">All properties</option>
                {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <form action={pathname} className="relative flex-1 xl:w-64">
                {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
                {activeType && <input type="hidden" name="type" value={activeType} />}
                {activeProperty && <input type="hidden" name="property" value={activeProperty} />}
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Search tickets"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </form>
              <span className="whitespace-nowrap text-xs text-slate-400">{tickets.length} results</span>
              {canCreate && (
                <Link href="/tickets/new" className="hidden h-10 items-center gap-1.5 rounded-xl bg-[#0d2b54] px-4 text-xs font-semibold text-white lg:flex">
                  <Plus className="h-4 w-4" /> New Ticket
                </Link>
              )}
            </div>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
            <ClipboardList className="h-9 w-9" />
            <p className="text-sm">No tickets match these filters.</p>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(300px,1.8fr)_1fr_0.7fr_0.7fr_0.7fr_1fr_80px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid">
              <span>Ticket</span><span>Property</span><span>Type</span><span>Status</span><span>Priority</span><span>Assigned</span><span className="text-right">Updated</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link href={`/tickets/${ticket.id}`} className="group block px-4 py-4 transition hover:bg-slate-50/70 sm:px-5 lg:grid lg:grid-cols-[minmax(300px,1.8fr)_1fr_0.7fr_0.7fr_0.7fr_1fr_80px] lg:items-center lg:gap-4">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700">{ticket.title}</p>
                        {ticket.label?.label_name && (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getLabelClasses(ticket.label.label_name)}`}>{ticket.label.label_name}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400 lg:hidden">Opened {formatDistanceToNow(ticket.created_at)}</p>
                    </div>

                    <p className="mt-2 truncate text-xs text-slate-500 lg:mt-0 lg:text-sm">{ticket.property?.name ?? "Unknown property"}</p>
                    <p className="hidden text-xs font-medium capitalize text-slate-600 lg:block">{ticket.type}</p>
                    <div className="mt-3 flex items-center gap-2 lg:mt-0"><StatusBadge status={ticket.status} /></div>
                    <div className="mt-2 lg:mt-0"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${priorityClass(ticket.priority)}`}>{ticket.priority}</span></div>
                    <p className="mt-2 truncate text-xs text-slate-500 lg:mt-0 lg:text-sm">{ticket.assigned_staff?.name ?? "Unassigned"}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400 lg:mt-0 lg:justify-end">
                      <span>{formatDistanceToNow(ticket.updated_at)}</span>
                      <ChevronRight className="h-4 w-4 lg:hidden" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
