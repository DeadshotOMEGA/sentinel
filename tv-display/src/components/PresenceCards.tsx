interface PresenceCardsProps {
  present: number;
  absent: number;
  visitors: number;
}

/**
 * TV-optimized presence statistics cards
 *
 * Design for wall display viewing:
 * - Large text: 6xl for values (48-72px), 2xl for labels (24px)
 * - Filled backgrounds (not just borders) for better visibility
 * - Color-coded: green (present), gray (absent), blue (visitors)
 * - High contrast ratios meeting WCAG AA
 */
export function PresenceCards({ present, absent, visitors }: PresenceCardsProps) {
  return (
    <div className="flex gap-4 items-center">
      {/* Present - Success (Green) - reduced padding */}
      <div className="bg-green-100 text-green-800 border-2 border-green-200 rounded-2xl px-6 py-4 flex flex-col items-center min-w-[160px]">
        <p className="text-5xl font-bold mb-1">{present}</p>
        <p className="text-xl font-medium">Present</p>
      </div>

      {/* Absent - Neutral (Gray) - reduced padding */}
      <div className="bg-gray-100 text-gray-800 border-2 border-gray-200 rounded-2xl px-6 py-4 flex flex-col items-center min-w-[160px]">
        <p className="text-5xl font-bold mb-1">{absent}</p>
        <p className="text-xl font-medium">Absent</p>
      </div>

      {/* Visitors - Info (Blue) - reduced padding */}
      <div className="bg-blue-100 text-blue-800 border-2 border-blue-200 rounded-2xl px-6 py-4 flex flex-col items-center min-w-[160px]">
        <p className="text-5xl font-bold mb-1">{visitors}</p>
        <p className="text-xl font-medium">Visitors</p>
      </div>
    </div>
  );
}
