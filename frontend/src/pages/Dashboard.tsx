import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody, CardHeader, Spinner } from '@heroui/react';
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

interface RecentCheckin {
  id: string;
  memberName: string;
  rank: string;
  division: string;
  direction: 'in' | 'out';
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

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { onPresenceUpdate, onCheckin } = useSocket();
  const [recentActivity, setRecentActivity] = useState<RecentCheckin[]>([]);

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

    const unsubCheckin = onCheckin((data) => {
      setRecentActivity((prev) => [
        {
          id: crypto.randomUUID(),
          memberName: data.memberName,
          rank: data.rank,
          division: data.division,
          direction: data.direction,
          timestamp: data.timestamp,
        },
        ...prev.slice(0, 9),
      ]);
    });

    return () => {
      unsubPresence();
      unsubCheckin();
    };
  }, [onPresenceUpdate, onCheckin, queryClient]);

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
                        {item.rank} {item.memberName}
                      </p>
                      <p className="text-sm text-gray-500">{item.division}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          item.direction === 'in'
                            ? 'bg-success-100 text-success-700'
                            : 'bg-warning-100 text-warning-700'
                        }`}
                      >
                        {item.direction === 'in' ? 'Checked In' : 'Checked Out'}
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
