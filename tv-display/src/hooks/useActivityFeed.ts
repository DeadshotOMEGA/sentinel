import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ActivityItem } from '../types/activity';
import type { TVConfig } from '../lib/config';
import { authenticatedFetch, DISPLAY_API_KEY } from '../lib/api';

interface CheckinEvent {
  memberId: string;
  memberName: string;
  rank: string;
  division: string;
  direction: 'in' | 'out';
  timestamp: string;
  kioskId: string;
}

interface VisitorEvent {
  visitorId: string;
  name: string;
  checkInTime: string;
}

interface ApiActivityItem {
  type: 'checkin' | 'visitor';
  id: string;
  timestamp: string;
  direction?: 'in' | 'out';
  name: string;
  rank?: string;
  division?: string;
  organization?: string;
}

interface UseActivityFeedResult {
  activities: ActivityItem[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

const MAX_ACTIVITIES = 15;

export function useActivityFeed(config: TVConfig): UseActivityFeedResult {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const addActivity = useCallback((activity: ActivityItem) => {
    // Clear error when we receive live data
    setError(null);
    setActivities((prev) => {
      const updated = [activity, ...prev];
      return updated.slice(0, MAX_ACTIVITIES);
    });
  }, []);

  // Fetch initial activity on mount
  useEffect(() => {
    const fetchInitialActivity = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch(`${config.apiUrl}/checkins/recent?limit=${MAX_ACTIVITIES}`);
        if (response.ok) {
          const data = await response.json();
          const mapped: ActivityItem[] = data.activity.map((item: ApiActivityItem) => ({
            id: item.id,
            type: item.type === 'visitor' ? 'visitor' : (item.direction === 'in' ? 'checkin' : 'checkout'),
            name: item.name,
            rank: item.rank,
            division: item.division,
            timestamp: item.timestamp,
          }));
          setActivities(mapped);
        } else {
          setError('Failed to load activity');
        }
      } catch (err) {
        setError('Unable to connect');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialActivity();
  }, [config.apiUrl]);

  useEffect(() => {
    const socket: Socket = io(config.wsUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      auth: {
        displayApiKey: DISPLAY_API_KEY,
      },
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe_presence');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('checkin', (data: CheckinEvent) => {
      const activity: ActivityItem = {
        id: `${data.memberId}-${data.timestamp}`,
        type: data.direction === 'in' ? 'checkin' : 'checkout',
        name: data.memberName,
        rank: data.rank,
        division: data.division,
        timestamp: data.timestamp,
      };
      addActivity(activity);
    });

    socket.on('visitor_signin', (data: VisitorEvent) => {
      const activity: ActivityItem = {
        id: `visitor-${data.visitorId}-${data.checkInTime}`,
        type: 'visitor',
        name: data.name,
        timestamp: data.checkInTime,
      };
      addActivity(activity);
    });

    return () => {
      socket.disconnect();
    };
  }, [config.wsUrl, addActivity]);

  return { activities, isConnected, isLoading, error };
}
