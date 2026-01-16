interface ConnectionStatusProps {
  isConnected: boolean;
}

/**
 * Connection status indicator that shows when disconnected.
 * Displays a fixed position alert when connection is lost.
 *
 * Uses HeroUI semantic colors:
 * - bg-danger for the pulse indicator
 * - text-danger for the status text
 * - border-danger-200 for the alert border
 *
 * @example
 * <ConnectionStatus isConnected={socket.connected} />
 */
export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  if (isConnected) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 flex items-center gap-3 bg-content1 px-4 py-3 rounded-lg shadow-lg border border-danger-200"
      role="alert"
      aria-live="assertive"
      aria-label="Connection lost"
    >
      <div
        className="w-4 h-4 rounded-full bg-danger animate-pulse"
        aria-hidden="true"
      />
      <span className="text-xl font-medium text-danger">Reconnecting...</span>
    </div>
  );
}
