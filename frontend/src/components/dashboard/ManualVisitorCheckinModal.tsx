import { useState, useEffect, useMemo } from 'react';
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
  Textarea,
  Listbox,
  ListboxItem,
  Avatar,
  Spinner,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';
import type { MemberWithDivision, Event, VisitType } from '@shared/types';

interface ManualVisitorCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const visitTypeOptions: { value: VisitType; label: string }[] = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'event', label: 'Event' },
  { value: 'official', label: 'Official' },
  { value: 'museum', label: 'Museum' },
  { value: 'other', label: 'Other' },
];

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export default function ManualVisitorCheckinModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualVisitorCheckinModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    visitType: 'other' as VisitType,
    purpose: '',
    adminNotes: '',
  });

  const [hostSearchQuery, setHostSearchQuery] = useState('');
  const [debouncedHostQuery, setDebouncedHostQuery] = useState('');
  const [hostMembers, setHostMembers] = useState<MemberWithDivision[]>([]);
  const [isSearchingHost, setIsSearchingHost] = useState(false);
  const [selectedHost, setSelectedHost] = useState<MemberWithDivision | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Debounce host search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHostQuery(hostSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [hostSearchQuery]);

  // Fetch host members when debounced query changes
  useEffect(() => {
    if (!debouncedHostQuery || debouncedHostQuery.length < 2) {
      setHostMembers([]);
      return;
    }

    const fetchMembers = async () => {
      setIsSearchingHost(true);
      try {
        const response = await api.get<{ members: MemberWithDivision[] }>(
          `/members?search=${encodeURIComponent(debouncedHostQuery)}&all=true`
        );
        setHostMembers(response.data.members);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: { message?: string } } } };
        const errorMessage = error.response?.data?.error?.message;
        if (!errorMessage) {
          throw new Error('Failed to search members: Unknown error occurred');
        }
        setError(errorMessage);
      } finally {
        setIsSearchingHost(false);
      }
    };

    fetchMembers();
  }, [debouncedHostQuery]);

  // Fetch active events on mount
  useEffect(() => {
    if (!isOpen) return;

    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const response = await api.get<{ events: Event[] }>('/events?status=active');
        setEvents(response.data.events);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: { message?: string } } } };
        const errorMessage = error.response?.data?.error?.message;
        if (errorMessage) {
          setError(errorMessage);
        }
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        organization: '',
        visitType: 'other',
        purpose: '',
        adminNotes: '',
      });
      setHostSearchQuery('');
      setDebouncedHostQuery('');
      setHostMembers([]);
      setSelectedHost(null);
      setSelectedEventId('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Visitor name is required.');
      return;
    }

    if (!formData.organization.trim()) {
      setError('Organization is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/visitors/manual', {
        name: formData.name.trim(),
        organization: formData.organization.trim(),
        visitType: formData.visitType,
        hostMemberId: selectedHost?.id,
        eventId: selectedEventId || undefined,
        purpose: formData.purpose.trim() || undefined,
        adminNotes: formData.adminNotes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      if (!errorMessage) {
        throw new Error('Failed to check in visitor: Unknown error occurred');
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHostMembers = useMemo(() => {
    if (!hostSearchQuery || hostSearchQuery.length < 2) {
      return [];
    }
    return hostMembers;
  }, [hostMembers, hostSearchQuery]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Icon icon="solar:users-group-rounded-linear" width={24} className="text-primary" />
            <h3 className="text-lg font-semibold">Check In Visitor</h3>
          </div>
        </ModalHeader>

        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Visitor Name */}
            <Input
              label="Visitor Name"
              placeholder="Enter full name..."
              value={formData.name}
              onValueChange={(value) => setFormData({ ...formData, name: value })}
              isRequired
              autoFocus
            />

            {/* Organization */}
            <Input
              label="Organization"
              placeholder="Enter organization name..."
              value={formData.organization}
              onValueChange={(value) => setFormData({ ...formData, organization: value })}
              isRequired
            />

            {/* Visit Type */}
            <Select
              label="Visit Type"
              placeholder="Select visit type"
              selectedKeys={[formData.visitType]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as VisitType;
                setFormData({ ...formData, visitType: selected });
              }}
              isRequired
            >
              {visitTypeOptions.map((option) => (
                <SelectItem key={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>

            {/* Purpose */}
            <Textarea
              label="Visit Purpose"
              placeholder="Enter reason for visit..."
              value={formData.purpose}
              onValueChange={(value) => setFormData({ ...formData, purpose: value })}
              minRows={2}
            />

            {/* Host Member Search */}
            <div>
              <Input
                label="Host Member (Optional)"
                placeholder="Search for host member..."
                value={hostSearchQuery}
                onValueChange={setHostSearchQuery}
                startContent={<Icon icon="solar:magnifer-linear" width={18} className="text-default-400" />}
                endContent={isSearchingHost && <Spinner size="sm" />}
                isClearable
                onClear={() => {
                  setHostSearchQuery('');
                  setSelectedHost(null);
                }}
                description="Type at least 2 characters to search"
              />

              {/* Selected Host */}
              {selectedHost && (
                <div className="mt-2 rounded-lg border border-primary-200 bg-primary-50 p-2">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={getInitials(selectedHost.firstName, selectedHost.lastName)}
                      color="primary"
                      size="sm"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary-700">
                        {selectedHost.rank} {selectedHost.firstName} {selectedHost.lastName}
                      </p>
                      <p className="text-xs text-primary-600">{selectedHost.serviceNumber}</p>
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => {
                        setSelectedHost(null);
                        setHostSearchQuery('');
                      }}
                      aria-label="Clear selection"
                    >
                      <Icon icon="solar:close-circle-linear" width={18} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Host Search Results */}
              {!selectedHost && filteredHostMembers.length > 0 && (
                <Listbox
                  aria-label="Host member search results"
                  className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-default-200"
                  emptyContent="No members found"
                >
                  {filteredHostMembers.map((member) => (
                    <ListboxItem
                      key={member.id}
                      textValue={`${member.rank} ${member.firstName} ${member.lastName}`}
                      onClick={() => {
                        setSelectedHost(member);
                        setHostSearchQuery('');
                      }}
                    >
                      <div className="flex items-center gap-2 py-1">
                        <Avatar
                          name={getInitials(member.firstName, member.lastName)}
                          color="success"
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {member.rank} {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-default-500">{member.serviceNumber}</p>
                        </div>
                      </div>
                    </ListboxItem>
                  ))}
                </Listbox>
              )}
            </div>

            {/* Event Selection */}
            <Select
              label="Event (Optional)"
              placeholder="Select an event"
              selectedKeys={selectedEventId ? [selectedEventId] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setSelectedEventId(selected);
              }}
              isLoading={isLoadingEvents}
              description={events.length === 0 ? 'No active events available' : undefined}
            >
              {events.map((event) => (
                <SelectItem key={event.id}>
                  {event.name} ({event.code})
                </SelectItem>
              ))}
            </Select>

            {/* Admin Notes */}
            <Textarea
              label="Admin Notes (Optional)"
              placeholder="Internal notes (not shown to visitor)..."
              value={formData.adminNotes}
              onValueChange={(value) => setFormData({ ...formData, adminNotes: value })}
              minRows={2}
              description="These notes are only visible to administrators"
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            startContent={!isSubmitting && <Icon icon="solar:check-circle-linear" width={20} />}
          >
            Check In Visitor
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
