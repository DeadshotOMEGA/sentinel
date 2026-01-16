interface PresenceCardsProps {
  present: number;
  absent: number;
  visitors: number;
}

/**
 * TV-optimized presence statistics cards.
 *
 * Design for wall display viewing:
 * - Large text: 5xl for values, xl for labels
 * - Filled backgrounds (not just borders) for better visibility
 * - Color-coded using HeroUI semantic colors:
 *   - success (green) for present
 *   - default (gray) for absent
 *   - primary (blue) for visitors
 * - High contrast ratios meeting WCAG AA
 *
 * @example
 * <PresenceCards present={45} absent={12} visitors={3} />
 */
export function PresenceCards({ present, absent, visitors }: PresenceCardsProps) {
  return (
    <div className="flex gap-4 items-center">
      {/* Present - Success (Green) */}
      <div className="bg-success-100 text-success-800 border-2 border-success-200 rounded-2xl px-6 py-4 flex flex-col items-center min-w-[160px]">
        <p className="text-5xl font-bold mb-1">{present}</p>
        <p className="text-xl font-medium">Present</p>
      </div>

      {/* Absent - Default (Gray) */}
      <div className="bg-default-100 text-default-800 border-2 border-default-200 rounded-2xl px-6 py-4 flex flex-col items-center min-w-[160px]">
        <p className="text-5xl font-bold mb-1">{absent}</p>
        <p className="text-xl font-medium">Absent</p>
      </div>

      {/* Visitors - Primary (Blue) */}
      <div className="bg-primary-100 text-primary-800 border-2 border-primary-200 rounded-2xl px-6 py-4 flex flex-col items-center min-w-[160px]">
        <p className="text-5xl font-bold mb-1">{visitors}</p>
        <p className="text-xl font-medium">Visitors</p>
      </div>
    </div>
  );
}
