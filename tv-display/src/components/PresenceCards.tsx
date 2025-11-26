interface PresenceCardsProps {
  present: number;
  absent: number;
  visitors: number;
}

export function PresenceCards({ present, absent, visitors }: PresenceCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-8 w-full">
      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-lg p-8 flex flex-col items-center justify-center tv-mode">
        <div className="text-emerald-600 text-9xl font-bold leading-none">
          {present}
        </div>
        <div className="text-emerald-700 text-4xl font-semibold mt-4">
          Present
        </div>
      </div>

      <div className="bg-slate-50 border-2 border-slate-400 rounded-lg p-8 flex flex-col items-center justify-center tv-mode">
        <div className="text-slate-600 text-9xl font-bold leading-none">
          {absent}
        </div>
        <div className="text-slate-700 text-4xl font-semibold mt-4">
          Absent
        </div>
      </div>

      <div className="bg-sky-50 border-2 border-sky-500 rounded-lg p-8 flex flex-col items-center justify-center tv-mode">
        <div className="text-sky-600 text-9xl font-bold leading-none">
          {visitors}
        </div>
        <div className="text-sky-700 text-4xl font-semibold mt-4">
          Visitors
        </div>
      </div>
    </div>
  );
}
