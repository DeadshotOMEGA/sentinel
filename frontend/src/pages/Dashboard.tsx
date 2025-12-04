import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@heroui/react';
import PageWrapper from '../components/PageWrapper';
import ActivityPanel from '../components/ActivityPanel';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import type { ActivityItem } from '../../../shared/types';

interface PresenceStats {
  totalMembers: number;
  present: number;
  absent: number;
  visitors: number;
}


export default function Dashboard() {
  const queryClient = useQueryClient();
  const { onPresenceUpdate, onCheckin, onActivityBackfill, onVisitorSignin } = useSocket();
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['presence-stats'],
    queryFn: async () => {
      const response = await api.get<{ stats: PresenceStats }>('/checkins/presence');
      return response.data.stats;
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    const unsubPresence = onPresenceUpdate((data) => {
      queryClient.setQueryData(['presence-stats'], (old: PresenceStats | undefined) => {
        if (!old) {
          throw new Error('No existing presence stats');
        }
        return { ...old, ...data.stats };
      });
    });

    const unsubActivityBackfill = onActivityBackfill((data) => {
      setActivity(data.activity);
    });

    const unsubCheckin = onCheckin((data) => {
      setActivity((prev) => {
        const newItem: ActivityItem = {
          type: 'checkin',
          id: crypto.randomUUID(),
          timestamp: data.timestamp,
          direction: data.direction,
          name: data.memberName,
          rank: data.rank,
          division: data.division,
          kioskId: data.kioskId,
          kioskName: data.kioskName,
        };
        return [newItem, ...prev.slice(0, 99)];
      });
    });

    const unsubVisitorSignin = onVisitorSignin((data) => {
      setActivity((prev) => {
        const newItem: ActivityItem = {
          type: 'visitor',
          id: crypto.randomUUID(),
          timestamp: data.checkInTime,
          direction: 'in',
          name: data.name,
          organization: data.organization,
          visitType: data.visitType,
          visitReason: data.visitReason ?? undefined,
          hostName: data.hostName ?? undefined,
          eventId: data.eventId ?? undefined,
          eventName: data.eventName ?? undefined,
          kioskId: data.kioskId,
          kioskName: data.kioskName,
        };
        return [newItem, ...prev.slice(0, 99)];
      });
    });

    return () => {
      unsubPresence();
      unsubActivityBackfill();
      unsubCheckin();
      unsubVisitorSignin();
    };
  }, [onPresenceUpdate, onCheckin, onActivityBackfill, onVisitorSignin, queryClient]);

  if (isLoading) {
    return (
      <PageWrapper title="Dashboard">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    );
  }

  if (!stats) {
    return (
      <PageWrapper title="Dashboard">
        <div className="flex justify-center py-12">
          <p className="text-default-500">Failed to load presence stats. Is the backend running?</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Dashboard">
      <ActivityPanel
        activity={activity}
        stats={{ members: stats.present, visitors: stats.visitors }}
      />
    </PageWrapper>
  );
}
