import { usePresenceData } from '../hooks/usePresenceData';
import { Clock } from '../components/Clock';
import { PresenceCards } from '../components/PresenceCards';
import { PersonCards } from '../components/PersonCards';
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
        {/* Main content - 75% */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-6">
              <h1 className="text-4xl font-bold text-gray-900">
                HMCS Chippawa
              </h1>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${connectionStatus}`} />
                <span className="text-base text-gray-600">
                  {connectionText}
                </span>
              </div>
            </div>

            <Clock />
          </div>

          <div className="mb-4">
            <PresenceCards
              present={data.present}
              absent={data.absent}
              visitors={data.visitors}
            />
          </div>

          {/* Person Cards - Who's in the building */}
          <div className="mb-4 flex-1 overflow-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Currently In Building
            </h2>
            <PersonCards
              presentMembers={data.presentMembers}
              activeVisitors={data.activeVisitors}
            />
          </div>

          <div className="mt-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Division Breakdown
            </h2>
            <DivisionStats divisions={data.divisions} />
          </div>
        </div>

        {/* Activity Feed - 25% */}
        {config.activityFeedEnabled && (
          <div className="w-[25%] border-l border-gray-200 bg-gray-50">
            <ActivityFeed config={config} />
          </div>
        )}
      </div>

      <ConnectionStatus isConnected={isConnected} />
    </div>
  );
}
