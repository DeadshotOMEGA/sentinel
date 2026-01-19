import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { TVConfig } from '../lib/config';
import { DISPLAY_API_KEY } from '../lib/api';

export type AlertSeverity = 'critical' | 'warning';
export type AlertType = 'badge_disabled' | 'badge_unknown';

export interface SecurityAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  badgeSerial: string;
  timestamp: string;
  message: string;
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

interface UseSecurityAlertsProps {
  config: TVConfig;
  /** Auto-clear alerts after this many milliseconds (default: no auto-clear) */
  autoClearMs?: number;
}

interface UseSecurityAlertsResult {
  activeAlerts: SecurityAlert[];
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
    default:
      return 'warning';
  }
}

/**
 * Determines the highest severity among active alerts
 * Critical > Warning > null
 */
function getHighestSeverity(alerts: SecurityAlert[]): AlertSeverity | null {
  if (alerts.length === 0) return null;

  const hasCritical = alerts.some(alert => alert.severity === 'critical');
  if (hasCritical) return 'critical';

  return 'warning';
}

export function useSecurityAlerts({
  config,
  autoClearMs
}: UseSecurityAlertsProps): UseSecurityAlertsResult {
  const socketRef = useRef<Socket | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<SecurityAlert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const autoClearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearAlert = useCallback((alertId: string) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
    // Clean up timer if exists
    const timer = autoClearTimers.current.get(alertId);
    if (timer) {
      clearTimeout(timer);
      autoClearTimers.current.delete(alertId);
    }
  }, []);

  const addAlert = useCallback((event: SecurityAlertEvent) => {
    const alert: SecurityAlert = {
      id: event.id,
      type: event.alertType,
      severity: event.severity as AlertSeverity,
      badgeSerial: event.badgeSerial || '',
      timestamp: event.createdAt,
      message: event.message,
    };

    setActiveAlerts(prev => {
      // Avoid duplicates
      if (prev.some(a => a.id === alert.id)) {
        return prev;
      }
      return [...prev, alert];
    });

    // Set up auto-clear if configured
    if (autoClearMs && autoClearMs > 0) {
      const timer = setTimeout(() => {
        clearAlert(alert.id);
      }, autoClearMs);
      autoClearTimers.current.set(alert.id, timer);
    }
  }, [autoClearMs, clearAlert]);

  useEffect(() => {
    socketRef.current = io(config.wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      auth: {
        displayApiKey: DISPLAY_API_KEY,
      },
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
      // Clean up all auto-clear timers
      autoClearTimers.current.forEach(timer => clearTimeout(timer));
      autoClearTimers.current.clear();
      socketRef.current?.disconnect();
    };
  }, [config.wsUrl, addAlert, clearAlert]);

  const highestSeverity = getHighestSeverity(activeAlerts);

  return { activeAlerts, highestSeverity, isConnected };
}
