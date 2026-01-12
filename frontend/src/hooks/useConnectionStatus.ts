import { useState, useEffect, useCallback, useRef } from 'react';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

/**
 * Hook to monitor backend connection status.
 * Pings /api/live endpoint periodically and tracks connection state.
 */
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const checkConnection = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    try {
      const response = await fetch('/api/live', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      setStatus(response.ok ? 'connected' : 'disconnected');
    } catch {
      clearTimeout(timeoutId);
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkConnection();

    // Set up periodic checks
    intervalRef.current = setInterval(checkConnection, HEALTH_CHECK_INTERVAL);

    // Also check on window focus (user returns to tab)
    const handleFocus = () => {
      checkConnection();
    };
    window.addEventListener('focus', handleFocus);

    // Check on online/offline events
    const handleOnline = () => checkConnection();
    const handleOffline = () => setStatus('disconnected');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  return status;
}
