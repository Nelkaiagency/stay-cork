import { cn } from "@/lib/utils";
import { type TicketStatus, type SubtaskStatus, type HousekeepingStatus } from "@/lib/types/database";

const statusStyles: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  not_started: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
  done: "bg-green-100 text-green-700",
  dirty: "bg-orange-100 text-orange-700",
  clean: "bg-emerald-100 text-emerald-700",
  inspected: "bg-purple-100 text-purple-700",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  not_started: "Not Started",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  dirty: "Dirty",
  clean: "Clean",
  inspected: "Inspected",
};

interface BadgeProps {
  status: TicketStatus | SubtaskStatus | HousekeepingStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? "bg-gray-100 text-gray-700",
        className
      )}
    >
      {statusLabels[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}
