import { useState, useEffect } from 'react';
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
import { PageWrapper } from '@sentinel/ui';
import AddAttendeeModal from '../components/AddAttendeeModal';
import AddMemberAsAttendeeModal from '../components/AddMemberAsAttendeeModal';
import BadgeAssignmentModal from '../components/BadgeAssignmentModal';
import AttendeeImportModal from '../components/AttendeeImportModal';
import { api } from '../lib/api';
import type { Event, EventAttendee, EventStatus } from '@shared/types';

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
  const { eventId: id } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<EventAttendee | null>(null);
  const [editRoles, setEditRoles] = useState(false);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('');

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

  const { data: rolesData } = useQuery({
    queryKey: ['event-roles', id],
    queryFn: async () => {
      const response = await api.get<{ roles: string[]; isCustom: boolean }>(`/events/${id}/roles`);
      return response.data;
    },
  });

  useEffect(() => {
    if (rolesData) {
      setCustomRoles(rolesData.roles);
    }
  }, [rolesData]);

  const updateRolesMutation = useMutation({
    mutationFn: (roles: string[] | null) => {
      console.log('Mutation executing with roles:', roles);
      return api.put(`/events/${id}/roles`, { roles });
    },
    onSuccess: (response) => {
      console.log('Roles saved successfully:', response);
      queryClient.invalidateQueries({ queryKey: ['event-roles', id] });
      setEditRoles(false);
    },
    onError: (error) => {
      console.error('Failed to save roles:', error);
    },
  });

  const removeAttendeeMutation = useMutation({
    mutationFn: (attendeeIds: string[]) =>
      api.delete(`/events/${id}/attendees`, { data: { attendeeIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', id] });
      setSelectedAttendees(new Set());
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: EventStatus) => api.put(`/events/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', id] });
    },
  });

  const closeEventMutation = useMutation({
    mutationFn: () => api.post(`/events/${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', id] });
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

  const handleAddCustomRole = () => {
    if (newRole.trim() && !customRoles.includes(newRole.trim())) {
      setCustomRoles([...customRoles, newRole.trim()]);
      setNewRole('');
    }
  };

  const handleRemoveCustomRole = (roleToRemove: string) => {
    setCustomRoles(customRoles.filter((r) => r !== roleToRemove));
  };

  const handleSaveRoles = () => {
    console.log('Saving roles:', customRoles);
    updateRolesMutation.mutate(customRoles);
  };

  const handleResetToDefault = () => {
    updateRolesMutation.mutate(null);
  };

  const handleCancelEditRoles = () => {
    if (rolesData) {
      setCustomRoles(rolesData.roles);
    }
    setEditRoles(false);
    setNewRole('');
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
                color={
                  event.status === 'active'
                    ? 'success'
                    : event.status === 'completed'
                      ? 'primary'
                      : event.status === 'cancelled'
                        ? 'danger'
                        : 'default'
                }
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
          <div className="flex flex-col items-end gap-2">
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
            <div className="flex gap-2">
              {event.status === 'draft' && (
                <>
                  <Button
                    size="sm"
                    color="success"
                    variant="flat"
                    onPress={() => updateStatusMutation.mutate('active')}
                    isLoading={updateStatusMutation.isPending}
                  >
                    Activate Event
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    onPress={() => updateStatusMutation.mutate('cancelled')}
                    isLoading={updateStatusMutation.isPending}
                  >
                    Cancel
                  </Button>
                </>
              )}
              {event.status === 'active' && (
                <>
                  <Button
                    size="sm"
                    color="default"
                    variant="flat"
                    onPress={() => updateStatusMutation.mutate('draft')}
                    isLoading={updateStatusMutation.isPending}
                  >
                    Revert to Draft
                  </Button>
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={() => closeEventMutation.mutate()}
                    isLoading={closeEventMutation.isPending}
                  >
                    Close Event
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    onPress={() => updateStatusMutation.mutate('cancelled')}
                    isLoading={updateStatusMutation.isPending}
                  >
                    Cancel
                  </Button>
                </>
              )}
              {event.status === 'completed' && (
                <Button
                  size="sm"
                  color="success"
                  variant="flat"
                  onPress={() => updateStatusMutation.mutate('active')}
                  isLoading={updateStatusMutation.isPending}
                >
                  Reactivate
                </Button>
              )}
              {event.status === 'cancelled' && (
                <Button
                  size="sm"
                  color="default"
                  variant="flat"
                  onPress={() => updateStatusMutation.mutate('draft')}
                  isLoading={updateStatusMutation.isPending}
                >
                  Restore as Draft
                </Button>
              )}
            </div>
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

        {rolesData && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Event Roles</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {rolesData.isCustom
                    ? 'Custom roles for this event'
                    : 'Using default roles from settings'}
                </p>
              </div>
              {!editRoles && (
                <Button color="primary" variant="flat" onPress={() => setEditRoles(true)}>
                  Customize Roles
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {editRoles ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter new role name"
                      value={newRole}
                      onValueChange={setNewRole}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCustomRole();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button color="primary" onPress={handleAddCustomRole} isDisabled={!newRole.trim()}>
                      Add Role
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {customRoles.map((role) => (
                      <Chip
                        key={role}
                        onClose={() => handleRemoveCustomRole(role)}
                        variant="flat"
                        color="primary"
                      >
                        {role}
                      </Chip>
                    ))}
                  </div>

                  {customRoles.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No roles defined. Add at least one role.
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    {rolesData.isCustom && (
                      <Button variant="light" color="warning" onPress={handleResetToDefault}>
                        Reset to Default
                      </Button>
                    )}
                    <Button variant="light" onPress={handleCancelEditRoles}>
                      Cancel
                    </Button>
                    <Button
                      color="primary"
                      onPress={handleSaveRoles}
                      isLoading={updateRolesMutation.isPending}
                      isDisabled={customRoles.length === 0}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {rolesData.roles.map((role) => (
                    <Chip key={role} variant="flat" color="default">
                      {role}
                    </Chip>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
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
                {rolesData?.roles.map((role) => (
                  <SelectItem key={role.toLowerCase()} value={role.toLowerCase()}>
                    {role}
                  </SelectItem>
                ))}
              </Select>
              <div className="flex-1" />
              <Button
                variant="flat"
                onPress={() => setIsImportModalOpen(true)}
              >
                Import
              </Button>
              <Button
                variant="flat"
                color="primary"
                onPress={() => setIsAddMemberModalOpen(true)}
              >
                Add Member
              </Button>
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
        availableRoles={rolesData?.roles}
      />

      <AddMemberAsAttendeeModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSuccess={() => {
          setIsAddMemberModalOpen(false);
          refetch();
        }}
        eventId={id}
        event={event}
        availableRoles={rolesData?.roles}
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

      <AttendeeImportModal
        isOpen={isImportModalOpen}
        eventId={id}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          refetch();
        }}
      />
    </PageWrapper>
  );
}
