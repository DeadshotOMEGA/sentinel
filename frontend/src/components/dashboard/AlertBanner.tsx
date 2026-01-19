import { useState, useCallback } from 'react';
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import type { SecurityAlert, AlertSeverity } from '../../hooks/useSecurityAlerts';

interface AlertBannerProps {
  alerts: SecurityAlert[];
  onAcknowledge: (alertId: string, note?: string) => Promise<void>;
}

interface AcknowledgeModalState {
  isOpen: boolean;
  alert: SecurityAlert | null;
}

/**
 * Get styling configuration based on alert severity
 */
function getSeverityConfig(severity: AlertSeverity) {
  switch (severity) {
    case 'critical':
      return {
        bgColor: 'bg-danger-500',
        textColor: 'text-white',
        iconColor: 'text-white',
        icon: 'solar:danger-triangle-bold',
        pulseClass: 'animate-pulse-critical',
        label: 'CRITICAL',
      };
    case 'warning':
      return {
        bgColor: 'bg-warning-500',
        textColor: 'text-black',
        iconColor: 'text-black',
        icon: 'solar:shield-warning-bold',
        pulseClass: 'animate-pulse-warning',
        label: 'WARNING',
      };
    case 'info':
    default:
      return {
        bgColor: 'bg-primary-500',
        textColor: 'text-white',
        iconColor: 'text-white',
        icon: 'solar:info-circle-bold',
        pulseClass: '',
        label: 'INFO',
      };
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AlertBanner({ alerts, onAcknowledge }: AlertBannerProps) {
  const [modalState, setModalState] = useState<AcknowledgeModalState>({
    isOpen: false,
    alert: null,
  });
  const [adminName, setAdminName] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleOpenModal = useCallback((alert: SecurityAlert) => {
    setModalState({ isOpen: true, alert });
    setAdminName('');
    setNote('');
    setSubmitError('');
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ isOpen: false, alert: null });
    setAdminName('');
    setNote('');
    setSubmitError('');
  }, []);

  const handleAcknowledge = useCallback(async () => {
    if (!modalState.alert) return;
    if (!adminName.trim()) {
      setSubmitError('Please enter your name to acknowledge this alert.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const acknowledgmentNote = `Acknowledged by ${adminName.trim()}${note.trim() ? `: ${note.trim()}` : ''}`;
      await onAcknowledge(modalState.alert.id, acknowledgmentNote);
      handleCloseModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to acknowledge alert';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [modalState.alert, adminName, note, onAcknowledge, handleCloseModal]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Alert Banners */}
      <div className="flex flex-col gap-2">
        {alerts.map((alert) => {
          const config = getSeverityConfig(alert.severity);

          return (
            <div
              key={alert.id}
              className={`${config.bgColor} ${config.textColor} ${config.pulseClass} rounded-lg px-4 py-3 shadow-lg`}
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Alert Content */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Icon */}
                  <Icon
                    icon={config.icon}
                    width={28}
                    className={`${config.iconColor} flex-shrink-0`}
                  />

                  {/* Alert Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs uppercase tracking-wider">
                        {config.label}
                      </span>
                      <span className="text-sm opacity-80">|</span>
                      <span className="font-semibold">{alert.message}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm opacity-90">
                      {alert.badgeSerial && (
                        <span className="flex items-center gap-1">
                          <Icon icon="solar:card-bold" width={16} />
                          Badge: {alert.badgeSerial}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Icon icon="solar:map-point-bold" width={16} />
                        {alert.kioskName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="solar:clock-circle-bold" width={16} />
                        {formatTimestamp(alert.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acknowledge Button */}
                <Button
                  size="sm"
                  variant="flat"
                  className={`${config.textColor} bg-white/20 hover:bg-white/30 flex-shrink-0`}
                  onPress={() => handleOpenModal(alert)}
                  startContent={<Icon icon="solar:check-circle-bold" width={18} />}
                >
                  Acknowledge
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Acknowledge Modal */}
      <Modal isOpen={modalState.isOpen} onClose={handleCloseModal} size="md">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Icon icon="solar:check-circle-linear" width={24} className="text-primary" />
              <h3 className="text-lg font-semibold">Acknowledge Security Alert</h3>
            </div>
          </ModalHeader>

          <ModalBody>
            {submitError && (
              <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
                {submitError}
              </div>
            )}

            {modalState.alert && (
              <div className="mb-4 rounded-lg border border-default-200 bg-default-50 p-3">
                <p className="font-medium">{modalState.alert.message}</p>
                <div className="mt-2 text-sm text-default-600">
                  {modalState.alert.badgeSerial && (
                    <p>Badge Serial: {modalState.alert.badgeSerial}</p>
                  )}
                  <p>Kiosk: {modalState.alert.kioskName}</p>
                  <p>Time: {formatTimestamp(modalState.alert.createdAt)}</p>
                </div>
              </div>
            )}

            <Input
              label="Your Name"
              placeholder="Enter your name..."
              value={adminName}
              onValueChange={setAdminName}
              isRequired
              description="Required to acknowledge this alert"
              autoFocus
            />

            <Textarea
              label="Note (Optional)"
              placeholder="Add any notes about this alert..."
              value={note}
              onValueChange={setNote}
              className="mt-4"
              minRows={2}
              maxRows={4}
            />
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onPress={handleCloseModal} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleAcknowledge}
              isLoading={isSubmitting}
              isDisabled={!adminName.trim()}
              startContent={!isSubmitting && <Icon icon="solar:check-circle-linear" width={20} />}
            >
              Acknowledge Alert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
