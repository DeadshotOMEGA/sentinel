import { useActivityFeed } from '../hooks/useActivityFeed';
import type { TVConfig } from '../lib/config';
import type { ActivityItem } from '../types/activity';

interface ActivityFeedProps {
  config: TVConfig;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getActivityStyles(type: ActivityItem['type']): {
  border: string;
  bg: string;
  label: string;
} {
  switch (type) {
    case 'checkin':
      return {
        border: 'border-l-emerald-500',
        bg: 'bg-emerald-50',
        label: 'IN',
      };
    case 'checkout':
      return {
        border: 'border-l-orange-500',
        bg: 'bg-orange-50',
        label: 'OUT',
      };
    case 'visitor':
      return {
        border: 'border-l-blue-500',
        bg: 'bg-blue-50',
        label: 'VISITOR',
      };
  }
}

export function ActivityFeed({ config }: ActivityFeedProps) {
  const { activities } = useActivityFeed(config);

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Recent Activity</h2>

      <div className="flex-1 overflow-hidden">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xl text-gray-400">Waiting for activity...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity, index) => {
              const styles = getActivityStyles(activity.type);
              return (
                <div
                  key={activity.id}
                  className={`border-l-4 ${styles.border} ${styles.bg} px-3 py-2 rounded-r-lg animate-fade-in`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-mono text-gray-700">
                      {formatTime(activity.timestamp)}
                    </span>
                    <span className="text-sm font-semibold text-gray-600">
                      {styles.label}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900 truncate">
                    {activity.rank ? `${activity.rank} ` : ''}
                    {activity.name}
                  </div>
                  {activity.division && (
                    <div className="text-sm text-gray-600 truncate">
                      {activity.division}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
