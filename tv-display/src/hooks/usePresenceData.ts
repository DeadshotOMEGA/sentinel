import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { TVConfig } from '../lib/config';
import { authenticatedFetch } from '../lib/api';

interface DivisionStats {
  name: string;
  present: number;
  total: number;
}

export interface PresentMember {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  division: string;
  mess: string | null;
  checkedInAt: string;
}

export interface ActiveVisitor {
  id: string;
  name: string;
  organization: string;
  visitType: string;
  checkInTime: string;
}

interface PresenceData {
  present: number;
  absent: number;
  visitors: number;
  divisions: DivisionStats[];
  presentMembers: PresentMember[];
  activeVisitors: ActiveVisitor[];
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
    presentMembers: [],
    activeVisitors: [],
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch initial presence data from API
  const fetchInitialData = useCallback(async () => {
    try {
      const [presenceRes, visitorsRes, presentMembersRes] = await Promise.all([
        authenticatedFetch(`${config.apiUrl}/checkins/presence`),
        authenticatedFetch(`${config.apiUrl}/visitors/active`),
        authenticatedFetch(`${config.apiUrl}/checkins/presence/present`),
      ]);

      if (presenceRes.ok) {
        const presenceData = await presenceRes.json();
        const stats = presenceData.stats;

        // Get active visitors list
        let activeVisitors: ActiveVisitor[] = [];
        if (visitorsRes.ok) {
          const visitorData = await visitorsRes.json();
          activeVisitors = visitorData.visitors ?? [];
        }

        // Get present members list
        let presentMembers: PresentMember[] = [];
        if (presentMembersRes.ok) {
          const membersData = await presentMembersRes.json();
          presentMembers = membersData.members ?? [];
        }

        setData({
          present: stats.present ?? 0,
          absent: stats.absent ?? 0,
          visitors: activeVisitors.length,
          divisions: stats.divisions ?? [],
          presentMembers,
          activeVisitors,
        });
      }
    } catch (err) {
      console.error('Failed to fetch initial presence data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [config.apiUrl]);

  // Fetch initial data on mount
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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
      // Update counts immediately, then refetch lists for Cards
      setData((prev) => ({
        ...prev,
        present: event.present,
        absent: event.absent,
        visitors: event.visitors,
        divisions: event.divisions ?? [],
      }));
      // Refetch person lists for Cards display
      fetchInitialData();
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [config.wsUrl, fetchInitialData]);

  return { data, isConnected, isLoading };
}
