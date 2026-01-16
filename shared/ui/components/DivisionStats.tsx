interface Division {
  name: string;
  present: number;
  total: number;
}

interface DivisionStatsProps {
  divisions: Division[];
}

/**
 * Division attendance statistics grid for TV display.
 * Shows attendance progress bars for each division.
 *
 * Uses HeroUI semantic colors:
 * - bg-content1 for card backgrounds
 * - border-default-300 for borders
 * - text-foreground for titles
 * - text-foreground-500 for secondary text
 * - bg-default-200 for progress track
 * - bg-success for progress fill
 *
 * @example
 * <DivisionStats divisions={[
 *   { name: 'Engineering', present: 8, total: 12 },
 *   { name: 'Operations', present: 15, total: 20 },
 * ]} />
 */
export function DivisionStats({ divisions }: DivisionStatsProps) {
  if (divisions.length === 0) {
    return (
      <div className="text-foreground-500 text-xl">
        No division data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 w-full">
      {divisions.map((division) => {
        const percentage =
          division.total > 0 ? (division.present / division.total) * 100 : 0;

        return (
          <div
            key={division.name}
            className="bg-content1 border border-default-300 rounded-lg p-3 tv-mode"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {division.name}
              </h3>
              <div className="text-base text-foreground-500 ml-2 whitespace-nowrap">
                {division.present}/{division.total}
              </div>
            </div>

            <div className="w-full bg-default-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-success h-full rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="mt-1 text-sm font-medium text-foreground-500">
              {Math.round(percentage)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
