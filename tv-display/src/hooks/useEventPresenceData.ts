import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { TVConfig } from '../lib/config';

interface Attendee {
  id: string;
  name: string;
  rank?: string;
  division?: string;
  checkedIn: boolean;
  checkInTime?: string;
}

interface EventPresenceData {
  present: number;
  away: number;
  pending: number;
  attendees: Attendee[];
}

interface EventPresenceUpdateEvent {
  present: number;
  away: number;
  pending: number;
  attendees: Attendee[];
}

interface UseEventPresenceDataProps {
  config: TVConfig;
}

export function useEventPresenceData({ config }: UseEventPresenceDataProps) {
  const socketRef = useRef<Socket | null>(null);
  const [data, setData] = useState<EventPresenceData>({
    present: 0,
    away: 0,
    pending: 0,
    attendees: [],
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!config.eventId) {
      throw new Error('eventId is required for event mode');
    }

    socketRef.current = io(config.wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current?.emit('subscribe_event_presence', {
        eventId: config.eventId,
      });
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on(
      'event_presence_update',
      (event: EventPresenceUpdateEvent) => {
        setData({
          present: event.present,
          away: event.away,
          pending: event.pending,
          attendees: event.attendees || [],
        });
      }
    );

    return () => {
      socketRef.current?.disconnect();
    };
  }, [config.wsUrl, config.eventId]);

  return { data, isConnected };
}
