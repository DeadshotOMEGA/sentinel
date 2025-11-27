interface Division {
  name: string;
  present: number;
  total: number;
}

interface DivisionStatsProps {
  divisions: Division[];
}

export function DivisionStats({ divisions }: DivisionStatsProps) {
  if (divisions.length === 0) {
    return (
      <div className="text-gray-500 text-xl">
        No division data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 w-full">
      {divisions.map((division) => {
        const percentage = division.total > 0 ? (division.present / division.total) * 100 : 0;

        return (
          <div
            key={division.name}
            className="bg-white border border-gray-300 rounded-lg p-3 tv-mode"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {division.name}
              </h3>
              <div className="text-base text-gray-600 ml-2 whitespace-nowrap">
                {division.present}/{division.total}
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="mt-1 text-sm font-medium text-gray-700">
              {Math.round(percentage)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
