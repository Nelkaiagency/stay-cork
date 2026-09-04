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
    return (ticketId: string) => setter((prev) => prev.filter((ticket) => ticket.id !== ticketId));
  }

  const maintenanceAdd = makePoolAdd(setMaintenancePool);
  const maintenanceRemove = makePoolRemove(setMaintenancePool);
  const housekeepingAdd = makePoolAdd(setHousekeepingPool);
  const housekeepingRemove = makePoolRemove(setHousekeepingPool);
  const hasStaff = maintenanceStaff.length > 0 || housekeepingStaff.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mb-5 flex items-start justify-between gap-4 lg:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Team</h1>
          <p className="mt-1 text-sm text-slate-500">Assignments, workload and unassigned jobs.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {totalActive} active
        </span>
      </div>

      {!hasStaff ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 text-slate-400 shadow-sm">
          <Users className="h-10 w-10" />
          <p className="text-sm">No staff members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {maintenanceStaff.length > 0 && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Maintenance</h2>
                    <p className="text-xs text-slate-500">{maintenanceStaff.length} team members</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{maintenancePool.length} unassigned</span>
              </div>
              <div className="flex flex-col gap-3">
                {maintenanceStaff.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    available={maintenancePool}
                    onPoolAdd={maintenanceAdd}
                    onPoolRemove={maintenanceRemove}
                  />
                ))}
              </div>
            </section>
          )}

          {housekeepingStaff.length > 0 && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Home className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Housekeeping</h2>
                    <p className="text-xs text-slate-500">{housekeepingStaff.length} team members</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{housekeepingPool.length} unassigned</span>
              </div>
              <div className="flex flex-col gap-3">
                {housekeepingStaff.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    available={housekeepingPool}
                    onPoolAdd={housekeepingAdd}
                    onPoolRemove={housekeepingRemove}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
