import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { api } from '../lib/api';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertType = 'badge_disabled' | 'badge_unknown' | 'inactive_member';

export interface SecurityAlert {
  id: string;
  alertType: AlertType;
  severity: AlertSeverity;
  badgeSerial: string | null;
  kioskId: string;
  kioskName: string;
  message: string;
  createdAt: string;
}

interface SecurityAlertEvent {
  id: string;
  alertType: AlertType;
  severity: AlertSeverity;
  badgeSerial: string | null;
  kioskId: string;
  kioskName: string;
  message: string;
  createdAt: string;
}

interface AlertAcknowledgedEvent {
  alertId: string;
}

interface UseSecurityAlertsResult {
  alerts: SecurityAlert[];
  isLoading: boolean;
  error: string | null;
  acknowledgeAlert: (alertId: string, note?: string) => Promise<void>;
  highestSeverity: AlertSeverity | null;
  isConnected: boolean;
}

/**
 * Maps alert types to their severity levels
 */
function getSeverityForType(type: AlertType): AlertSeverity {
  switch (type) {
    case 'badge_disabled':
      return 'critical';
    case 'badge_unknown':
      return 'warning';
    case 'inactive_member':
      return 'info';
    default:
      return 'warning';
  }
}

/**
 * Determines the highest severity among active alerts
 * Critical > Warning > Info > null
 */
function getHighestSeverity(alerts: SecurityAlert[]): AlertSeverity | null {
  if (alerts.length === 0) return null;

  if (alerts.some((alert) => alert.severity === 'critical')) return 'critical';
  if (alerts.some((alert) => alert.severity === 'warning')) return 'warning';

  return 'info';
}

/**
 * Play alert sound for critical alerts
 */
function playAlertSound(): void {
  try {
    // Use Web Audio API for a simple alert beep
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 880; // A5 note
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // Audio API not available, fail silently
  }
}

export function useSecurityAlerts(): UseSecurityAlertsResult {
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, token } = useAuth();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const previousAlertCount = useRef(0);

  // Fetch active alerts on mount
  useEffect(() => {
    const fetchAlerts = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<{ alerts: SecurityAlert[] }>('/security-alerts');
        setAlerts(response.data.alerts);
        previousAlertCount.current = response.data.alerts.length;
      } catch (err: unknown) {
        const apiError = err as { response?: { data?: { error?: { message?: string } } } };
        setError(apiError.response?.data?.error?.message ?? 'Failed to fetch security alerts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();
  }, [isAuthenticated]);

  // Clear alert from state
  const clearAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  // Add new alert to state
  const addAlert = useCallback((event: SecurityAlertEvent) => {
    const alert: SecurityAlert = {
      id: event.id,
      alertType: event.alertType,
      severity: event.severity ?? getSeverityForType(event.alertType),
      badgeSerial: event.badgeSerial,
      kioskId: event.kioskId,
      kioskName: event.kioskName,
      message: event.message,
      createdAt: event.createdAt,
    };

    setAlerts((prev) => {
      // Avoid duplicates
      if (prev.some((a) => a.id === alert.id)) {
        return prev;
      }
      return [alert, ...prev];
    });

    // Play sound for critical alerts
    if (alert.severity === 'critical') {
      playAlertSound();
    }
  }, []);

  // Set up WebSocket connection
  useEffect(() => {
    const isDev = import.meta.env.DEV;

    // In dev mode, allow connection without auth (backend auto-authenticates)
    if (!isDev && (!isAuthenticated || !token)) return;

    socketRef.current = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: isDev ? {} : { token },
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      // Subscribe to presence room which receives security alerts
      socketRef.current?.emit('subscribe_presence');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for security alert events
    socketRef.current.on('security_alert', (event: SecurityAlertEvent) => {
      addAlert(event);
    });

    // Listen for alert acknowledgment events
    socketRef.current.on('security_alert_acknowledged', (event: AlertAcknowledgedEvent) => {
      clearAlert(event.alertId);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated, token, addAlert, clearAlert]);

  // Acknowledge an alert
  const acknowledgeAlert = useCallback(
    async (alertId: string, note?: string) => {
      try {
        await api.put(`/security-alerts/${alertId}/acknowledge`, { note });
        // Remove from local state immediately
        clearAlert(alertId);
      } catch (err: unknown) {
        const apiError = err as { response?: { data?: { error?: { message?: string } } } };
        throw new Error(apiError.response?.data?.error?.message ?? 'Failed to acknowledge alert');
      }
    },
    [clearAlert]
  );

  const highestSeverity = getHighestSeverity(alerts);

  return {
    alerts,
    isLoading,
    error,
    acknowledgeAlert,
    highestSeverity,
    isConnected,
  };
}
