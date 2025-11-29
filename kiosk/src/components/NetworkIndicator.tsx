import { useEffect, useRef } from 'react';
import { useSyncStore } from '../state/sync-state';
import { Wifi, WifiOff, RefreshCw } from '@shared/ui/icons';

interface NetworkIndicatorProps {
  className?: string;
}

/**
 * Enhanced network status indicator with triple redundancy for accessibility:
 * - Color (green/red/yellow)
 * - Icon (Wifi/WifiOff/RefreshCw) at 24px minimum
 * - Text label (Online/Offline/Syncing...)
 *
 * WCAG AA compliant with ARIA live region for status change announcements.
 * Positioned fixed top-right by default.
 */
export default function NetworkIndicator({
  className = '',
}: NetworkIndicatorProps) {
  const { isOnline, isSyncing } = useSyncStore();
  const previousStatusRef = useRef<string>('');

  // Determine current status
  const getStatus = (): 'syncing' | 'offline' | 'online' => {
    if (isSyncing) return 'syncing';
    if (!isOnline) return 'offline';
    return 'online';
  };

  const status = getStatus();

  // Visual configuration based on status
  const config = {
    syncing: {
      dotColor: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      icon: RefreshCw,
      label: 'Syncing...',
      iconClassName: 'animate-spin',
    },
    offline: {
      dotColor: 'bg-red-600',
      textColor: 'text-red-700',
      icon: WifiOff,
      label: 'Offline',
      iconClassName: '',
    },
    online: {
      dotColor: 'bg-green-600',
      textColor: 'text-green-700',
      icon: Wifi,
      label: 'Online',
      iconClassName: '',
    },
  };

  const currentConfig = config[status];
  const Icon = currentConfig.icon;

  // Track status changes for live region
  useEffect(() => {
    previousStatusRef.current = status;
  }, [status]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${className}`}
      role="status"
      aria-label={`Network status: ${currentConfig.label}`}
    >
      {/* Main indicator pill */}
      <div className="flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-full bg-white/95 backdrop-blur-sm shadow-lg">
        {/* Status dot */}
        <div
          className={`h-3 w-3 rounded-full ${currentConfig.dotColor} flex-shrink-0`}
          aria-hidden="true"
        />

        {/* Icon (24px) */}
        <Icon
          className={`h-6 w-6 ${currentConfig.textColor} flex-shrink-0 ${currentConfig.iconClassName}`}
          aria-hidden="true"
        />

        {/* Text label */}
        <span className={`text-lg font-semibold ${currentConfig.textColor} whitespace-nowrap`}>
          {currentConfig.label}
        </span>
      </div>

      {/* ARIA live region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentConfig.label}
      </div>
    </div>
  );
}
