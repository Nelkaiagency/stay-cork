"use client";

import { useState } from "react";
import { Wrench, Home, Users } from "lucide-react";
import { TeamMemberCard, type CardTicket, type CardSubtask, type UnassignedTicket } from "./team-member-card";

export interface TeamStaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  skills: string[] | null;
  tickets: CardTicket[];
  subtasks: CardSubtask[];
}

interface TeamViewProps {
  maintenanceStaff: TeamStaffMember[];
  housekeepingStaff: TeamStaffMember[];
  maintenanceUnassigned: UnassignedTicket[];
  housekeepingUnassigned: UnassignedTicket[];
  totalActive: number;
}

export function TeamView({
  maintenanceStaff,
  housekeepingStaff,
  maintenanceUnassigned,
  housekeepingUnassigned,
  totalActive,
}: TeamViewProps) {
  const [maintenancePool, setMaintenancePool] = useState<UnassignedTicket[]>(maintenanceUnassigned);
  const [housekeepingPool, setHousekeepingPool] = useState<UnassignedTicket[]>(housekeepingUnassigned);

  function makePoolAdd(setter: React.Dispatch<React.SetStateAction<UnassignedTicket[]>>) {
    return (ticket: UnassignedTicket) =>
      setter((prev) => [...prev, ticket].sort((a, b) => a.title.localeCompare(b.title)));
  }

  function makePoolRemove(setter: React.Dispatch<React.SetStateAction<UnassignedTicket[]>>) {
    return (ticketId: string) =>
      setter((prev) => prev.filter((t) => t.id !== ticketId));
  }

  const maintenanceAdd    = makePoolAdd(setMaintenancePool);
  const maintenanceRemove = makePoolRemove(setMaintenancePool);
  const housekeepingAdd    = makePoolAdd(setHousekeepingPool);
  const housekeepingRemove = makePoolRemove(setHousekeepingPool);

  const hasStaff = maintenanceStaff.length > 0 || housekeepingStaff.length > 0;

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Team</h1>
        <span className="text-xs text-slate-500">
          {totalActive} active ticket{totalActive !== 1 ? "s" : ""}
        </span>
      </div>

      {!hasStaff ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <Users className="h-10 w-10" />
          <p className="text-sm">No staff members found</p>
        </div>
      ) : (
        <>
          {maintenanceStaff.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700">Maintenance</h2>
              </div>
              <div className="flex flex-col gap-3">
                {maintenanceStaff.map((m) => (
                  <TeamMemberCard
                    key={m.id}
                    member={m}
                    available={maintenancePool}
                    onPoolAdd={maintenanceAdd}
                    onPoolRemove={maintenanceRemove}
                  />
                ))}
              </div>
            </section>
          )}

          {housekeepingStaff.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700">Housekeeping</h2>
              </div>
              <div className="flex flex-col gap-3">
                {housekeepingStaff.map((m) => (
                  <TeamMemberCard
                    key={m.id}
                    member={m}
                    available={housekeepingPool}
                    onPoolAdd={housekeepingAdd}
                    onPoolRemove={housekeepingRemove}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
