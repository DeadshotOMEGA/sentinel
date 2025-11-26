import { useSyncStore } from '../state/sync-state';

interface NetworkIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export default function NetworkIndicator({
  className = '',
  showLabel = false,
}: NetworkIndicatorProps) {
  const { isOnline, isSyncing } = useSyncStore();

  const getDotColor = (): string => {
    if (isSyncing) {
      return 'bg-blue-600';
    }
    if (!isOnline) {
      return 'bg-yellow-500';
    }
    return 'bg-green-600';
  };

  const getLabel = (): string => {
    if (isSyncing) {
      return 'Syncing';
    }
    if (!isOnline) {
      return 'Offline';
    }
    return 'Connected';
  };

  const pulseClass = isSyncing ? 'animate-pulse' : '';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`h-3 w-3 rounded-full ${getDotColor()} ${pulseClass}`}
        role="status"
        aria-label={`Network status: ${getLabel()}`}
      />
      {showLabel && <span className="text-sm text-gray-700">{getLabel()}</span>}
    </div>
  );
}
