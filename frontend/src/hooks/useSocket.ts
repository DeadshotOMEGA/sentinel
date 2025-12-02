import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { config } from '../lib/config';

interface PresenceStats {
  present: number;
  absent: number;
  visitors: number;
  totalMembers: number;
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

type SocketCallback<T> = (data: T) => void;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = io(config.wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      socket.emit('subscribe_presence');
    };

    const handleDisconnect = () => {
      // Socket will auto-reconnect, no action needed
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Initial subscription if already connected
    if (socket.connected) {
      socket.emit('subscribe_presence');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
    };
  }, [isAuthenticated]);

  const onPresenceUpdate = useCallback((callback: SocketCallback<{ stats: PresenceStats }>) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('presence_update', callback);
    return () => socket.off('presence_update', callback);
  }, []);

  const onCheckin = useCallback((callback: SocketCallback<CheckinEvent>) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('checkin', callback);
    return () => socket.off('checkin', callback);
  }, []);

  const onVisitorSignin = useCallback((callback: SocketCallback<VisitorSigninEvent>) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('visitor_signin', callback);
    return () => socket.off('visitor_signin', callback);
  }, []);

  return { onPresenceUpdate, onCheckin, onVisitorSignin };
}
