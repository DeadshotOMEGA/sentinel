import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { TVConfig } from '../lib/config';

interface DivisionStats {
  name: string;
  present: number;
  total: number;
}

interface PresenceData {
  present: number;
  absent: number;
  visitors: number;
  divisions: DivisionStats[];
}

interface PresenceUpdateEvent {
  present: number;
  absent: number;
  visitors: number;
  divisions: DivisionStats[];
}

interface UsePresenceDataProps {
  config: TVConfig;
}

export function usePresenceData({ config }: UsePresenceDataProps) {
  const socketRef = useRef<Socket | null>(null);
  const [data, setData] = useState<PresenceData>({
    present: 0,
    absent: 0,
    visitors: 0,
    divisions: [],
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
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
      socketRef.current?.emit('subscribe_presence');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on('presence_update', (event: PresenceUpdateEvent) => {
      setData({
        present: event.present,
        absent: event.absent,
        visitors: event.visitors,
        divisions: event.divisions || [],
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [config.wsUrl]);

  return { data, isConnected };
}
