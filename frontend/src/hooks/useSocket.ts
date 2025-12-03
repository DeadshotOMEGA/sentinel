import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

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

type SocketCallback<T> = (data: T) => void;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    socketRef.current = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketRef.current.emit('subscribe_presence');

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated]);

  const onPresenceUpdate = useCallback((callback: SocketCallback<{ stats: PresenceStats }>) => {
    socketRef.current?.on('presence_update', callback);
    return () => socketRef.current?.off('presence_update', callback);
  }, []);

  const onCheckin = useCallback((callback: SocketCallback<CheckinEvent>) => {
    socketRef.current?.on('checkin', callback);
    return () => socketRef.current?.off('checkin', callback);
  }, []);

  return { onPresenceUpdate, onCheckin };
}
