import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Avatar,
  Chip,
  Divider,
  Input,
  Textarea,
  Select,
  SelectItem,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { formatDistanceToNow, format } from 'date-fns';
import type { PresentPerson, CreateAlertInput, AlertSeverity } from '@shared/types';

interface PersonDetailModalProps {
  person: PresentPerson | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (personId: string, type: 'member' | 'visitor') => Promise<void>;
  onUpdate?: (personId: string, data: { eventId?: string; hostMemberId?: string; purpose?: string }) => Promise<void>;
  onCreateAlert?: (data: CreateAlertInput) => Promise<void>;
  onDismissAlert?: (alertId: string) => Promise<void>;
}

interface EditData {
  eventId: string;
  hostMemberId: string;
  purpose: string;
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PersonDetailModal({
  person,
  isOpen,
  onClose,
  onCheckout,
  onUpdate,
  onCreateAlert,
  onDismissAlert,
}: PersonDetailModalProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<EditData>({
    eventId: '',
    hostMemberId: '',
    purpose: '',
  });
  const [error, setError] = useState('');
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertForm, setAlertForm] = useState<{
    severity: AlertSeverity;
    message: string;
    expiresAt: string;
  }>({
    severity: 'info',
    message: '',
    expiresAt: '',
  });
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);

  useEffect(() => {
    if (person && person.type === 'visitor') {
      setEditData({
        eventId: person.eventId || '',
        hostMemberId: person.hostMemberId || '',
        purpose: person.visitReason || '',
      });
    }
    setIsEditing(false);
    setError('');
    setShowAlertForm(false);
    setAlertForm({
      severity: 'info',
      message: '',
      expiresAt: '',
    });
  }, [person, isOpen]);

  if (!person) {
    return null;
  }

  const isMember = person.type === 'member';
  const avatarColor = isMember ? 'success' : 'primary';
  const chipColor = isMember ? 'success' : 'primary';
  const chipLabel = isMember ? 'Member' : 'Visitor';

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setError('');
    try {
      await onCheckout(person.id, person.type);
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      if (!errorMessage) {
        const unknownError = new Error('Failed to check out: Unknown error occurred');
        setError(unknownError.message);
        throw unknownError;
      }
      setError(errorMessage);
      throw err;
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!onUpdate) {
      throw new Error('onUpdate handler is not provided');
    }

    setIsSaving(true);
    setError('');
    try {
      await onUpdate(person.id, {
        eventId: editData.eventId || undefined,
        hostMemberId: editData.hostMemberId || undefined,
        purpose: editData.purpose || undefined,
      });
      setIsEditing(false);
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      if (!errorMessage) {
        const unknownError = new Error('Failed to update visitor: Unknown error occurred');
        setError(unknownError.message);
        throw unknownError;
      }
      setError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({
      eventId: person.eventId || '',
      hostMemberId: person.hostMemberId || '',
      purpose: person.visitReason || '',
    });
    setError('');
  };

  const handleCreateAlert = async () => {
    if (!onCreateAlert || !person) {
      throw new Error('onCreateAlert handler is not provided');
    }

    if (!alertForm.message.trim()) {
      setError('Alert message is required');
      return;
    }

    setIsCreatingAlert(true);
    setError('');
    try {
      await onCreateAlert({
        targetType: person.type,
        targetId: person.id,
        severity: alertForm.severity,
        message: alertForm.message.trim(),
        expiresAt: alertForm.expiresAt ? new Date(alertForm.expiresAt) : undefined,
      });
      setShowAlertForm(false);
      setAlertForm({
        severity: 'info',
        message: '',
        expiresAt: '',
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      if (!errorMessage) {
        const unknownError = new Error('Failed to create alert: Unknown error occurred');
        setError(unknownError.message);
        throw unknownError;
      }
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreatingAlert(false);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    if (!onDismissAlert) {
      throw new Error('onDismissAlert handler is not provided');
    }

    setError('');
    try {
      await onDismissAlert(alertId);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      if (!errorMessage) {
        const unknownError = new Error('Failed to dismiss alert: Unknown error occurred');
        setError(unknownError.message);
        throw unknownError;
      }
      setError(errorMessage);
      throw err;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" data-testid="person-detail-modal">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Avatar
              name={getInitials(person.name)}
              color={avatarColor}
              showFallback
              size="lg"
              data-testid="modal-avatar"
            />
            <div className="flex-1">
              <h3 className="text-xl font-semibold" data-testid="modal-person-name">{person.name}</h3>
              <Chip size="sm" variant="flat" color={chipColor} className="mt-1" data-testid="modal-type-badge">
                {chipLabel}
              </Chip>
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Check-in Time */}
            <div className="flex items-start gap-2">
              <Icon icon="mdi:clock-outline" className="mt-0.5 text-default-400" width={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-default-700">Check-in Time</p>
                <p className="text-sm text-default-500">
                  {format(person.checkInTime, 'MMM d, yyyy h:mm a')}
                </p>
                <p className="text-xs text-default-400">
                  {formatDistanceToNow(person.checkInTime, { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Kiosk Location */}
            {person.kioskName && (
              <div className="flex items-start gap-2">
                <Icon icon="mdi:door" className="mt-0.5 text-default-400" width={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-default-700">Location</p>
                  <p className="text-sm text-default-500">{person.kioskName}</p>
                </div>
              </div>
            )}

            {/* Member-specific fields */}
            {isMember && (
              <>
                {person.division && (
                  <div className="flex items-start gap-2">
                    <Icon icon="mdi:shield-account" className="mt-0.5 text-default-400" width={20} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-default-700">Division</p>
                      <p className="text-sm text-default-500">{person.division}</p>
                    </div>
                  </div>
                )}

                {person.rank && (
                  <div className="flex items-start gap-2">
                    <Icon icon="mdi:star-outline" className="mt-0.5 text-default-400" width={20} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-default-700">Rank</p>
                      <p className="text-sm text-default-500">{person.rank}</p>
                    </div>
                  </div>
                )}

                {person.memberType && (
                  <div className="flex items-start gap-2">
                    <Icon icon="mdi:account-details" className="mt-0.5 text-default-400" width={20} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-default-700">Member Type</p>
                      <p className="text-sm text-default-500">
                        {person.memberType.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Visitor-specific fields */}
            {!isMember && (
              <>
                {person.organization && (
                  <div className="flex items-start gap-2">
                    <Icon icon="mdi:office-building" className="mt-0.5 text-default-400" width={20} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-default-700">Organization</p>
                      <p className="text-sm text-default-500">{person.organization}</p>
                    </div>
                  </div>
                )}

                {isEditing ? (
                  <div className="flex items-start gap-2">
                    <Icon icon="mdi:text-box-outline" className="mt-0.5 text-default-400" width={20} />
                    <div className="flex-1">
                      <Input
                        label="Visit Reason"
                        value={editData.purpose}
                        onValueChange={(v) => setEditData({ ...editData, purpose: v })}
                        size="sm"
                      />
                    </div>
                  </div>
                ) : (
                  person.visitReason && (
                    <div className="flex items-start gap-2">
                      <Icon icon="mdi:text-box-outline" className="mt-0.5 text-default-400" width={20} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-default-700">Visit Reason</p>
                        <p className="text-sm text-default-500">{person.visitReason}</p>
                      </div>
                    </div>
                  )
                )}

                {isEditing ? (
                  <div className="flex items-start gap-2">
                    <Icon icon="mdi:account" className="mt-0.5 text-default-400" width={20} />
                    <div className="flex-1">
                      <Input
                        label="Host Member ID"
                        value={editData.hostMemberId}
                        onValueChange={(v) => setEditData({ ...editData, hostMemberId: v })}
                        size="sm"
                        description="Optional: Member ID of the host"
                      />
                    </div>
                  </div>
                ) : (
                  person.hostName && (
                    <div className="flex items-start gap-2">
                      <Icon icon="mdi:account" className="mt-0.5 text-default-400" width={20} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-default-700">Host</p>
                        <p className="text-sm text-default-500">{person.hostName}</p>
                      </div>
                    </div>
                  )
                )}

                {isEditing ? (
                  <div className="flex items-start gap-2">
                    <Icon icon="mdi:calendar-star" className="mt-0.5 text-default-400" width={20} />
                    <div className="flex-1">
                      <Input
                        label="Event ID"
                        value={editData.eventId}
                        onValueChange={(v) => setEditData({ ...editData, eventId: v })}
                        size="sm"
                        description="Optional: Associated event ID"
                      />
                    </div>
                  </div>
                ) : (
                  person.eventName && (
                    <div className="flex items-start gap-2">
                      <Icon icon="mdi:calendar-star" className="mt-0.5 text-default-400" width={20} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-default-700">Event</p>
                        <p className="text-sm text-default-500">{person.eventName}</p>
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </div>

          <Divider className="my-4" />

          {/* Actions Section */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-default-700">Actions</p>
            <div className="flex gap-2">
              <Button
                color="danger"
                variant="flat"
                onPress={handleCheckout}
                isLoading={isCheckingOut}
                startContent={
                  !isCheckingOut && <Icon icon="mdi:logout" width={20} />
                }
                className="flex-1"
              >
                Check Out
              </Button>

              {!isMember && onUpdate && (
                <>
                  {isEditing ? (
                    <>
                      <Button
                        color="success"
                        variant="flat"
                        onPress={handleSaveEdit}
                        isLoading={isSaving}
                        startContent={
                          !isSaving && <Icon icon="mdi:content-save" width={20} />
                        }
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        variant="light"
                        onPress={handleCancelEdit}
                        isDisabled={isSaving}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      color="primary"
                      variant="flat"
                      onPress={() => setIsEditing(true)}
                      startContent={<Icon icon="mdi:pencil" width={20} />}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Alert Management Section */}
          {onCreateAlert && onDismissAlert && (
            <>
              <Divider className="my-4" />
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-default-700">Alerts</p>
                  {!showAlertForm && (
                    <Button
                      size="sm"
                      color="warning"
                      variant="flat"
                      onPress={() => setShowAlertForm(true)}
                      startContent={<Icon icon="mdi:flag-plus" width={18} />}
                    >
                      Flag Person
                    </Button>
                  )}
                </div>

                {/* Alert Creation Form */}
                {showAlertForm && (
                  <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon icon="mdi:flag-plus" className="text-warning" width={20} />
                      <p className="text-sm font-medium text-warning-700">Create New Alert</p>
                    </div>

                    <Select
                      label="Severity"
                      selectedKeys={[alertForm.severity]}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as AlertSeverity;
                        setAlertForm({ ...alertForm, severity: selected });
                      }}
                      size="sm"
                    >
                      <SelectItem key="info">Info</SelectItem>
                      <SelectItem key="warning">Warning</SelectItem>
                      <SelectItem key="critical">Critical</SelectItem>
                    </Select>

                    <Textarea
                      label="Message"
                      placeholder="Enter alert message..."
                      value={alertForm.message}
                      onValueChange={(v) => setAlertForm({ ...alertForm, message: v })}
                      minRows={2}
                      size="sm"
                    />

                    <Input
                      type="datetime-local"
                      label="Expiry Date (Optional)"
                      value={alertForm.expiresAt}
                      onValueChange={(v) => setAlertForm({ ...alertForm, expiresAt: v })}
                      size="sm"
                      description="Leave empty for no expiration"
                    />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        color="warning"
                        onPress={handleCreateAlert}
                        isLoading={isCreatingAlert}
                        startContent={!isCreatingAlert && <Icon icon="mdi:flag" width={18} />}
                        className="flex-1"
                      >
                        Create Alert
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => {
                          setShowAlertForm(false);
                          setAlertForm({ severity: 'info', message: '', expiresAt: '' });
                          setError('');
                        }}
                        isDisabled={isCreatingAlert}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Existing Alerts List */}
                {person.alerts && person.alerts.length > 0 ? (
                  <div className="space-y-2">
                    {person.alerts
                      .filter((alert) => !alert.dismissed)
                      .map((alert) => {
                        const isExpired = alert.expiresAt && new Date(alert.expiresAt) < new Date();
                        const severityColors = {
                          critical: 'border-danger-200 bg-danger-50',
                          warning: 'border-warning-200 bg-warning-50',
                          info: 'border-primary-200 bg-primary-50',
                        };
                        const severityTextColors = {
                          critical: 'text-danger-700',
                          warning: 'text-warning-700',
                          info: 'text-primary-700',
                        };

                        return (
                          <div
                            key={alert.id}
                            className={`rounded-lg border p-3 ${severityColors[alert.severity]} ${
                              isExpired ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <Icon
                                  icon={
                                    alert.severity === 'critical'
                                      ? 'mdi:alert-circle'
                                      : alert.severity === 'warning'
                                      ? 'mdi:alert'
                                      : 'mdi:information'
                                  }
                                  className={severityTextColors[alert.severity]}
                                  width={20}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color={
                                        alert.severity === 'critical'
                                          ? 'danger'
                                          : alert.severity === 'warning'
                                          ? 'warning'
                                          : 'primary'
                                      }
                                    >
                                      {alert.severity.toUpperCase()}
                                    </Chip>
                                    {isExpired && (
                                      <span className="text-xs text-default-400">(Expired)</span>
                                    )}
                                  </div>
                                  <p className={`text-sm ${severityTextColors[alert.severity]}`}>
                                    {alert.message}
                                  </p>
                                  <p className="text-xs text-default-500 mt-1">
                                    Created {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                                    {alert.expiresAt && (
                                      <> • Expires {format(alert.expiresAt, 'MMM d, h:mm a')}</>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => handleDismissAlert(alert.id)}
                                aria-label="Dismiss alert"
                              >
                                <Icon icon="mdi:close" width={18} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  !showAlertForm && (
                    <p className="text-sm text-default-400 text-center py-2">No active alerts</p>
                  )
                )}
              </div>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
