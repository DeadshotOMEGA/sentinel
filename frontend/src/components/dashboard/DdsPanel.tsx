import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Listbox,
  ListboxItem,
  Avatar,
  Spinner,
  Card,
  CardBody,
  Chip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { useDds, type DdsAssignment } from '../../hooks/useDds';
import { useAuth } from '../../hooks/useAuth';
import { api, assignDds, transferDds, transferLockup, getLockupHolder } from '../../lib/api';
import type { MemberWithDivision, PresentPerson } from '@shared/types';

interface DdsPanelProps {
  presentPeople: PresentPerson[];
}

interface DdsModalState {
  isOpen: boolean;
  mode: 'assign' | 'transfer';
}

interface LockupModalState {
  isOpen: boolean;
  selectedMember: MemberWithDivision | null;
  searchQuery: string;
  debouncedQuery: string;
  allMembers: MemberWithDivision[];
  isSearching: boolean;
  isSubmitting: boolean;
  submitError: string;
  currentHolder: { id: string; rank: string; firstName: string; lastName: string } | null;
  isLoadingHolder: boolean;
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
}

export default function DdsPanel({ presentPeople }: DdsPanelProps) {
  const { dds, isLoading, error, refetch } = useDds();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';

  const [modalState, setModalState] = useState<DdsModalState>({
    isOpen: false,
    mode: 'assign',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allMembers, setAllMembers] = useState<MemberWithDivision[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithDivision | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Lockup modal state
  const [lockupModal, setLockupModal] = useState<LockupModalState>({
    isOpen: false,
    selectedMember: null,
    searchQuery: '',
    debouncedQuery: '',
    allMembers: [],
    isSearching: false,
    isSubmitting: false,
    submitError: '',
    currentHolder: null,
    isLoadingHolder: false,
  });

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
      setAllMembers([]);
      return;
    }

    const fetchMembers = async () => {
      setIsSearching(true);
      try {
        const response = await api.get<{ members: MemberWithDivision[] }>(
          `/members?search=${encodeURIComponent(debouncedQuery)}&all=true`
        );
        setAllMembers(response.data.members);
      } catch (err: unknown) {
        const apiError = err as { response?: { data?: { error?: { message?: string } } } };
        const errorMessage = apiError.response?.data?.error?.message;
        if (!errorMessage) {
          throw new Error('Failed to search members: Unknown error occurred');
        }
        setSubmitError(errorMessage);
      } finally {
        setIsSearching(false);
      }
    };

    fetchMembers();
  }, [debouncedQuery]);

  // Debounce lockup search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setLockupModal((prev) => ({ ...prev, debouncedQuery: prev.searchQuery }));
    }, 300);
    return () => clearTimeout(timer);
  }, [lockupModal.searchQuery]);

  // Fetch members for lockup modal when debounced query changes
  useEffect(() => {
    if (!lockupModal.debouncedQuery || lockupModal.debouncedQuery.length < 2) {
      setLockupModal((prev) => ({ ...prev, allMembers: [] }));
      return;
    }

    const fetchMembers = async () => {
      setLockupModal((prev) => ({ ...prev, isSearching: true }));
      try {
        const response = await api.get<{ members: MemberWithDivision[] }>(
          `/members?search=${encodeURIComponent(lockupModal.debouncedQuery)}&all=true`
        );
        setLockupModal((prev) => ({ ...prev, allMembers: response.data.members }));
      } catch (err: unknown) {
        const apiError = err as { response?: { data?: { error?: { message?: string } } } };
        const errorMessage = apiError.response?.data?.error?.message;
        if (!errorMessage) {
          throw new Error('Failed to search members: Unknown error occurred');
        }
        setLockupModal((prev) => ({ ...prev, submitError: errorMessage }));
      } finally {
        setLockupModal((prev) => ({ ...prev, isSearching: false }));
      }
    };

    fetchMembers();
  }, [lockupModal.debouncedQuery]);

  // Filter to show present members first, then search results
  const filteredMembers = useMemo(() => {
    const presentMemberIds = new Set(
      presentPeople.filter((p) => p.type === 'member').map((p) => p.id)
    );

    // If searching, show search results with present members first
    if (debouncedQuery.length >= 2 && allMembers.length > 0) {
      const present = allMembers.filter((m) => presentMemberIds.has(m.id));
      const notPresent = allMembers.filter((m) => !presentMemberIds.has(m.id));
      return [...present, ...notPresent];
    }

    // If not searching, show currently present members
    return presentPeople
      .filter((p) => p.type === 'member')
      .map((p) => ({
        id: p.id,
        firstName: p.name.split(' ').slice(0, -1).join(' ') || p.name,
        lastName: p.name.split(' ').slice(-1)[0] || '',
        serviceNumber: '',
        rank: p.rank ?? '',
        division: p.division ? { id: p.divisionId ?? '', name: p.division, code: '', createdAt: new Date(), updatedAt: new Date() } : undefined,
        divisionId: p.divisionId ?? '',
        memberType: p.memberType ?? 'class_a',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as MemberWithDivision[];
  }, [presentPeople, allMembers, debouncedQuery]);

  const handleOpenModal = useCallback((mode: 'assign' | 'transfer') => {
    setModalState({ isOpen: true, mode });
    setSearchQuery('');
    setDebouncedQuery('');
    setAllMembers([]);
    setSelectedMember(null);
    setSubmitError('');
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ isOpen: false, mode: 'assign' });
    setSearchQuery('');
    setDebouncedQuery('');
    setAllMembers([]);
    setSelectedMember(null);
    setSubmitError('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedMember) {
      setSubmitError('Please select a member.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (modalState.mode === 'assign') {
        await assignDds(selectedMember.id);
      } else {
        await transferDds(selectedMember.id);
      }
      await refetch();
      handleCloseModal();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = apiError.response?.data?.error?.message;
      if (!errorMessage) {
        throw new Error(`Failed to ${modalState.mode} DDS: Unknown error occurred`);
      }
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMember, modalState.mode, refetch, handleCloseModal]);

  // Filter to show present members first for lockup modal
  const lockupFilteredMembers = useMemo(() => {
    const presentMemberIds = new Set(
      presentPeople.filter((p) => p.type === 'member').map((p) => p.id)
    );

    // If searching, show search results with present members first
    if (lockupModal.debouncedQuery.length >= 2 && lockupModal.allMembers.length > 0) {
      const present = lockupModal.allMembers.filter((m) => presentMemberIds.has(m.id));
      const notPresent = lockupModal.allMembers.filter((m) => !presentMemberIds.has(m.id));
      return [...present, ...notPresent];
    }

    // If not searching, show currently present members
    return presentPeople
      .filter((p) => p.type === 'member')
      .map((p) => ({
        id: p.id,
        firstName: p.name.split(' ').slice(0, -1).join(' ') || p.name,
        lastName: p.name.split(' ').slice(-1)[0] || '',
        serviceNumber: '',
        rank: p.rank ?? '',
        division: p.division ? { id: p.divisionId ?? '', name: p.division, code: '', createdAt: new Date(), updatedAt: new Date() } : undefined,
        divisionId: p.divisionId ?? '',
        memberType: p.memberType ?? 'class_a',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as MemberWithDivision[];
  }, [presentPeople, lockupModal.allMembers, lockupModal.debouncedQuery]);

  const handleOpenLockupModal = useCallback(async () => {
    setLockupModal({
      isOpen: true,
      selectedMember: null,
      searchQuery: '',
      debouncedQuery: '',
      allMembers: [],
      isSearching: false,
      isSubmitting: false,
      submitError: '',
      currentHolder: null,
      isLoadingHolder: true,
    });

    // Fetch current Lockup holder
    try {
      console.log('[Transfer Lockup] Fetching current holder...');
      const result = await getLockupHolder();
      console.log('[Transfer Lockup] API response:', result);
      console.log('[Transfer Lockup] Holder:', result.holder);
      setLockupModal((prev) => ({ ...prev, currentHolder: result.holder, isLoadingHolder: false }));
    } catch (error) {
      console.error('[Transfer Lockup] Failed to fetch Lockup holder:', error);
      console.error('[Transfer Lockup] Error details:', JSON.stringify(error, null, 2));
      setLockupModal((prev) => ({ ...prev, isLoadingHolder: false, currentHolder: null }));
    }
  }, []);

  const handleCloseLockupModal = useCallback(() => {
    setLockupModal({
      isOpen: false,
      selectedMember: null,
      searchQuery: '',
      debouncedQuery: '',
      allMembers: [],
      isSearching: false,
      isSubmitting: false,
      submitError: '',
      currentHolder: null,
      isLoadingHolder: false,
    });
  }, []);

  const handleSubmitLockup = useCallback(async () => {
    if (!lockupModal.selectedMember) {
      setLockupModal((prev) => ({ ...prev, submitError: 'Please select a member.' }));
      return;
    }

    setLockupModal((prev) => ({ ...prev, isSubmitting: true, submitError: '' }));

    try {
      await transferLockup(lockupModal.selectedMember.id);
      await refetch();
      handleCloseLockupModal();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = apiError.response?.data?.error?.message;
      if (!errorMessage) {
        throw new Error('Failed to transfer lockup tag: Unknown error occurred');
      }
      setLockupModal((prev) => ({ ...prev, submitError: errorMessage }));
    } finally {
      setLockupModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [lockupModal.selectedMember, refetch, handleCloseLockupModal]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardBody className="flex items-center justify-center py-6">
          <Spinner size="sm" />
          <span className="ml-2 text-default-500">Loading DDS...</span>
        </CardBody>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="mb-4 border-danger-200 bg-danger-50">
        <CardBody className="py-3">
          <div className="flex items-center gap-2 text-danger">
            <Icon icon="solar:danger-triangle-bold" width={20} />
            <span className="text-sm">{error}</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      {/* DDS Panel */}
      {dds ? (
        <DdsAssignedPanel dds={dds} isAdmin={isAdmin} onTransfer={() => handleOpenModal('transfer')} onTransferLockup={handleOpenLockupModal} />
      ) : (
        <NoDdsPanel isAdmin={isAdmin} onAssign={() => handleOpenModal('assign')} />
      )}

      {/* Assign/Transfer Modal */}
      <Modal isOpen={modalState.isOpen} onClose={handleCloseModal} size="md">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Icon
                icon={modalState.mode === 'assign' ? 'solar:user-plus-linear' : 'solar:transfer-horizontal-linear'}
                width={24}
                className="text-primary"
              />
              <h3 className="text-lg font-semibold">
                {modalState.mode === 'assign' ? 'Assign DDS' : 'Transfer DDS'}
              </h3>
            </div>
          </ModalHeader>

          <ModalBody>
            {submitError && (
              <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
                {submitError}
              </div>
            )}

            {/* Search Input */}
            <Input
              label="Search Member"
              placeholder="Enter name or search present members..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Icon icon="solar:magnifer-linear" width={18} className="text-default-400" />}
              endContent={isSearching && <Spinner size="sm" />}
              isClearable
              onClear={() => setSearchQuery('')}
              description={
                debouncedQuery.length < 2
                  ? 'Showing present members. Type to search all members.'
                  : undefined
              }
              autoFocus
            />

            {/* Selected Member */}
            {selectedMember && (
              <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={getInitials(`${selectedMember.firstName} ${selectedMember.lastName}`)}
                    color="primary"
                    size="md"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-primary-700">
                      {selectedMember.rank} {selectedMember.firstName} {selectedMember.lastName}
                    </p>
                    {selectedMember.division && (
                      <p className="text-sm text-primary-600">{selectedMember.division.name}</p>
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

            {/* Member List */}
            {!selectedMember && filteredMembers.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-default-600">
                  {debouncedQuery.length < 2
                    ? `${filteredMembers.length} present member${filteredMembers.length !== 1 ? 's' : ''}`
                    : `Found ${filteredMembers.length} member${filteredMembers.length !== 1 ? 's' : ''}`}
                </p>
                <Listbox
                  aria-label="Member selection"
                  className="max-h-64 overflow-y-auto rounded-lg border border-default-200"
                  emptyContent="No members found"
                >
                  {filteredMembers.map((member) => (
                    <ListboxItem
                      key={member.id}
                      textValue={`${member.rank} ${member.firstName} ${member.lastName}`}
                      onPress={() => setSelectedMember(member)}
                    >
                      <div className="flex items-center gap-3 py-1">
                        <Avatar
                          name={getInitials(`${member.firstName} ${member.lastName}`)}
                          color="success"
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="font-medium">
                            {member.rank} {member.firstName} {member.lastName}
                          </p>
                          {member.division && (
                            <p className="text-xs text-default-500">{member.division.name}</p>
                          )}
                        </div>
                      </div>
                    </ListboxItem>
                  ))}
                </Listbox>
              </div>
            )}

            {/* Empty State */}
            {!selectedMember && filteredMembers.length === 0 && !isSearching && (
              <div className="mt-4 rounded-lg border border-dashed border-default-200 p-6 text-center">
                <Icon icon="solar:users-group-rounded-linear" width={48} className="mx-auto mb-2 text-default-300" />
                <p className="text-sm text-default-500">
                  {debouncedQuery.length >= 2
                    ? `No members found matching "${searchQuery}"`
                    : 'No members currently present'}
                </p>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onPress={handleCloseModal} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              isDisabled={!selectedMember}
              startContent={
                !isSubmitting && (
                  <Icon
                    icon={modalState.mode === 'assign' ? 'solar:check-circle-linear' : 'solar:transfer-horizontal-linear'}
                    width={20}
                  />
                )
              }
            >
              {modalState.mode === 'assign' ? 'Assign DDS' : 'Transfer DDS'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Transfer Lockup Modal */}
      <Modal isOpen={lockupModal.isOpen} onClose={handleCloseLockupModal} size="md">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Icon
                icon="solar:key-linear"
                width={24}
                className="text-warning"
              />
              <h3 className="text-lg font-semibold">Transfer Lockup Tag</h3>
            </div>
          </ModalHeader>

          <ModalBody>
            {lockupModal.submitError && (
              <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
                {lockupModal.submitError}
              </div>
            )}

            {/* Current Holder Display */}
            {lockupModal.isLoadingHolder && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-default-100 border border-default-200">
                <Spinner size="sm" />
                <span className="text-sm text-default-600">Loading current holder...</span>
              </div>
            )}

            {!lockupModal.isLoadingHolder && lockupModal.currentHolder && (
              <div className="mb-4 p-3 rounded-lg bg-warning-50 border border-warning-200">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="solar:key-bold" width={20} className="text-warning-600" />
                  <span className="text-sm font-semibold text-warning-900">Current Holder</span>
                </div>
                <div className="text-sm text-warning-800">
                  {lockupModal.currentHolder.rank} {lockupModal.currentHolder.firstName}{' '}
                  {lockupModal.currentHolder.lastName}
                </div>
              </div>
            )}

            {!lockupModal.isLoadingHolder && lockupModal.currentHolder === null && (
              <div className="mb-4 p-3 rounded-lg bg-default-100 border border-default-200">
                <div className="text-sm text-default-600">
                  No one currently has the Lockup tag
                </div>
              </div>
            )}

            {/* Transfer To Label */}
            <div className="mb-2">
              <span className="text-sm font-medium text-default-700">Transfer To</span>
            </div>

            {/* Search Input */}
            <Input
              placeholder="Enter name or search present members..."
              value={lockupModal.searchQuery}
              onValueChange={(value) => setLockupModal((prev) => ({ ...prev, searchQuery: value }))}
              startContent={<Icon icon="solar:magnifer-linear" width={18} className="text-default-400" />}
              endContent={lockupModal.isSearching && <Spinner size="sm" />}
              isClearable
              onClear={() => setLockupModal((prev) => ({ ...prev, searchQuery: '' }))}
              description={
                lockupModal.debouncedQuery.length < 2
                  ? 'Showing present members. Type to search all members.'
                  : undefined
              }
              autoFocus
            />

            {/* Selected Member */}
            {lockupModal.selectedMember && (
              <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={getInitials(`${lockupModal.selectedMember.firstName} ${lockupModal.selectedMember.lastName}`)}
                    color="primary"
                    size="md"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-primary-700">
                      {lockupModal.selectedMember.rank} {lockupModal.selectedMember.firstName} {lockupModal.selectedMember.lastName}
                    </p>
                    {lockupModal.selectedMember.division && (
                      <p className="text-sm text-primary-600">{lockupModal.selectedMember.division.name}</p>
                    )}
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setLockupModal((prev) => ({ ...prev, selectedMember: null }))}
                    aria-label="Clear selection"
                  >
                    <Icon icon="solar:close-circle-linear" width={20} />
                  </Button>
                </div>
              </div>
            )}

            {/* Member List */}
            {!lockupModal.selectedMember && lockupFilteredMembers.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-default-600">
                  {lockupModal.debouncedQuery.length < 2
                    ? `${lockupFilteredMembers.length} present member${lockupFilteredMembers.length !== 1 ? 's' : ''}`
                    : `Found ${lockupFilteredMembers.length} member${lockupFilteredMembers.length !== 1 ? 's' : ''}`}
                </p>
                <Listbox
                  aria-label="Member selection for lockup"
                  className="max-h-64 overflow-y-auto rounded-lg border border-default-200"
                  emptyContent="No members found"
                >
                  {lockupFilteredMembers.map((member) => (
                    <ListboxItem
                      key={member.id}
                      textValue={`${member.rank} ${member.firstName} ${member.lastName}`}
                      onPress={() => setLockupModal((prev) => ({ ...prev, selectedMember: member }))}
                    >
                      <div className="flex items-center gap-3 py-1">
                        <Avatar
                          name={getInitials(`${member.firstName} ${member.lastName}`)}
                          color="warning"
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="font-medium">
                            {member.rank} {member.firstName} {member.lastName}
                          </p>
                          {member.division && (
                            <p className="text-xs text-default-500">{member.division.name}</p>
                          )}
                        </div>
                      </div>
                    </ListboxItem>
                  ))}
                </Listbox>
              </div>
            )}

            {/* Empty State */}
            {!lockupModal.selectedMember && lockupFilteredMembers.length === 0 && !lockupModal.isSearching && (
              <div className="mt-4 rounded-lg border border-dashed border-default-200 p-6 text-center">
                <Icon icon="solar:users-group-rounded-linear" width={48} className="mx-auto mb-2 text-default-300" />
                <p className="text-sm text-default-500">
                  {lockupModal.debouncedQuery.length >= 2
                    ? `No members found matching "${lockupModal.searchQuery}"`
                    : 'No members currently present'}
                </p>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onPress={handleCloseLockupModal} isDisabled={lockupModal.isSubmitting}>
              Cancel
            </Button>
            <Button
              color="warning"
              onPress={handleSubmitLockup}
              isLoading={lockupModal.isSubmitting}
              isDisabled={!lockupModal.selectedMember}
              startContent={
                !lockupModal.isSubmitting && (
                  <Icon
                    icon="solar:key-linear"
                    width={20}
                  />
                )
              }
            >
              Transfer Lockup
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface DdsAssignedPanelProps {
  dds: DdsAssignment;
  isAdmin: boolean;
  onTransfer: () => void;
  onTransferLockup: () => void;
}

function DdsAssignedPanel({ dds, isAdmin, onTransfer, onTransferLockup }: DdsAssignedPanelProps) {
  return (
    <Card className="mb-4 border-success-200 bg-success-50/50">
      <CardBody className="py-3">
        <div className="flex items-center justify-between gap-4">
          {/* DDS Info */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-500">
              <Icon icon="solar:shield-user-bold" width={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Chip size="sm" color="success" variant="flat" className="font-semibold">
                  DDS
                </Chip>
                <span className="font-medium text-success-800">
                  {dds.member.rank} {dds.member.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-success-700">
                {dds.member.division && (
                  <>
                    <span>{dds.member.division}</span>
                    <span className="text-success-400">|</span>
                  </>
                )}
                <span>
                  {dds.acceptedAt
                    ? `Self-accepted at ${formatTime(dds.acceptedAt)}`
                    : `Assigned at ${formatTime(dds.assignedDate)}`}
                </span>
                <span className="text-success-400">|</span>
                <span>{formatDate(dds.assignedDate)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                color="success"
                className="min-h-11"
                onPress={onTransfer}
                startContent={<Icon icon="solar:transfer-horizontal-linear" width={18} />}
              >
                Transfer DDS
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="warning"
                className="min-h-11"
                onPress={onTransferLockup}
                startContent={<Icon icon="solar:key-linear" width={18} />}
              >
                Transfer Lockup
              </Button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

interface NoDdsPanelProps {
  isAdmin: boolean;
  onAssign: () => void;
}

function NoDdsPanel({ isAdmin, onAssign }: NoDdsPanelProps) {
  return (
    <Card className="mb-4 border-warning-200 bg-warning-50/50">
      <CardBody className="py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Warning Info */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-500">
              <Icon icon="solar:shield-warning-bold" width={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Chip size="sm" color="warning" variant="flat" className="font-semibold">
                  No DDS
                </Chip>
                <span className="font-medium text-warning-800">No DDS assigned for today</span>
              </div>
              <p className="text-sm text-warning-700">
                A Duty Day Staff member should be assigned for building open/lockup.
              </p>
            </div>
          </div>

          {/* Assign Button */}
          {isAdmin && (
            <Button
              size="sm"
              variant="flat"
              color="warning"
              className="min-h-11"
              onPress={onAssign}
              startContent={<Icon icon="solar:user-plus-linear" width={18} />}
            >
              Assign DDS
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
