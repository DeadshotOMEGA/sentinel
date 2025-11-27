import { usePresenceData } from '../hooks/usePresenceData';
import { PresenceCards } from '../components/PresenceCards';
import { PersonCards } from '../components/PersonCards';
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
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Compact header: connection status + presence stats */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connectionStatus}`} />
              <span className="text-sm text-gray-600">{connectionText}</span>
            </div>
            <PresenceCards
              present={data.present}
              absent={data.absent}
              visitors={data.visitors}
            />
          </div>

          {/* Person Cards - Who's in the building */}
          <div className="flex-1 overflow-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Currently In Building
            </h2>
            <PersonCards
              presentMembers={data.presentMembers}
              activeVisitors={data.activeVisitors}
            />
          </div>
        </div>

        {/* Activity Feed - 18% */}
        {config.activityFeedEnabled && (
          <div className="w-[18%] border-l border-gray-200 bg-gray-50">
            <ActivityFeed config={config} />
          </div>
        )}
      </div>

      <ConnectionStatus isConnected={isConnected} />
    </div>
  );
}
