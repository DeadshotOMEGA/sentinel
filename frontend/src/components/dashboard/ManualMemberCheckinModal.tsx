import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Listbox,
  ListboxItem,
  Chip,
  Avatar,
  Spinner,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';
import type { MemberWithDivision } from '@shared/types';

interface ManualMemberCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export default function ManualMemberCheckinModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualMemberCheckinModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [members, setMembers] = useState<MemberWithDivision[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithDivision | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch members when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setMembers([]);
      return;
    }

    const fetchMembers = async () => {
      setIsSearching(true);
      setError('');
      try {
        const response = await api.get<{ members: MemberWithDivision[] }>(
          `/members?search=${encodeURIComponent(debouncedQuery)}&all=true`
        );
        setMembers(response.data.members);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: { message?: string } } } };
        const errorMessage = error.response?.data?.error?.message;
        if (!errorMessage) {
          throw new Error('Failed to search members: Unknown error occurred');
        }
        setError(errorMessage);
      } finally {
        setIsSearching(false);
      }
    };

    fetchMembers();
  }, [debouncedQuery]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
      setMembers([]);
      setSelectedMember(null);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedMember) {
      setError('Please select a member to check in.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/checkins/manual', {
        memberId: selectedMember.id,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      if (!errorMessage) {
        throw new Error('Failed to check in member: Unknown error occurred');
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) {
      return [];
    }
    return members;
  }, [members, searchQuery]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Icon icon="solar:user-check-linear" width={24} className="text-primary" />
            <h3 className="text-lg font-semibold">Check In Member</h3>
          </div>
        </ModalHeader>

        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Search Input */}
          <Input
            label="Search Member"
            placeholder="Enter name or service number..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<Icon icon="solar:magnifer-linear" width={18} className="text-default-400" />}
            endContent={isSearching && <Spinner size="sm" />}
            isClearable
            onClear={() => setSearchQuery('')}
            description="Type at least 2 characters to search"
            autoFocus
          />

          {/* Selected Member */}
          {selectedMember && (
            <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 p-3">
              <div className="flex items-center gap-3">
                <Avatar
                  name={getInitials(selectedMember.firstName, selectedMember.lastName)}
                  color="primary"
                  size="md"
                />
                <div className="flex-1">
                  <p className="font-medium text-primary-700">
                    {selectedMember.rank} {selectedMember.firstName} {selectedMember.lastName}
                  </p>
                  <p className="text-sm text-primary-600">{selectedMember.serviceNumber}</p>
                  {selectedMember.division && (
                    <p className="text-xs text-primary-500">{selectedMember.division.name}</p>
                  )}
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => setSelectedMember(null)}
                  aria-label="Clear selection"
                >
                  <Icon icon="solar:close-circle-linear" width={20} />
                </Button>
              </div>
            </div>
          )}

          {/* Search Results */}
          {!selectedMember && filteredMembers.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-default-600">
                Found {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
              </p>
              <Listbox
                aria-label="Member search results"
                className="max-h-64 overflow-y-auto rounded-lg border border-default-200"
                emptyContent="No members found"
              >
                {filteredMembers.map((member) => (
                  <ListboxItem
                    key={member.id}
                    textValue={`${member.rank} ${member.firstName} ${member.lastName}`}
                    onClick={() => setSelectedMember(member)}
                  >
                    <div className="flex items-center gap-3 py-1">
                      <Avatar
                        name={getInitials(member.firstName, member.lastName)}
                        color="success"
                        size="sm"
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {member.rank} {member.firstName} {member.lastName}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-default-500">{member.serviceNumber}</p>
                          {member.division && (
                            <>
                              <span className="text-xs text-default-400">•</span>
                              <p className="text-xs text-default-500">{member.division.name}</p>
                            </>
                          )}
                        </div>
                      </div>
                      {member.status === 'inactive' && (
                        <Chip size="sm" variant="flat" color="warning">
                          Inactive
                        </Chip>
                      )}
                    </div>
                  </ListboxItem>
                ))}
              </Listbox>
            </div>
          )}

          {/* Empty State */}
          {!selectedMember && searchQuery.length >= 2 && filteredMembers.length === 0 && !isSearching && (
            <div className="mt-4 rounded-lg border border-dashed border-default-200 p-6 text-center">
              <Icon icon="solar:user-cross-linear" width={48} className="mx-auto mb-2 text-default-300" />
              <p className="text-sm text-default-500">No members found matching "{searchQuery}"</p>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={!selectedMember}
            startContent={!isSubmitting && <Icon icon="solar:check-circle-linear" width={20} />}
          >
            Check In
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
