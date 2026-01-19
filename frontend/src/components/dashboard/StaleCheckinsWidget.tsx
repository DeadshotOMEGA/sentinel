import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Checkbox,
  CheckboxGroup,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Chip,
  Spinner,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { getStaleCheckins, resolveStaleCheckins } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const STALE_THRESHOLD_HOURS = 12;

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
}

export default function StaleCheckinsWidget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch stale checkins
  const {
    data: staleCheckins,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stale-checkins', STALE_THRESHOLD_HOURS],
    queryFn: () => getStaleCheckins(STALE_THRESHOLD_HOURS),
    refetchInterval: 60000, // Refresh every minute
  });

  // Convert Date strings back to Date objects
  const normalizedCheckins = useMemo(() => {
    if (!staleCheckins) return [];
    return staleCheckins.map((checkin) => ({
      ...checkin,
      checkinTime: new Date(checkin.checkinTime),
    }));
  }, [staleCheckins]);

  const handleSelectionChange = useCallback((values: string[]) => {
    setSelectedIds(values);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!normalizedCheckins) return;
    setSelectedIds(normalizedCheckins.map((c) => c.memberId));
  }, [normalizedCheckins]);

  const handleSelectNone = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleOpenResolveModal = useCallback(() => {
    setNote('');
    setSubmitError('');
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setNote('');
    setSubmitError('');
  }, []);

  const handleResolve = useCallback(async () => {
    if (selectedIds.length === 0) {
      setSubmitError('Please select at least one member to resolve.');
      return;
    }
    if (!note.trim()) {
      setSubmitError('Please enter a note for the audit trail.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const result = await resolveStaleCheckins(selectedIds, note.trim());

      // Refresh data
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['present-people'] });

      // Clear selection and close modal
      setSelectedIds([]);
      handleCloseModal();

      // If there were errors, we could show them but for now just log
      if (result.errors && result.errors.length > 0) {
        console.warn('Some resolutions failed:', result.errors);
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = apiError.response?.data?.error?.message;
      if (!errorMessage) {
        throw new Error('Failed to resolve stale checkins: Unknown error occurred');
      }
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIds, note, refetch, queryClient, handleCloseModal]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardBody className="flex items-center justify-center py-6">
          <Spinner size="sm" />
          <span className="ml-2 text-default-500">Loading stale checkins...</span>
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
            <span className="text-sm">Failed to load stale checkins</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  // No stale checkins
  if (!normalizedCheckins || normalizedCheckins.length === 0) {
    return null; // Don't show the widget if there are no stale checkins
  }

  const selectedCount = selectedIds.length;

  return (
    <>
      <Card className="mb-4 border-warning-200 bg-warning-50/50">
        <CardHeader className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-500">
              <Icon icon="solar:clock-circle-bold" width={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-warning-800">Stale Check-ins</h3>
              <p className="text-xs text-warning-700">
                {normalizedCheckins.length} member{normalizedCheckins.length !== 1 ? 's' : ''} checked in{' '}
                {STALE_THRESHOLD_HOURS}+ hours ago
              </p>
            </div>
          </div>
          {isAdmin && normalizedCheckins.length > 0 && (
            <div className="flex items-center gap-2">
              {selectedCount > 0 ? (
                <>
                  <Chip size="sm" variant="flat" color="warning">
                    {selectedCount} selected
                  </Chip>
                  <Button size="sm" variant="light" color="warning" onPress={handleSelectNone}>
                    Clear
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="light" color="warning" onPress={handleSelectAll}>
                  Select All
                </Button>
              )}
              <Button
                size="sm"
                color="warning"
                variant="flat"
                isDisabled={selectedCount === 0}
                onPress={handleOpenResolveModal}
                startContent={<Icon icon="solar:logout-2-linear" width={18} />}
              >
                Resolve Selected
              </Button>
            </div>
          )}
        </CardHeader>

        <CardBody className="pt-0">
          <CheckboxGroup
            value={selectedIds}
            onValueChange={handleSelectionChange}
            classNames={{
              wrapper: 'gap-1',
            }}
          >
            {normalizedCheckins.map((checkin) => (
              <div
                key={checkin.memberId}
                className="flex items-center gap-3 rounded-lg border border-warning-100 bg-white/50 px-3 py-2"
              >
                {isAdmin && (
                  <Checkbox value={checkin.memberId} color="warning" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-warning-800 truncate">
                      {checkin.rank} {checkin.memberName}
                    </span>
                    <Chip size="sm" variant="flat" color="warning" className="shrink-0">
                      {formatDuration(checkin.durationMinutes)}
                    </Chip>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-warning-700">
                    <span>{checkin.division}</span>
                    <span className="text-warning-400">|</span>
                    <span>
                      Checked in {formatTime(checkin.checkinTime)} {formatDate(checkin.checkinTime)}
                    </span>
                    {checkin.kioskName && (
                      <>
                        <span className="text-warning-400">|</span>
                        <span>{checkin.kioskName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CheckboxGroup>
        </CardBody>
      </Card>

      {/* Resolve Modal */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} size="md">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Icon icon="solar:logout-2-linear" width={24} className="text-warning" />
              <h3 className="text-lg font-semibold">Resolve Stale Check-ins</h3>
            </div>
          </ModalHeader>

          <ModalBody>
            {submitError && (
              <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">{submitError}</div>
            )}

            <p className="mb-4 text-sm text-default-600">
              You are about to check out <strong>{selectedCount}</strong> member
              {selectedCount !== 1 ? 's' : ''} who{selectedCount !== 1 ? ' have' : ' has'} been checked in for
              more than {STALE_THRESHOLD_HOURS} hours.
            </p>

            <Input
              label="Audit Note"
              placeholder="Enter a note for the audit trail (e.g., 'End of day cleanup')"
              value={note}
              onValueChange={setNote}
              description="This note will be recorded in the system logs."
              isRequired
              autoFocus
            />
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onPress={handleCloseModal} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              color="warning"
              onPress={handleResolve}
              isLoading={isSubmitting}
              isDisabled={!note.trim()}
              startContent={!isSubmitting && <Icon icon="solar:check-circle-linear" width={20} />}
            >
              Resolve {selectedCount} Check-in{selectedCount !== 1 ? 's' : ''}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
