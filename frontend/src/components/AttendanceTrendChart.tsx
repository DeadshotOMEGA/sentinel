import { useMemo } from 'react';
import { Card, CardBody } from './ui/heroui-polyfills';
import { format, subDays } from 'date-fns';

interface DayData {
  date: Date;
  present: number;
  total: number;
}

interface AttendanceTrendChartProps {
  /** Number of days to show (default: 7) */
  days?: number;
}

/**
 * Simple CSS-based attendance trend chart showing last N days
 * Mock data for now - will be replaced with actual API data
 */
export default function AttendanceTrendChart({ days = 7 }: AttendanceTrendChartProps) {
  // Generate mock data for demonstration
  // TODO: Replace with actual API data from /api/checkins/stats endpoint
  const chartData = useMemo((): DayData[] => {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(today, days - 1 - i);
      // Mock data - simulate varying attendance
      const total = 45 + Math.floor(Math.random() * 10);
      const present = Math.floor(total * (0.7 + Math.random() * 0.25));
      return { date, present, total };
    });
  }, [days]);

  const maxValue = Math.max(...chartData.map((d) => d.total));

  return (
    <Card>
      <CardBody>
        <h3 className="text-lg font-semibold mb-4">Attendance Trend (Last {days} Days)</h3>
        <div className="flex items-end justify-between gap-2 h-48">
          {chartData.map((day, index) => {
            const percentage = (day.present / maxValue) * 100;
            const attendanceRate = ((day.present / day.total) * 100).toFixed(0);

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                {/* Bar */}
                <div className="relative w-full flex flex-col justify-end h-40 bg-gray-100 rounded-t">
                  <div
                    className="w-full bg-primary rounded-t transition-all"
                    style={{ height: `${percentage}%` }}
                    title={`${day.present} of ${day.total} present (${attendanceRate}%)`}
                  />
                  {/* Value label */}
                  <div className="absolute top-0 left-0 right-0 text-center">
                    <span className="text-xs font-medium text-gray-700">
                      {day.present}
                    </span>
                  </div>
                </div>

                {/* Date label */}
                <div className="text-xs text-gray-600 text-center">
                  <div>{format(day.date, 'EEE')}</div>
                  <div className="text-gray-500">{format(day.date, 'M/d')}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded" />
              <span className="text-gray-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded border border-gray-300" />
              <span className="text-gray-600">Total Capacity</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Mock data - API integration pending
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
