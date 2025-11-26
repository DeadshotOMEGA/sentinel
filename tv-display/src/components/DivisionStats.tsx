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
    <div className="grid grid-cols-2 gap-6 w-full">
      {divisions.map((division) => {
        const percentage = division.total > 0 ? (division.present / division.total) * 100 : 0;

        return (
          <div
            key={division.name}
            className="bg-white border border-gray-300 rounded-lg p-6 tv-mode"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-2xl font-semibold text-gray-900">
                {division.name}
              </h3>
              <div className="text-xl text-gray-600">
                {division.present}/{division.total}
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="mt-2 text-lg font-medium text-gray-700">
              {Math.round(percentage)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
