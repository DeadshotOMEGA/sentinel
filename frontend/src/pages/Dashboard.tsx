import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody, Spinner } from '@heroui/react';
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="flex-1">
      <CardBody className="text-center">
        <p className={`text-4xl font-bold ${color}`}>{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </CardBody>
    </Card>
  );
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
          name: data.name,
          organization: data.organization,
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
    throw new Error('Failed to load presence stats');
  }

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Present" value={stats.present} color="text-success" />
          <StatCard label="Absent" value={stats.absent} color="text-gray-600" />
          <StatCard label="Visitors" value={stats.visitors} color="text-primary" />
          <StatCard label="Total Members" value={stats.totalMembers} color="text-gray-900" />
        </div>

        <ActivityPanel activity={activity} />
      </div>
    </PageWrapper>
  );
}
