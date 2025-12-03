import { useEffect, useRef, useCallback } from 'react';
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
}

interface VisitorSigninEvent {
  visitorId: string;
  name: string;
  organization: string;
  visitType: string;
  checkInTime: string;
}

interface ActivityBackfillEvent {
  activity: ActivityItem[];
}

type SocketCallback<T> = (data: T) => void;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, token } = useAuth();
  // Buffer for events that arrive before listeners are registered
  const pendingBackfillRef = useRef<ActivityBackfillEvent | null>(null);
  const backfillCallbackRef = useRef<SocketCallback<ActivityBackfillEvent> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    socketRef.current = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    // Capture backfill immediately - it arrives right after subscribe
    socketRef.current.on('activity_backfill', (data: ActivityBackfillEvent) => {
      if (backfillCallbackRef.current) {
        backfillCallbackRef.current(data);
      } else {
        pendingBackfillRef.current = data;
      }
    });

    socketRef.current.emit('subscribe_presence');

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated, token]);

  const onPresenceUpdate = useCallback((callback: SocketCallback<{ stats: PresenceStats }>) => {
    socketRef.current?.on('presence_update', callback);
    return () => socketRef.current?.off('presence_update', callback);
  }, []);

  const onCheckin = useCallback((callback: SocketCallback<CheckinEvent>) => {
    socketRef.current?.on('checkin', callback);
    return () => socketRef.current?.off('checkin', callback);
  }, []);

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
    socketRef.current?.on('visitor_signin', callback);
    return () => socketRef.current?.off('visitor_signin', callback);
  }, []);

  return { onPresenceUpdate, onCheckin, onActivityBackfill, onVisitorSignin };
}
