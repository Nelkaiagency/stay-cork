"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { type Ticket, type Property, type TicketStatus } from "@/lib/types/database";
import { StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ChevronRight, ClipboardList, Plus } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils-date";
import { getLabelClasses } from "@/lib/label-colors";

const STATUS_OPTIONS: { value: TicketStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

interface TicketListProps {
  tickets: Ticket[];
  properties: Pick<Property, "id" | "name">[];
  activeStatus: TicketStatus | null;
  activeProperty: string | null;
  canCreate?: boolean;
}

export function TicketList({ tickets, properties, activeStatus, activeProperty, canCreate = false }: TicketListProps) {
  const router = useRouter();
  const pathname = usePathname();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "status" && activeStatus) params.set("status", activeStatus);
    if (key !== "property" && activeProperty) params.set("property", activeProperty);
    if (value) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Tickets</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{tickets.length} result{tickets.length !== 1 ? "s" : ""}</span>
          {canCreate && (
            <Link
              href="/tickets/new"
              className="flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          label="Status"
          value={activeStatus ?? ""}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="flex-1"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>

        <Select
          label="Property"
          value={activeProperty ?? ""}
          onChange={(e) => updateFilter("property", e.target.value)}
          className="flex-1"
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>

      {/* Ticket cards */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <ClipboardList className="h-10 w-10" />
          <p className="text-sm">No tickets found</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/tickets/${ticket.id}`}
                className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{ticket.title}</p>
                    {ticket.label?.label_name && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${getLabelClasses(ticket.label.label_name)}`}>
                        {ticket.label.label_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {ticket.property?.name ?? "Unknown property"} · Opened {formatDistanceToNow(ticket.created_at)}
                  </p>
                  {ticket.assigned_staff?.name && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      Assigned to {ticket.assigned_staff.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={ticket.status} />
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
