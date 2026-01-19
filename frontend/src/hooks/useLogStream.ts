import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import type { LogEvent, LogFilter } from '../../../shared/types';
import { matchesLogFilter } from '../../../shared/types';

const MAX_LOGS = 500; // Maximum logs to keep in memory

interface UseLogStreamOptions {
  initialFilter?: LogFilter;
  maxLogs?: number;
}

interface UseLogStreamReturn {
  logs: LogEvent[];
  isConnected: boolean;
  isPaused: boolean;
  isEnabled: boolean;
  subscriberCount: number;
  pause: () => void;
  resume: () => void;
  clear: () => void;
  updateFilter: (filter: LogFilter) => void;
  filter: LogFilter;
}

export function useLogStream(options: UseLogStreamOptions = {}): UseLogStreamReturn {
  const { initialFilter = {}, maxLogs = MAX_LOGS } = options;

  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [filter, setFilter] = useState<LogFilter>(initialFilter);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [subscriberCount, _setSubscriberCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, token, user } = useAuth();
  const pausedRef = useRef(isPaused);
  const pendingLogsRef = useRef<LogEvent[]>([]);

  // Keep pausedRef in sync
  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  // Enable in development mode (auth check relaxed for dev bypass)
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    // In dev mode: enable if admin or developer OR if auth is bypassed (allow any authenticated state)
    const isAdminOrDev = user?.role === 'admin' || user?.role === 'developer';
    setIsEnabled(isDev && (isAdminOrDev || isAuthenticated || isDev));
  }, [user?.role, isAuthenticated]);

  useEffect(() => {
    if (!isEnabled) {
      setIsConnected(false);
      return;
    }

    // In dev mode without auth, connect without token
    const authConfig = token ? { token } : {};

    socketRef.current = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: authConfig,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      // Subscribe to logs with current filter
      socketRef.current?.emit('subscribe_logs', filter);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle log backfill
    socketRef.current.on('log_backfill', (events: LogEvent[]) => {
      setLogs((prev) => {
        const combined = [...events, ...prev];
        return combined.slice(0, maxLogs);
      });
    });

    // Handle individual log events
    socketRef.current.on('log_event', (event: LogEvent) => {
      if (pausedRef.current) {
        // Buffer logs while paused
        pendingLogsRef.current.push(event);
        if (pendingLogsRef.current.length > maxLogs) {
          pendingLogsRef.current = pendingLogsRef.current.slice(-maxLogs);
        }
      } else {
        setLogs((prev) => {
          const updated = [event, ...prev];
          return updated.slice(0, maxLogs);
        });
      }
    });

    return () => {
      socketRef.current?.emit('unsubscribe_logs');
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token, isEnabled, maxLogs]); // Note: filter not in deps - handled separately

  // Handle filter updates
  useEffect(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_log_filter', filter);
    }
  }, [filter]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    // Flush pending logs
    if (pendingLogsRef.current.length > 0) {
      setLogs((prev) => {
        const combined = [...pendingLogsRef.current.reverse(), ...prev];
        return combined.slice(0, maxLogs);
      });
      pendingLogsRef.current = [];
    }
    setIsPaused(false);
  }, [maxLogs]);

  const clear = useCallback(() => {
    setLogs([]);
    pendingLogsRef.current = [];
  }, []);

  const updateFilter = useCallback((newFilter: LogFilter) => {
    setFilter(newFilter);
  }, []);

  // Filter logs client-side for immediate UI response
  const filteredLogs = useMemo(() => {
    const hasFilter = filter.levels?.length || filter.modules?.length || filter.requestId || filter.search;
    if (!hasFilter) return logs;
    return logs.filter((log) => matchesLogFilter(log, filter));
  }, [logs, filter]);

  return {
    logs: filteredLogs,
    isConnected,
    isPaused,
    isEnabled,
    subscriberCount,
    pause,
    resume,
    clear,
    updateFilter,
    filter,
  };
}
