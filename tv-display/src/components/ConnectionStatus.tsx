interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  if (isConnected) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow-lg border border-red-200"
      role="alert"
      aria-live="assertive"
      aria-label="Connection lost"
    >
      <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
      <span className="text-xl font-medium text-red-700">Reconnecting...</span>
    </div>
  );
}
