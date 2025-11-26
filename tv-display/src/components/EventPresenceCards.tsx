interface EventPresenceCardsProps {
  present: number;
  away: number;
  pending: number;
}

export function EventPresenceCards({
  present,
  away,
  pending,
}: EventPresenceCardsProps) {
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

      <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-8 flex flex-col items-center justify-center tv-mode">
        <div className="text-orange-600 text-9xl font-bold leading-none">
          {away}
        </div>
        <div className="text-orange-700 text-4xl font-semibold mt-4">
          Away
        </div>
      </div>

      <div className="bg-gray-50 border-2 border-gray-400 rounded-lg p-8 flex flex-col items-center justify-center tv-mode">
        <div className="text-gray-600 text-9xl font-bold leading-none">
          {pending}
        </div>
        <div className="text-gray-700 text-4xl font-semibold mt-4">
          Pending
        </div>
      </div>
    </div>
  );
}
