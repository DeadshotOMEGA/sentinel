import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import type { ActivityItem } from '../../../shared/types';

interface PresenceStats {
  present: number;
  absent: number;
  visitors: number;
  total: number;
}

interface CheckinEvent {
  memberId: string;
  memberName: string;
  rank: string;
  division: string;
  direction: 'in' | 'out';
  timestamp: string;
  kioskId: string;
  kioskName: string;
}

interface VisitorSigninEvent {
  visitorId: string;
  name: string;
  organization: string;
  visitType: string;
  visitReason: string | null;
  hostName: string | null;
  eventId: string | null;
  eventName: string | null;
  kioskId: string;
  kioskName: string;
  checkInTime: string;
}

interface ActivityBackfillEvent {
  activity: ActivityItem[];
}

type SocketCallback<T> = (data: T) => void;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, token } = useAuth();
  // Track socket ready state - changes trigger callback recreation, which triggers
  // consumer useEffects to re-run and register listeners when socket is ready
  const [isSocketReady, setIsSocketReady] = useState(false);
  // Buffer for events that arrive before listeners are registered
  const pendingBackfillRef = useRef<ActivityBackfillEvent | null>(null);
  const backfillCallbackRef = useRef<SocketCallback<ActivityBackfillEvent> | null>(null);

  useEffect(() => {
    const isDev = import.meta.env.DEV;

    // In dev mode, allow connection without auth (backend auto-authenticates)
    if (!isDev && (!isAuthenticated || !token)) return;

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: isDev ? {} : { token },
    });

    socketRef.current = socket;

    // Track connection state - this triggers re-render which causes consumers
    // to re-register their listeners via the callback dependency change
    socket.on('connect', () => {
      setIsSocketReady(true);
    });

    socket.on('disconnect', () => {
      setIsSocketReady(false);
    });

    // Capture backfill immediately - it arrives right after subscribe
    socket.on('activity_backfill', (data: ActivityBackfillEvent) => {
      if (backfillCallbackRef.current) {
        backfillCallbackRef.current(data);
      } else {
        pendingBackfillRef.current = data;
      }
    });

    socket.emit('subscribe_presence');

    return () => {
      setIsSocketReady(false);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token]);

  // These callbacks include isSocketReady in deps, so when socket connects:
  // 1. isSocketReady changes to true
  // 2. Callbacks are recreated
  // 3. Consumer useEffects see callback change in deps and re-run
  // 4. Listeners are registered now that socket is ready
  const onPresenceUpdate = useCallback((callback: SocketCallback<{ stats: PresenceStats }>) => {
    const socket = socketRef.current;
    if (socket && isSocketReady) {
      socket.on('presence_update', callback);
      return () => {
        socket.off('presence_update', callback);
      };
    }
    // Socket not ready - return no-op cleanup
    return () => {};
  }, [isSocketReady]);

  const onCheckin = useCallback((callback: SocketCallback<CheckinEvent>) => {
    const socket = socketRef.current;
    if (socket && isSocketReady) {
      socket.on('checkin', callback);
      return () => {
        socket.off('checkin', callback);
      };
    }
    return () => {};
  }, [isSocketReady]);

  const onActivityBackfill = useCallback((callback: SocketCallback<ActivityBackfillEvent>) => {
    backfillCallbackRef.current = callback;
    // Flush any pending backfill that arrived before registration
    if (pendingBackfillRef.current) {
      callback(pendingBackfillRef.current);
      pendingBackfillRef.current = null;
    }
    return () => {
      backfillCallbackRef.current = null;
    };
  }, []);

  const onVisitorSignin = useCallback((callback: SocketCallback<VisitorSigninEvent>) => {
    const socket = socketRef.current;
    if (socket && isSocketReady) {
      socket.on('visitor_signin', callback);
      return () => {
        socket.off('visitor_signin', callback);
      };
    }
    return () => {};
  }, [isSocketReady]);

  return { onPresenceUpdate, onCheckin, onActivityBackfill, onVisitorSignin };
}
