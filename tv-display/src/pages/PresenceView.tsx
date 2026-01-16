import { usePresenceData } from '../hooks/usePresenceData';
import { useSecurityAlerts } from '../hooks/useSecurityAlerts';
import { AdaptivePresenceView } from '../components/AdaptivePresenceView';
import { ActivityFeed } from '../components/ActivityFeed';
import type { TVConfig } from '../lib/config';
import { Logo, ConnectionStatus } from '@shared/ui';

interface PresenceViewProps {
  config: TVConfig;
}

/**
 * Returns the appropriate border classes based on alert severity
 */
function getAlertBorderClass(severity: 'critical' | 'warning' | null): string {
  if (!severity) return '';

  switch (severity) {
    case 'critical':
      return 'border-[10px] border-red-600 animate-pulse-border-red';
    case 'warning':
      return 'border-[10px] border-amber-500 animate-pulse-border-yellow';
    default:
      return '';
  }
}

export function PresenceView({ config }: PresenceViewProps) {
  const { data, isConnected } = usePresenceData({ config });
  const { highestSeverity } = useSecurityAlerts({ config });

  const alertBorderClass = getAlertBorderClass(highestSeverity);

  const connectionStatus = isConnected ? 'bg-emerald-500' : 'bg-red-500';
  const connectionText = isConnected ? 'Connected' : 'Disconnected';

  return (
    <div className={`min-h-screen bg-gradient-to-br from-white to-gray-50 tv-mode ${alertBorderClass}`}>
      <div className="flex h-screen">
        {/* Main content - adaptive width based on activity feed */}
        <div className="flex-1 p-4 overflow-y-auto" role="main" aria-label="Presence display">
          {/* Compact header: logo + stats + connection status */}
          <div className="flex items-center justify-between mb-4" role="banner">
            <div className="flex items-center gap-6">
              <Logo size="lg" />
              {/* Inline stats - compact and non-prominent */}
              <div className="flex items-center gap-4 text-lg" role="region" aria-label="Attendance statistics" aria-live="polite">
                <span className="text-blue-600">{data.visitors} Visitors</span>
                <span className="text-gray-400" aria-hidden="true">•</span>
                <span className="text-green-600 font-semibold">{data.present} Present</span>
                <span className="text-gray-400" aria-hidden="true">•</span>
                <span className="text-gray-600">{data.absent} Absent</span>
              </div>
            </div>
            <div className="flex items-center gap-3" role="status" aria-label="Connection status">
              <div className={`w-3 h-3 rounded-full ${connectionStatus}`} aria-hidden="true" />
              <span className="text-base text-gray-500">{connectionText}</span>
            </div>
          </div>

          {/* Adaptive Presence View - switches based on count */}
          <AdaptivePresenceView
            present={data.present}
            absent={data.absent}
            visitors={data.visitors}
            presentMembers={data.presentMembers}
            activeVisitors={data.activeVisitors}
          />
        </div>

        {/* Activity Feed - 24% (increased from 18%) */}
        {config.activityFeedEnabled && (
          <div className="w-[24%] border-l border-gray-200 bg-gray-50" role="complementary" aria-label="Activity feed">
            <ActivityFeed config={config} />
          </div>
        )}
      </div>

      <ConnectionStatus isConnected={isConnected} />
    </div>
  );
}
