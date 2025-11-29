import { Textfit } from 'react-textfit';
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

function getPersonStyles(activity: ActivityItem): {
  border: string;
} {
  // Visitor
  if (activity.type === 'visitor') {
    return { border: 'border-l-sky-500' };
  }
  // Command member
  if (activity.division === 'Command') {
    return { border: 'border-l-amber-500' };
  }
  // Regular member
  return { border: 'border-l-emerald-500' };
}

function getActionStyles(type: ActivityItem['type']): {
  label: string;
  bg: string;
  text: string;
} {
  switch (type) {
    case 'checkin':
      return { label: 'IN', bg: 'bg-emerald-100', text: 'text-emerald-700' };
    case 'checkout':
      return { label: 'OUT', bg: 'bg-orange-100', text: 'text-orange-700' };
    case 'visitor':
      return { label: 'IN', bg: 'bg-sky-100', text: 'text-sky-700' };
  }
}

export function ActivityFeed({ config }: ActivityFeedProps) {
  const { activities } = useActivityFeed(config);

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-sm text-gray-500 mb-2 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
        Recent Activity
      </h2>

      <div className="flex-1 overflow-hidden">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-base text-gray-400">Waiting for activity...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity, index) => {
              const personStyles = getPersonStyles(activity);
              const actionStyles = getActionStyles(activity.type);
              const fullName = `${activity.rank ? `${activity.rank} ` : ''}${activity.name}`;
              return (
                <div
                  key={activity.id}
                  className={`border-l-3 ${personStyles.border} bg-white rounded-md shadow-sm px-2 py-1.5 min-w-0 animate-fade-in`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  title={fullName}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Textfit mode="single" max={16} className="font-bold text-gray-900 h-5">
                        {fullName}
                      </Textfit>
                      <span className="text-xs font-mono text-gray-500">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${actionStyles.bg} ${actionStyles.text}`}>
                      {actionStyles.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
