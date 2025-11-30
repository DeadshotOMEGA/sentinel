import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ActivityItem } from '../types/activity';
import type { TVConfig } from '../lib/config';
import { authenticatedFetch } from '../lib/api';

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
}

const MAX_ACTIVITIES = 15;

export function useActivityFeed(config: TVConfig): UseActivityFeedResult {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const addActivity = useCallback((activity: ActivityItem) => {
    setActivities((prev) => {
      const updated = [activity, ...prev];
      return updated.slice(0, MAX_ACTIVITIES);
    });
  }, []);

  // Fetch initial activity on mount
  useEffect(() => {
    const fetchInitialActivity = async () => {
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
        }
      } catch (err) {
        console.error('Failed to fetch initial activity:', err);
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

  return { activities, isConnected };
}
