import { usePresenceData } from '../hooks/usePresenceData';
import { Clock } from '../components/Clock';
import { PresenceCards } from '../components/PresenceCards';
import { DivisionStats } from '../components/DivisionStats';
import { ActivityFeed } from '../components/ActivityFeed';
import { ConnectionStatus } from '../components/ConnectionStatus';
import type { TVConfig } from '../lib/config';

interface PresenceViewProps {
  config: TVConfig;
}

export function PresenceView({ config }: PresenceViewProps) {
  const { data, isConnected } = usePresenceData({ config });

  const connectionStatus = isConnected ? 'bg-emerald-500' : 'bg-red-500';
  const connectionText = isConnected ? 'Connected' : 'Disconnected';

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 tv-mode">
      <div className="flex h-screen">
        {/* Main content - 70% */}
        <div className="flex-1 p-8 overflow-hidden">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-2">
                HMCS Chippawa
              </h1>
              <p className="text-xl text-gray-600">
                Personnel Presence Overview
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${connectionStatus}`} />
                <span className="text-lg text-gray-700">
                  {connectionText}
                </span>
              </div>
            </div>

            <Clock />
          </div>

          <div className="mb-8">
            <PresenceCards
              present={data.present}
              absent={data.absent}
              visitors={data.visitors}
            />
          </div>

          <div className="mt-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Division Breakdown
            </h2>
            <DivisionStats divisions={data.divisions} />
          </div>
        </div>

        {/* Activity Feed - 30% */}
        {config.activityFeedEnabled && (
          <div className="w-[30%] border-l border-gray-200 bg-gray-50">
            <ActivityFeed config={config} />
          </div>
        )}
      </div>

      <ConnectionStatus isConnected={isConnected} />
    </div>
  );
}
