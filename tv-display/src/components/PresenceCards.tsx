interface PresenceCardsProps {
  present: number;
  absent: number;
  visitors: number;
}

export function PresenceCards({ present, absent, visitors }: PresenceCardsProps) {
  return (
    <div className="flex gap-2 items-center">
      <div className="bg-emerald-50 border border-emerald-500 rounded-md px-3 py-1 flex items-center gap-2">
        <span className="text-emerald-700 text-sm font-medium">Present</span>
        <span className="text-emerald-600 text-2xl font-bold">{present}</span>
      </div>

      <div className="bg-slate-50 border border-slate-400 rounded-md px-3 py-1 flex items-center gap-2">
        <span className="text-slate-700 text-sm font-medium">Absent</span>
        <span className="text-slate-600 text-2xl font-bold">{absent}</span>
      </div>

      <div className="bg-sky-50 border border-sky-500 rounded-md px-3 py-1 flex items-center gap-2">
        <span className="text-sky-700 text-sm font-medium">Visitors</span>
        <span className="text-sky-600 text-2xl font-bold">{visitors}</span>
      </div>
    </div>
  );
}
