import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Chip,
  Input,
  Select,
  SelectItem,
  Button,
} from '@heroui/react';
import { format } from 'date-fns';
import PageWrapper from '../components/PageWrapper';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import type { Event, EventAttendee } from '@shared/types';

interface EventMonitorResponse {
  event: Event;
  attendees: EventAttendee[];
}

interface PresenceStatsResponse {
  present: number;
  away: number;
  pending: number;
  total: number;
}

interface ActivityEvent {
  id: string;
  attendeeName: string;
  action: 'check-in' | 'check-out' | 'badge-assigned';
  timestamp: string;
  badgeId?: string;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="flex-1">
      <CardBody className="text-center">
        <p className={`text-5xl font-bold ${color}`}>{value}</p>
        <p className="text-lg font-medium text-gray-700 mt-2">{label}</p>
      </CardBody>
    </Card>
  );
}

export default function EventMonitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { onPresenceUpdate, onCheckin } = useSocket();
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  if (!id) {
    throw new Error('Event ID is required');
  }

  const { data, isLoading } = useQuery({
    queryKey: ['event-monitor', id, search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const response = await api.get<EventMonitorResponse>(`/events/${id}/monitor?${params}`);
      return response.data;
    },
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['event-presence-stats', id],
    queryFn: async () => {
      const response = await api.get<PresenceStatsResponse>(`/events/${id}/presence-stats`);
      return response.data;
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    const unsubPresence = onPresenceUpdate((data) => {
      queryClient.setQueryData(['event-presence-stats', id], (old: PresenceStatsResponse | undefined) => {
        if (!old) {
          throw new Error('No existing presence stats');
        }
        return { ...old, ...data.stats };
      });
    });

    const unsubCheckin = onCheckin((data) => {
      setActivity((prev) => [
        {
          id: crypto.randomUUID(),
          attendeeName: data.memberName,
          action: data.direction === 'in' ? 'check-in' : 'check-out',
          timestamp: data.timestamp,
        },
        ...prev.slice(0, 19),
      ]);
    });

    return () => {
      unsubPresence();
      unsubCheckin();
    };
  }, [onPresenceUpdate, onCheckin, queryClient, id]);

  const event = data?.event;
  const attendees = data?.attendees;
  const stats = statsData;

  const handleBack = () => {
    navigate(`/events/${id}`);
  };

  const getStatusColor = (status: EventAttendee['status']): 'default' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'active':
        return 'success';
      case 'checked_out':
        return 'warning';
      case 'expired':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getActionColor = (action: ActivityEvent['action']): string => {
    switch (action) {
      case 'check-in':
        return 'bg-success-100 text-success-700';
      case 'check-out':
        return 'bg-warning-100 text-warning-700';
      case 'badge-assigned':
        return 'bg-primary-100 text-primary-700';
    }
  };

  const getActionLabel = (action: ActivityEvent['action']): string => {
    switch (action) {
      case 'check-in':
        return 'Checked In';
      case 'check-out':
        return 'Checked Out';
      case 'badge-assigned':
        return 'Badge Assigned';
    }
  };

  if (isLoading || statsLoading) {
    return (
      <PageWrapper title="Event Monitor">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    );
  }

  if (!event || !attendees || !stats) {
    throw new Error('Failed to load event monitor data');
  }

  return (
    <PageWrapper title={`Monitor: ${event.name}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">{event.name}</h2>
            <p className="text-sm text-gray-600">
              Live monitoring • Updates every 10 seconds
            </p>
          </div>
          <Button variant="light" onPress={handleBack}>
            Back to Details
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCard label="Present" value={stats.present} color="text-success" />
          <StatCard label="Away" value={stats.away} color="text-warning" />
          <StatCard label="Pending" value={stats.pending} color="text-gray-600" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Live Activity</h3>
            </CardHeader>
            <CardBody>
              {activity.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No recent activity</p>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {activity.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{item.attendeeName}</p>
                        {item.badgeId && (
                          <p className="text-xs text-gray-500 font-mono mt-1">
                            Badge: {item.badgeId}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getActionColor(
                            item.action
                          )}`}
                        >
                          {getActionLabel(item.action)}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">
                          {format(new Date(item.timestamp), 'HH:mm:ss')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Current Attendees</h3>
              <span className="text-sm text-gray-600">{attendees.length} total</span>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="Search..."
                  value={search}
                  onValueChange={setSearch}
                  className="max-w-xs"
                  size="sm"
                  isClearable
                />
                <Select
                  label="Role"
                  selectedKeys={roleFilter ? [roleFilter] : []}
                  onSelectionChange={(keys) => setRoleFilter(Array.from(keys)[0] as string)}
                  className="max-w-[150px]"
                  size="sm"
                >
                  <SelectItem key="">All</SelectItem>
                  <SelectItem key="participant">Participant</SelectItem>
                  <SelectItem key="instructor">Instructor</SelectItem>
                  <SelectItem key="staff">Staff</SelectItem>
                  <SelectItem key="volunteer">Volunteer</SelectItem>
                </Select>
              </div>

              <ul className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {attendees.map((attendee) => (
                  <li key={attendee.id} className="py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{attendee.name}</p>
                        <p className="text-sm text-gray-600">
                          {attendee.rank ? `${attendee.rank} • ` : ''}
                          {attendee.organization}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Chip size="sm" variant="flat">
                            {attendee.role}
                          </Chip>
                          <Chip size="sm" color={getStatusColor(attendee.status)}>
                            {attendee.status}
                          </Chip>
                        </div>
                      </div>
                      {attendee.badgeId && (
                        <span className="text-xs font-mono text-gray-500">
                          {attendee.badgeId}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
