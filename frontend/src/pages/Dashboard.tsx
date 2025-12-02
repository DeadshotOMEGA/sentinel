import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody, CardHeader, Spinner } from '../components/ui/heroui-polyfills';
import { format } from 'date-fns';
import { Users, UserCheck, UserX, DoorOpen } from '@shared/ui/icons';
import PageWrapper from '../components/PageWrapper';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { StatsCard, Badge, EmptyState } from '@shared/ui';

interface PresenceStats {
  totalMembers: number;
  present: number;
  absent: number;
  visitors: number;
}

interface RecentActivity {
  id: string;
  type: 'checkin' | 'checkout' | 'visitor';
  name: string;
  rank?: string;
  division?: string;
  organization?: string;
  timestamp: string;
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

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { onPresenceUpdate, onCheckin, onVisitorSignin } = useSocket();
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['presence-stats'],
    queryFn: async () => {
      const response = await api.get<{ stats: PresenceStats }>('/checkins/presence');
      return response.data.stats;
    },
    refetchInterval: 60000,
  });

  // Fetch initial recent activity from database
  const { isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await api.get<{ activity: ApiActivityItem[] }>('/checkins/recent?limit=10');
      const mapped: RecentActivity[] = response.data.activity.map((item) => ({
        id: item.id,
        type: item.type === 'visitor' ? 'visitor' : (item.direction === 'in' ? 'checkin' : 'checkout'),
        name: item.name,
        rank: item.rank,
        division: item.division,
        organization: item.organization,
        timestamp: item.timestamp,
      }));
      setRecentActivity(mapped);
      return mapped;
    },
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

    const unsubCheckin = onCheckin((data) => {
      setRecentActivity((prev) => [
        {
          id: crypto.randomUUID(),
          type: data.direction === 'in' ? 'checkin' : 'checkout',
          name: data.memberName,
          rank: data.rank,
          division: data.division,
          timestamp: data.timestamp,
        },
        ...prev.slice(0, 9),
      ]);
    });

    const unsubVisitor = onVisitorSignin((data) => {
      setRecentActivity((prev) => [
        {
          id: crypto.randomUUID(),
          type: 'visitor',
          name: data.name,
          organization: data.organization,
          timestamp: data.checkInTime,
        },
        ...prev.slice(0, 9),
      ]);
    });

    return () => {
      unsubPresence();
      unsubCheckin();
      unsubVisitor();
    };
  }, [onPresenceUpdate, onCheckin, onVisitorSignin, queryClient]);

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            value={stats?.present ?? 0}
            label="Present"
            variant="success"
            icon={UserCheck}
            loading={statsLoading}
          />
          <StatsCard
            value={stats?.absent ?? 0}
            label="Absent"
            variant="neutral"
            icon={UserX}
            loading={statsLoading}
          />
          <StatsCard
            value={stats?.visitors ?? 0}
            label="Visitors"
            variant="info"
            icon={DoorOpen}
            loading={statsLoading}
          />
          <StatsCard
            value={stats?.totalMembers ?? 0}
            label="Total Members"
            variant="neutral"
            icon={Users}
            loading={statsLoading}
          />
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </CardHeader>
          <CardBody>
            {activityLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : recentActivity.length === 0 ? (
              <EmptyState
                variant="no-data"
                heading="No recent activity"
                description="Check-ins and visitor activity will appear here"
              />
            ) : (
              <ul className="divide-y divide-gray-100" role="feed" aria-label="Recent activity feed" aria-live="polite" aria-atomic="false">
                {recentActivity.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-3" role="article" aria-label={`${item.rank ? item.rank + ' ' : ''}${item.name} ${item.type === 'checkin' ? 'checked in' : item.type === 'checkout' ? 'checked out' : 'visitor signed in'} at ${format(new Date(item.timestamp), 'HH:mm')}`}>
                    <div>
                      <p className="font-medium">
                        {item.rank ? `${item.rank} ` : ''}{item.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.type === 'visitor' ? item.organization : item.division}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={item.type === 'checkin' ? 'success' : item.type === 'checkout' ? 'warning' : 'visitor'}
                        size="sm"
                      >
                        {item.type === 'checkin' ? 'Checked In' : item.type === 'checkout' ? 'Checked Out' : 'Visitor'}
                      </Badge>
                      <p className="mt-1 text-xs text-gray-500" aria-hidden="true">
                        {format(new Date(item.timestamp), 'HH:mm')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
