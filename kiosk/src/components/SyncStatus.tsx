import { useState } from 'react';
import { useSyncStore } from '../state/sync-state';

export default function SyncStatus() {
  const {
    isOnline,
    isSyncing,
    queueSize,
    syncProgress,
    lastSyncError,
    setSyncError,
  } = useSyncStore();

  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusText = (): string => {
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
      return `Offline${queueSize > 0 ? ` · ${queueSize} queued` : ''}`;
    }
    return 'Connected';
  };

  const getDotColor = (): string => {
    if (lastSyncError) {
      return 'bg-red-600';
    }
    if (isSyncing) {
      return 'bg-blue-600';
    }
    if (!isOnline) {
      return 'bg-yellow-500';
    }
    return 'bg-green-600';
  };

  const pulseClass = isSyncing ? 'animate-pulse' : '';

  const handleRetry = (): void => {
    setSyncError(null);
    setIsExpanded(false);
    // Trigger sync retry through the API integration
  };

  const textColor = lastSyncError ? 'text-red-600' : 'text-gray-700';

  return (
    <div className="fixed right-4 top-4 z-50">
      {/* Main status indicator button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex min-h-14 min-w-14 items-center gap-3 rounded-lg bg-white px-4 py-3 text-left shadow-md hover:shadow-lg active:shadow-sm transition-shadow"
        aria-label={`Sync status: ${getStatusText()}`}
        aria-expanded={isExpanded}
      >
        {/* Dot indicator */}
        <div
          className={`h-4 w-4 flex-shrink-0 rounded-full ${getDotColor()} ${pulseClass}`}
          role="status"
        />

        {/* Status text */}
        <span className={`text-sm font-medium ${textColor}`}>
          {getStatusText()}
        </span>
      </button>

      {/* Expanded panel with error details and retry button */}
      {isExpanded && lastSyncError && (
        <div className="absolute right-0 top-16 w-64 space-y-3 rounded-lg bg-white p-4 shadow-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Sync Error</p>
            <p className="mt-2 text-sm text-gray-600">{lastSyncError}</p>
          </div>

          <button
            onClick={handleRetry}
            className="w-full min-h-14 rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
            aria-label="Retry sync"
          >
            Retry Now
          </button>
        </div>
      )}

      {/* Offline queue indicator panel */}
      {isExpanded && !isOnline && queueSize > 0 && (
        <div className="absolute right-0 top-16 w-56 space-y-2 rounded-lg bg-white p-4 shadow-lg">
          <p className="text-sm font-medium text-gray-900">
            {queueSize} items queued
          </p>
          <p className="text-xs text-gray-600">
            Items will sync when connection is restored
          </p>
        </div>
      )}

      {/* Syncing progress panel */}
      {isExpanded && isSyncing && syncProgress && (
        <div className="absolute right-0 top-16 w-56 space-y-3 rounded-lg bg-white p-4 shadow-lg">
          <p className="text-sm font-medium text-gray-900">
            Syncing ({syncProgress.current}/{syncProgress.total})
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
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
