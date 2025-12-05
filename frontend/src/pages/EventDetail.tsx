import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Spinner,
  Input,
  Card,
  CardBody,
  CardHeader,
  Select,
  SelectItem,
  Checkbox,
} from '@heroui/react';
import { format } from 'date-fns';
import PageWrapper from '../components/PageWrapper';
import AddAttendeeModal from '../components/AddAttendeeModal';
import BadgeAssignmentModal from '../components/BadgeAssignmentModal';
import { api } from '../lib/api';
import type { Event, EventAttendee } from '@shared/types';

interface EventDetailResponse {
  event: Event;
  attendees: EventAttendee[];
}

interface PresenceStatsResponse {
  present: number;
  away: number;
  pending: number;
  total: number;
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

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<EventAttendee | null>(null);

  if (!id) {
    throw new Error('Event ID is required');
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['event-detail', id, search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const response = await api.get<EventDetailResponse>(`/events/${id}?${params}`);
      return response.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['event-presence-stats', id],
    queryFn: async () => {
      const response = await api.get<PresenceStatsResponse>(`/events/${id}/presence-stats`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const removeAttendeeMutation = useMutation({
    mutationFn: (attendeeIds: string[]) =>
      api.delete(`/events/${id}/attendees`, { data: { attendeeIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', id] });
      setSelectedAttendees(new Set());
    },
  });

  const event = data?.event;
  const attendees = data?.attendees;
  const stats = statsData;

  const handleBack = () => {
    navigate('/events');
  };

  const handleMonitor = () => {
    navigate(`/events/${id}/monitor`);
  };

  const handleAssignBadge = (attendee: EventAttendee) => {
    setSelectedAttendee(attendee);
    setIsBadgeModalOpen(true);
  };

  const handleBulkAssignBadges = () => {
    if (selectedAttendees.size === 0) {
      throw new Error('No attendees selected');
    }
    throw new Error('Bulk badge assignment not implemented');
  };

  const handleRemoveSelected = () => {
    if (selectedAttendees.size === 0) {
      throw new Error('No attendees selected');
    }
    removeAttendeeMutation.mutate(Array.from(selectedAttendees));
  };

  const toggleAttendeeSelection = (attendeeId: string) => {
    const newSelection = new Set(selectedAttendees);
    if (newSelection.has(attendeeId)) {
      newSelection.delete(attendeeId);
    } else {
      newSelection.add(attendeeId);
    }
    setSelectedAttendees(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedAttendees.size === attendees?.length) {
      setSelectedAttendees(new Set());
    } else {
      setSelectedAttendees(new Set(attendees?.map((a) => a.id)));
    }
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

  if (isLoading) {
    return (
      <PageWrapper title="Event Details">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    );
  }

  if (!event || !attendees) {
    throw new Error('Failed to load event details');
  }

  return (
    <PageWrapper title={event.name}>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">{event.name}</h2>
              <Chip
                size="sm"
                color={event.status === 'active' ? 'success' : 'default'}
              >
                {event.status}
              </Chip>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Code: <span className="font-mono">{event.code}</span>
            </p>
            <p className="text-sm text-gray-600 mb-1">
              {format(new Date(event.startDate), 'MMM d, yyyy')} -{' '}
              {format(new Date(event.endDate), 'MMM d, yyyy')}
            </p>
            {event.description && (
              <p className="text-sm text-gray-700 mt-2">{event.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="light" onPress={handleBack}>
              Back to Events
            </Button>
            {event.status === 'active' && (
              <Button color="primary" onPress={handleMonitor}>
                Monitor
              </Button>
            )}
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard label="Present" value={stats.present} color="text-success" />
            <StatCard label="Away" value={stats.away} color="text-warning" />
            <StatCard label="Pending" value={stats.pending} color="text-gray-600" />
            <StatCard label="Total" value={stats.total} color="text-gray-900" />
          </div>
        )}

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Attendees</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Input
                placeholder="Search attendees..."
                value={search}
                onValueChange={setSearch}
                className="max-w-xs"
                isClearable
              />
              <Select
                label="Filter by Role"
                selectedKeys={roleFilter ? [roleFilter] : []}
                onSelectionChange={(keys) => setRoleFilter(Array.from(keys)[0] as string)}
                className="max-w-[200px]"
              >
                <SelectItem key="">All Roles</SelectItem>
                <SelectItem key="participant">Participant</SelectItem>
                <SelectItem key="instructor">Instructor</SelectItem>
                <SelectItem key="staff">Staff</SelectItem>
                <SelectItem key="volunteer">Volunteer</SelectItem>
              </Select>
              <div className="flex-1" />
              <Button
                color="primary"
                onPress={() => setIsAddModalOpen(true)}
              >
                Add Attendee
              </Button>
            </div>

            {selectedAttendees.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedAttendees.size} selected
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={handleBulkAssignBadges}
                >
                  Assign Badges
                </Button>
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  onPress={handleRemoveSelected}
                  isLoading={removeAttendeeMutation.isPending}
                >
                  Remove
                </Button>
              </div>
            )}

            <Table aria-label="Event attendees table">
              <TableHeader>
                <TableColumn>
                  <Checkbox
                    isSelected={selectedAttendees.size === attendees.length && attendees.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all attendees"
                  />
                </TableColumn>
                <TableColumn>NAME</TableColumn>
                <TableColumn>RANK</TableColumn>
                <TableColumn>ORGANIZATION</TableColumn>
                <TableColumn>ROLE</TableColumn>
                <TableColumn>BADGE STATUS</TableColumn>
                <TableColumn>CHECK-IN STATUS</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No attendees found">
                {attendees.map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell>
                      <Checkbox
                        isSelected={selectedAttendees.has(attendee.id)}
                        onChange={() => toggleAttendeeSelection(attendee.id)}
                        aria-label={`Select ${attendee.name}`}
                      />
                    </TableCell>
                    <TableCell>{attendee.name}</TableCell>
                    <TableCell>{attendee.rank ? attendee.rank : '-'}</TableCell>
                    <TableCell>{attendee.organization}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat">
                        {attendee.role}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {attendee.badgeId ? (
                        <span className="text-sm font-mono text-success">
                          {attendee.badgeId}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" color={getStatusColor(attendee.status)}>
                        {attendee.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {!attendee.badgeId && (
                        <Button
                          size="sm"
                          variant="light"
                          onPress={() => handleAssignBadge(attendee)}
                        >
                          Assign Badge
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>

      <AddAttendeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          refetch();
        }}
        eventId={id}
        event={event}
      />

      {selectedAttendee && (
        <BadgeAssignmentModal
          isOpen={isBadgeModalOpen}
          onClose={() => {
            setIsBadgeModalOpen(false);
            setSelectedAttendee(null);
          }}
          onSuccess={() => {
            setIsBadgeModalOpen(false);
            setSelectedAttendee(null);
            refetch();
          }}
          attendee={selectedAttendee}
          eventId={id}
        />
      )}
    </PageWrapper>
  );
}
