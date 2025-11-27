interface PresenceCardsProps {
  present: number;
  absent: number;
  visitors: number;
}

export function PresenceCards({ present, absent, visitors }: PresenceCardsProps) {
  return (
    <div className="flex gap-3 items-center justify-center">
      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-lg px-4 py-2 flex items-center gap-3 tv-mode">
        <div className="text-emerald-700 text-lg font-semibold">
          Present
        </div>
        <div className="text-emerald-600 text-4xl font-bold leading-none">
          {present}
        </div>
      </div>

      <div className="bg-slate-50 border-2 border-slate-400 rounded-lg px-4 py-2 flex items-center gap-3 tv-mode">
        <div className="text-slate-700 text-lg font-semibold">
          Absent
        </div>
        <div className="text-slate-600 text-4xl font-bold leading-none">
          {absent}
        </div>
      </div>

      <div className="bg-sky-50 border-2 border-sky-500 rounded-lg px-4 py-2 flex items-center gap-3 tv-mode">
        <div className="text-sky-700 text-lg font-semibold">
          Visitors
        </div>
        <div className="text-sky-600 text-4xl font-bold leading-none">
          {visitors}
        </div>
      </div>
    </div>
  );
}
