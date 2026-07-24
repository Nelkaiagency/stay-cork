export interface StaffWorkloadRow {
  staff_name: string;
  role: string;
  open_count: number;
}

export function StaffWorkloadList({ data }: { data: StaffWorkloadRow[] }) {
  // Group by role, sort groups by total load descending
  const byRole = data.reduce<Record<string, StaffWorkloadRow[]>>((acc, item) => {
    (acc[item.role] ??= []).push(item);
    return acc;
  }, {});

  const sortedRoles = Object.entries(byRole).sort(
    (a, b) =>
      b[1].reduce((s, x) => s + x.open_count, 0) -
      a[1].reduce((s, x) => s + x.open_count, 0)
  );

  const maxCount = Math.max(...data.map((d) => d.open_count), 1);

  return (
    <div className="flex flex-col gap-5">
      {sortedRoles.map(([role, members]) => (
        <div key={role}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 capitalize">
            {role.replace(/_/g, " ")}
          </p>
          <ul className="flex flex-col gap-2">
            {[...members]
              .sort((a, b) => b.open_count - a.open_count)
              .map((member) => (
                <li key={member.staff_name} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm text-slate-700">
                    {member.staff_name}
                  </span>
                  <div className="relative flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-indigo-400 transition-all"
                      style={{ width: `${(member.open_count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 shrink-0 text-right text-xs font-semibold text-slate-500">
                    {member.open_count}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
