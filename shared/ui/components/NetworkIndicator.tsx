/**
 * NetworkIndicator Component
 *
 * Enhanced network status indicator with triple redundancy for accessibility:
 * - Color (green/red/yellow)
 * - Icon (Wifi/WifiOff/RefreshCw) at 24px minimum
 * - Text label (Online/Offline/Syncing...)
 *
 * WCAG AA compliant with ARIA live region for status change announcements.
 * Positioned fixed top-right by default.
 */

import { useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

/** Network status types */
export type NetworkStatus = 'syncing' | 'offline' | 'online';

/** Configuration for each network status */
interface StatusConfig {
  dotColor: string;
  textColor: string;
  icon: typeof Wifi | typeof WifiOff | typeof RefreshCw;
  label: string;
  iconClassName: string;
}

const STATUS_CONFIG: Record<NetworkStatus, StatusConfig> = {
  syncing: {
    dotColor: 'bg-warning',
    textColor: 'text-warning-700 dark:text-warning-400',
    icon: RefreshCw,
    label: 'Syncing...',
    iconClassName: 'animate-spin',
  },
  offline: {
    dotColor: 'bg-danger',
    textColor: 'text-danger-700 dark:text-danger-400',
    icon: WifiOff,
    label: 'Offline',
    iconClassName: '',
  },
  online: {
    dotColor: 'bg-success',
    textColor: 'text-success-700 dark:text-success-400',
    icon: Wifi,
    label: 'Online',
    iconClassName: '',
  },
};

export interface NetworkIndicatorProps {
  /** Whether the device is online */
  isOnline: boolean;
  /** Whether a sync is in progress */
  isSyncing: boolean;
  /** Optional class name for additional styling */
  className?: string;
}

/**
 * Determines the network status based on online and syncing state.
 */
function getNetworkStatus(isOnline: boolean, isSyncing: boolean): NetworkStatus {
  if (isSyncing) return 'syncing';
  if (!isOnline) return 'offline';
  return 'online';
}

/**
 * NetworkIndicator displays the current network status with visual and
 * accessible indicators. Uses semantic HeroUI colors for consistency.
 */
export function NetworkIndicator({
  isOnline,
  isSyncing,
  className = '',
}: NetworkIndicatorProps) {
  const previousStatusRef = useRef<string>('');
  const status = getNetworkStatus(isOnline, isSyncing);
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  // Track status changes for live region
  useEffect(() => {
    previousStatusRef.current = status;
  }, [status]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${className}`}
      role="status"
      aria-label={`Network status: ${config.label}`}
    >
      {/* Main indicator pill */}
      <div className="flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-full bg-content1 shadow-lg">
        {/* Status dot */}
        <div
          className={`h-3 w-3 rounded-full ${config.dotColor} flex-shrink-0`}
          aria-hidden="true"
        />

        {/* Icon (24px) */}
        <Icon
          className={`h-6 w-6 ${config.textColor} flex-shrink-0 ${config.iconClassName}`}
          aria-hidden="true"
        />

        {/* Text label */}
        <span className={`text-lg font-semibold ${config.textColor} whitespace-nowrap`}>
          {config.label}
        </span>
      </div>

      {/* ARIA live region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {config.label}
      </div>
    </div>
  );
}

export default NetworkIndicator;
