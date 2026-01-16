/**
 * SyncStatus Component
 *
 * Displays sync status with expandable details panel.
 * Shows connection state, queue size, progress, and error handling.
 * Uses HeroUI semantic colors for consistent theming.
 */

import { useState } from 'react';
import { Button } from '@heroui/react';

/** Sync progress information */
export interface SyncProgress {
  current: number;
  total: number;
}

export interface SyncStatusProps {
  /** Whether the device is online */
  isOnline: boolean;
  /** Whether a sync is in progress */
  isSyncing: boolean;
  /** Number of items in the offline queue */
  queueSize: number;
  /** Current sync progress (if syncing) */
  syncProgress: SyncProgress | null;
  /** Last sync error message (if any) */
  lastSyncError: string | null;
  /** Callback to retry sync after error */
  onRetry?: () => void;
  /** Optional class name for additional styling */
  className?: string;
}

/**
 * Get status text based on current state.
 */
function getStatusText(
  isOnline: boolean,
  isSyncing: boolean,
  queueSize: number,
  syncProgress: SyncProgress | null,
  lastSyncError: string | null
): string {
  if (lastSyncError) {
    return 'Sync failed';
  }
  if (isSyncing) {
    if (syncProgress) {
      return `Syncing ${syncProgress.current}/${syncProgress.total}`;
    }
    return 'Syncing...';
  }
  if (!isOnline) {
    return `Offline${queueSize > 0 ? ` \u00B7 ${queueSize} queued` : ''}`;
  }
  return 'Connected';
}

/**
 * Get dot color class based on current state.
 */
function getDotColor(
  isOnline: boolean,
  isSyncing: boolean,
  lastSyncError: string | null
): string {
  if (lastSyncError) {
    return 'bg-danger';
  }
  if (isSyncing) {
    return 'bg-primary';
  }
  if (!isOnline) {
    return 'bg-warning';
  }
  return 'bg-success';
}

/**
 * SyncStatus displays the current synchronization status with
 * expandable panels for errors, queue info, and progress.
 */
export function SyncStatus({
  isOnline,
  isSyncing,
  queueSize,
  syncProgress,
  lastSyncError,
  onRetry,
  className = '',
}: SyncStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusText = getStatusText(isOnline, isSyncing, queueSize, syncProgress, lastSyncError);
  const dotColor = getDotColor(isOnline, isSyncing, lastSyncError);
  const pulseClass = isSyncing ? 'animate-pulse' : '';
  const textColor = lastSyncError ? 'text-danger' : 'text-foreground';

  const handleRetry = (): void => {
    onRetry?.();
    setIsExpanded(false);
  };

  return (
    <div className={`fixed right-4 top-4 z-50 ${className}`}>
      {/* Main status indicator button */}
      <Button
        size="lg"
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex min-h-14 min-w-14 items-center gap-3 rounded-lg bg-content1 px-4 py-3 text-left shadow-md hover:shadow-lg active:shadow-sm transition-shadow"
        variant="light"
        aria-label={`Sync status: ${statusText}`}
        aria-expanded={isExpanded}
      >
        {/* Dot indicator */}
        <div
          className={`h-4 w-4 flex-shrink-0 rounded-full ${dotColor} ${pulseClass}`}
          role="status"
        />

        {/* Status text */}
        <span className={`text-sm font-medium ${textColor}`}>
          {statusText}
        </span>
      </Button>

      {/* Expanded panel with error details and retry button */}
      {isExpanded && lastSyncError && (
        <div className="absolute right-0 top-16 w-64 space-y-3 rounded-lg bg-content1 p-4 shadow-lg">
          <div>
            <p className="text-sm font-medium text-foreground">Sync Error</p>
            <p className="mt-2 text-sm text-default-500">{lastSyncError}</p>
          </div>

          {onRetry && (
            <Button
              size="lg"
              onPress={handleRetry}
              className="w-full min-h-14 rounded-lg"
              color="primary"
              aria-label="Retry sync"
            >
              Retry Now
            </Button>
          )}
        </div>
      )}

      {/* Offline queue indicator panel */}
      {isExpanded && !isOnline && queueSize > 0 && !lastSyncError && (
        <div className="absolute right-0 top-16 w-56 space-y-2 rounded-lg bg-content1 p-4 shadow-lg">
          <p className="text-sm font-medium text-foreground">
            {queueSize} items queued
          </p>
          <p className="text-xs text-default-500">
            Items will sync when connection is restored
          </p>
        </div>
      )}

      {/* Syncing progress panel */}
      {isExpanded && isSyncing && syncProgress && (
        <div className="absolute right-0 top-16 w-56 space-y-3 rounded-lg bg-content1 p-4 shadow-lg">
          <p className="text-sm font-medium text-foreground">
            Syncing ({syncProgress.current}/{syncProgress.total})
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-default-200">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${(syncProgress.current / syncProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SyncStatus;
