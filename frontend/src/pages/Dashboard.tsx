import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody, CardHeader, Spinner } from '../components/ui/heroui-polyfills';
import { format } from 'date-fns';
import PageWrapper from '../components/PageWrapper';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';

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

  const { data: stats, isLoading } = useQuery({
    queryKey: ['presence-stats'],
    queryFn: async () => {
      const response = await api.get<{ stats: PresenceStats }>('/checkins/presence');
      return response.data.stats;
    },
    refetchInterval: 60000,
  });

  // Fetch initial recent activity from database
  useQuery({
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

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </CardHeader>
          <CardBody>
            {recentActivity.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No recent activity</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentActivity.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">
                        {item.rank ? `${item.rank} ` : ''}{item.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.type === 'visitor' ? item.organization : item.division}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          item.type === 'checkin'
                            ? 'bg-success-100 text-success-700'
                            : item.type === 'checkout'
                            ? 'bg-warning-100 text-warning-700'
                            : 'bg-primary-100 text-primary-700'
                        }`}
                      >
                        {item.type === 'checkin' ? 'Checked In' : item.type === 'checkout' ? 'Checked Out' : 'Visitor'}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
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
