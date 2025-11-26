import { useEffect, useState } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isBackendReachable: boolean;
}

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_URL = '/api/health';

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isBackendReachable: true,
  });

  useEffect(() => {
    // Handle online/offline events
    const handleOnline = (): void => {
      setNetworkStatus((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = (): void => {
      setNetworkStatus((prev) => ({
        ...prev,
        isOnline: false,
        isBackendReachable: false,
      }));
    };

    // Check backend health
    const checkBackendHealth = async (): Promise<void> => {
      if (!navigator.onLine) {
        setNetworkStatus((prev) => ({
          ...prev,
          isBackendReachable: false,
        }));
        return;
      }

      try {
        const response = await fetch(HEALTH_CHECK_URL, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        const isReachable = response.ok;
        setNetworkStatus((prev) => ({
          ...prev,
          isBackendReachable: isReachable,
        }));
      } catch {
        setNetworkStatus((prev) => ({
          ...prev,
          isBackendReachable: false,
        }));
      }
    };

    // Initial health check
    checkBackendHealth();

    // Set up periodic health checks
    const healthCheckInterval = setInterval(checkBackendHealth, HEALTH_CHECK_INTERVAL);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthCheckInterval);
    };
  }, []);

  return networkStatus;
}
