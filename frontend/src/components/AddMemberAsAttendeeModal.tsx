import { useState, useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Chip,
} from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Event, MemberWithDivision } from '@shared/types';

interface AddMemberAsAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventId: string;
  event: Event;
  availableRoles?: string[];
}

interface MembersResponse {
  members: MemberWithDivision[];
}

const defaultRoles = ['Participant', 'Instructor', 'Staff', 'Volunteer'];

export default function AddMemberAsAttendeeModal({
  isOpen,
  onClose,
  onSuccess,
  eventId,
  event,
  availableRoles = defaultRoles,
}: AddMemberAsAttendeeModalProps) {
  const roles = availableRoles;
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberWithDivision | null>(null);
  const [selectedRole, setSelectedRole] = useState(roles[0] || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['members-for-attendee', search],
    queryFn: async () => {
      const params = new URLSearchParams({ all: 'true', status: 'active' });
      if (search) params.set('search', search);
      const response = await api.get<MembersResponse>(`/members?${params}`);
      return response.data;
    },
    enabled: isOpen,
  });

  const members = membersData?.members ?? [];

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members.slice(0, 50);
    return members;
  }, [members, search]);

  const handleSelectMember = (member: MemberWithDivision) => {
    setSelectedMember(member);
    setError('');
  };

  const handleSubmit = async () => {
    if (!selectedMember) {
      setError('Please select a member');
      return;
    }
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload: Record<string, string | undefined> = {
        name: `${selectedMember.firstName} ${selectedMember.lastName}`,
        rank: selectedMember.rank,
        organization: selectedMember.division?.name
          ? `HMCS Chippawa - ${selectedMember.division.name}`
          : 'HMCS Chippawa',
        role: selectedRole,
        accessStart: new Date(event.startDate).toISOString().split('T')[0],
        accessEnd: new Date(event.endDate).toISOString().split('T')[0],
      };

      // If member has a badge, link it to the event attendee
      if (selectedMember.badgeId) {
        payload.badgeId = selectedMember.badgeId;
        payload.badgeAssignedAt = new Date().toISOString();
      }

      await api.post(`/events/${eventId}/attendees`, payload);

      // Reset state
      setSelectedMember(null);
      setSelectedRole(roles[0] || '');
      setSearch('');

      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to add member as attendee - no error message received');
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedMember(null);
    setSelectedRole(roles[0] || '');
    setSearch('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Add Member as Attendee</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              placeholder="Search members by name, rank, or service number..."
              value={search}
              onValueChange={setSearch}
              isClearable
              autoFocus
            />

            {selectedMember ? (
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {selectedMember.rank} {selectedMember.firstName} {selectedMember.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedMember.division?.name} • {selectedMember.serviceNumber}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setSelectedMember(null)}
                  >
                    Change
                  </Button>
                </div>

                {selectedMember.badgeId && (
                  <div className="mt-3 flex items-center gap-2">
                    <Chip size="sm" color="success" variant="flat">
                      Badge Linked
                    </Chip>
                    <span className="text-sm text-gray-600">
                      Member's badge will be used for event check-in
                    </span>
                  </div>
                )}

                <div className="mt-4">
                  <Select
                    label="Role for this event"
                    selectedKeys={[selectedRole]}
                    onSelectionChange={(keys) =>
                      setSelectedRole(Array.from(keys)[0] as string)
                    }
                    isRequired
                  >
                    {roles.map((role) => (
                      <SelectItem key={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-auto">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    {search ? 'No members found matching your search' : 'No active members found'}
                  </div>
                ) : (
                  <Table
                    aria-label="Select a member"
                    selectionMode="single"
                    onRowAction={(key) => {
                      const member = filteredMembers.find((m) => m.id === key);
                      if (member) handleSelectMember(member);
                    }}
                  >
                    <TableHeader>
                      <TableColumn>NAME</TableColumn>
                      <TableColumn>DIVISION</TableColumn>
                      <TableColumn>BADGE</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow key={member.id} className="cursor-pointer">
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {member.rank} {member.firstName} {member.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{member.serviceNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell>{member.division?.name || '-'}</TableCell>
                          <TableCell>
                            {member.badgeId ? (
                              <Chip size="sm" color="success" variant="flat">
                                Assigned
                              </Chip>
                            ) : (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={!selectedMember || !selectedRole}
          >
            Add as Attendee
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
