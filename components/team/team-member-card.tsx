"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, X, Layers } from "lucide-react";
import { assignTicketToStaff, unassignTicket } from "@/app/(app)/team/actions";
import { StatusBadge } from "@/components/ui/badge";
import { type TicketPriority, type TicketStatus, type TicketType } from "@/lib/types/database";

export interface CardTicket {
  id: string;
  title: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  property: { name: string } | null;
}

export interface UnassignedTicket {
  id: string;
  title: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  property: { name: string } | null;
}

export interface CardSubtask {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "blocked";
  ticket: {
    id: string;
    title: string;
    property: { name: string } | null;
  };
}

export interface TeamMemberCardProps {
  member: {
    id: string;
    name: string;
    role: string;
    skills: string[] | null;
    tickets: CardTicket[];
    subtasks: CardSubtask[];
  };
  available: UnassignedTicket[];
  onPoolAdd: (ticket: UnassignedTicket) => void;
  onPoolRemove: (ticketId: string) => void;
}

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low:    "bg-slate-100 text-slate-500",
  medium: "bg-amber-100 text-amber-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const SUBTASK_STATUS_COLORS: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-500",
  in_progress: "bg-blue-100 text-blue-700",
  blocked:     "bg-red-100 text-red-700",
};

export function TeamMemberCard({ member, available, onPoolAdd, onPoolRemove }: TeamMemberCardProps) {
  const [tickets, setTickets] = useState<CardTicket[]>(member.tickets);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAssign(ticketId: string) {
    if (!ticketId) return;
    const ticket = available.find((t) => t.id === ticketId);
    if (!ticket) return;

    setTickets((prev) => [...prev, ticket]);
    onPoolRemove(ticketId);
    setAssignError(null);

    startTransition(async () => {
      try {
        const result = await assignTicketToStaff(ticketId, member.id, member.name);
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, ...result, type: result.type as TicketType, status: result.status as TicketStatus, priority: result.priority as TicketPriority }
              : t
          )
        );
      } catch (err) {
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
        onPoolAdd(ticket);
        setAssignError(err instanceof Error ? err.message : "Assignment failed");
      }
    });
  }

  function handleUnassign(ticketId: string) {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    onPoolAdd(ticket);
    setAssignError(null);

    startTransition(async () => {
      try {
        await unassignTicket(ticketId, member.id, member.name);
      } catch (err) {
        setTickets((prev) => [...prev, ticket]);
        onPoolRemove(ticketId);
        setAssignError(err instanceof Error ? err.message : "Unassign failed");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900">{member.name}</p>
          {member.role === "maintenance" && member.skills && member.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {member.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--brand-primary)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            tickets.length + member.subtasks.length > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {tickets.length + member.subtasks.length} active
        </span>
      </div>

      {/* Ticket list */}
      {tickets.length === 0 && member.subtasks.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-400 italic">No active tickets</p>
      ) : tickets.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {tickets.map((t) => (
            <li key={t.id} className="flex items-stretch">
              <Link
                href={`/tickets/${t.id}`}
                className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors min-w-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {t.property?.name ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[t.priority]}`}>
                    {t.priority}
                  </span>
                  <StatusBadge status={t.status} />
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </div>
              </Link>
              <button
                onClick={() => handleUnassign(t.id)}
                disabled={isPending}
                title="Unassign"
                className="flex items-center px-3 border-l border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Stage assignments — subtasks of renovation tickets */}
      {member.subtasks.length > 0 && (
        <ul className={`divide-y divide-slate-100 ${tickets.length > 0 ? "border-t border-dashed border-slate-200" : ""}`}>
          {member.subtasks.map((s) => (
            <li key={s.id}>
              <Link
                href={`/tickets/${s.ticket.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <Layers className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{s.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {s.ticket.title} · {s.ticket.property?.name ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SUBTASK_STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {s.status.replace("_", " ")}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Assign work row — only when unassigned tickets exist */}
      {available.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2.5">
          <select
            value=""
            onChange={(e) => handleAssign(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent disabled:opacity-50 cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
          >
            <option value="" disabled>
              {isPending ? "Saving…" : "Assign unassigned work…"}
            </option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          {assignError && (
            <p className="mt-1 text-xs text-red-600">{assignError}</p>
          )}
        </div>
      )}
    </div>
  );
}
