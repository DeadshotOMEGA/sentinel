import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Tabs,
  Tab,
  Spinner,
  Card,
  CardBody,
} from '@heroui/react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import type { Badge, MemberWithDivision } from '@shared/types';

interface MemberBadgeAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member: MemberWithDivision;
}

interface BadgesResponse {
  badges: Badge[];
}

interface BadgeResponse {
  badge: Badge;
}

export default function MemberBadgeAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
  member,
}: MemberBadgeAssignmentModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>('scan');
  const [serialNumber, setSerialNumber] = useState('');
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>('');
  const [error, setError] = useState('');

  // Fetch unassigned badges for the select list
  const { data: badgesData, isLoading: badgesLoading } = useQuery({
    queryKey: ['unassigned-badges'],
    queryFn: async () => {
      const response = await api.get<BadgesResponse>(
        '/badges?assignmentType=unassigned&status=active'
      );
      return response.data;
    },
    enabled: isOpen && tab === 'select',
  });

  // Assign badge mutation
  const assignMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      await api.put(`/badges/${badgeId}/assign`, {
        assignedToId: member.id,
        assignmentType: 'member',
      });
    },
    onSuccess: async () => {
      // Refetch to ensure fresh data before closing
      await queryClient.refetchQueries({ queryKey: ['member', member.id] });
      await queryClient.invalidateQueries({ queryKey: ['unassigned-badges'] });
      toast.success('Badge assigned successfully');
      onSuccess();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to assign badge - no error message received');
      }
      setError(message);
    },
  });

  // Unassign badge mutation
  const unassignMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      await api.put(`/badges/${badgeId}/unassign`);
    },
    onSuccess: async () => {
      // Refetch to ensure fresh data before closing
      await queryClient.refetchQueries({ queryKey: ['member', member.id] });
      await queryClient.invalidateQueries({ queryKey: ['unassigned-badges'] });
      toast.success('Badge unassigned successfully');
      onSuccess();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to unassign badge - no error message received');
      }
      setError(message);
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab('scan');
      setSerialNumber('');
      setSelectedBadgeId('');
      setError('');
    }
  }, [isOpen]);

  const handleScanAssign = async () => {
    if (!serialNumber.trim()) {
      setError('Please enter a badge serial number');
      return;
    }

    setError('');

    try {
      // Look up badge by serial number
      const response = await api.get<BadgeResponse>(
        `/badges/by-serial/${encodeURIComponent(serialNumber.trim())}`
      );
      const badge = response.data.badge;

      if (badge.assignmentType !== 'unassigned') {
        setError('This badge is already assigned to someone');
        return;
      }

      if (badge.status !== 'active') {
        setError('This badge is not active');
        return;
      }

      assignMutation.mutate(badge.id);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
      if (error.response?.status === 404) {
        setError('Badge not found');
      } else {
        const message = error.response?.data?.error?.message;
        if (!message) {
          throw new Error('Failed to find badge - no error message received');
        }
        setError(message);
      }
    }
  };

  const handleSelectAssign = () => {
    if (!selectedBadgeId) {
      setError('Please select a badge');
      return;
    }
    setError('');
    assignMutation.mutate(selectedBadgeId);
  };

  const handleUnassign = () => {
    if (!member.badgeId) {
      setError('No badge to unassign');
      return;
    }
    setError('');
    unassignMutation.mutate(member.badgeId);
  };

  const badges = badgesData?.badges;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>
          {member.badgeId ? 'Manage Badge Assignment' : 'Assign Badge'}
        </ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm font-medium mb-1">
              {member.rank} {member.lastName}, {member.firstName}
            </p>
            <p className="text-xs text-gray-600">
              SN: {member.serviceNumber} | {member.division.name}
            </p>
          </div>

          {member.badgeId ? (
            <Card>
              <CardBody className="text-center py-6">
                <p className="text-sm text-gray-600 mb-2">Currently Assigned Badge</p>
                <p className="text-xl font-mono font-bold text-success">{member.badgeId}</p>
                <Button
                  color="warning"
                  variant="flat"
                  size="sm"
                  onPress={handleUnassign}
                  isLoading={unassignMutation.isPending}
                  className="mt-4"
                >
                  Unassign Badge
                </Button>
              </CardBody>
            </Card>
          ) : (
            <>
              <Tabs
                selectedKey={tab}
                onSelectionChange={(k) => setTab(k as string)}
                className="mb-4"
              >
                <Tab key="scan" title="Scan Badge" />
                <Tab key="select" title="Select from List" />
              </Tabs>

              {tab === 'scan' && (
                <div className="space-y-4">
                  <Input
                    label="Badge Serial Number"
                    placeholder="Scan or enter badge number"
                    value={serialNumber}
                    onValueChange={setSerialNumber}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleScanAssign();
                      }
                    }}
                  />
                  <p className="text-xs text-gray-600">
                    Tap into the field and scan the RFID badge, or manually enter the serial
                    number
                  </p>
                </div>
              )}

              {tab === 'select' && (
                <div className="space-y-4">
                  {badgesLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : badges && badges.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {badges.map((badge) => (
                        <Card
                          key={badge.id}
                          isPressable
                          isHoverable
                          onPress={() => setSelectedBadgeId(badge.id)}
                          className={
                            selectedBadgeId === badge.id
                              ? 'border-2 border-primary'
                              : ''
                          }
                        >
                          <CardBody className="py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-mono font-medium">
                                  {badge.serialNumber}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Last used:{' '}
                                  {badge.lastUsed
                                    ? new Date(badge.lastUsed).toLocaleDateString()
                                    : 'Never'}
                                </p>
                              </div>
                              {selectedBadgeId === badge.id && (
                                <span className="text-primary text-xl">✓</span>
                              )}
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No unassigned badges available
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            {member.badgeId ? 'Close' : 'Cancel'}
          </Button>
          {!member.badgeId && (
            <Button
              color="primary"
              onPress={tab === 'scan' ? handleScanAssign : handleSelectAssign}
              isLoading={assignMutation.isPending}
            >
              Assign Badge
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
