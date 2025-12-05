import { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
  CheckboxGroup,
  Checkbox,
  Tooltip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

type ClearableTable = 'members' | 'checkins' | 'visitors' | 'badges' | 'events' | 'event_attendees' | 'event_checkins';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  severity?: 'warning' | 'danger';
  requireTyping?: string;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  severity = 'danger',
  requireTyping,
}: ConfirmationModalProps) {
  const [typedText, setTypedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      setTypedText('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTypedText('');
    onClose();
  };

  const isValid = requireTyping ? typedText === requireTyping : true;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <p className="mb-4">{message}</p>
          {requireTyping && (
            <Input
              label={`Type "${requireTyping}" to confirm`}
              value={typedText}
              onValueChange={setTypedText}
              placeholder={requireTyping}
              autoFocus
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancel
          </Button>
          <Button
            color={severity}
            onPress={handleConfirm}
            isDisabled={!isValid}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const ALL_TABLES: ClearableTable[] = ['members', 'checkins', 'visitors', 'badges', 'events', 'event_attendees', 'event_checkins'];

const TABLE_LABELS: Record<ClearableTable, string> = {
  members: 'Members',
  checkins: 'Check-ins',
  visitors: 'Visitors',
  badges: 'Badges',
  events: 'Events',
  event_attendees: 'Event Attendees',
  event_checkins: 'Event Check-ins',
};

const TABLE_DESCRIPTIONS: Record<ClearableTable, string> = {
  members: 'All unit member records',
  checkins: 'All daily check-in/out records',
  visitors: 'All visitor sign-in records',
  badges: 'All RFID badge registrations',
  events: 'All scheduled events',
  event_attendees: 'All event attendee registrations',
  event_checkins: 'All event check-in records',
};

export default function DevToolsSection() {
  const [selectedTables, setSelectedTables] = useState<ClearableTable[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    requireTyping?: string;
    severity: 'warning' | 'danger';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    severity: 'warning',
    onConfirm: async () => {},
  });

  const handleClearAll = async () => {
    try {
      const response = await api.post<{ cleared: string[] }>('/dev-tools/clear-all');
      toast.success(`Cleared ${response.data.cleared.length} tables: ${response.data.cleared.join(', ')}`);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      const errorMessage = err.response?.data?.error;
      if (!errorMessage) {
        throw new Error('Failed to clear data - no error message received');
      }
      toast.error(errorMessage);
    }
  };

  const handleClearSelectedTables = async () => {
    const results: string[] = [];
    const errors: string[] = [];

    for (const table of selectedTables) {
      try {
        const response = await api.post<{ cleared: string; count: number }>('/dev-tools/clear-table', {
          table,
        });
        results.push(`${response.data.cleared}: ${response.data.count}`);
      } catch (error) {
        const err = error as { response?: { data?: { error?: string } } };
        const errorMessage = err.response?.data?.error;
        errors.push(`${table}: ${errorMessage ? errorMessage : 'Failed to clear table'}`);
      }
    }

    if (results.length > 0) {
      toast.success(`Cleared: ${results.join(', ')}`);
    }
    if (errors.length > 0) {
      toast.error(`Errors: ${errors.join(', ')}`);
    }

    setSelectedTables([]);
  };

  const handleReset = async () => {
    try {
      await api.post<{ success: boolean }>('/dev-tools/reset');
      toast.success('Database reset complete. Please refresh the page.');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      const errorMessage = err.response?.data?.error;
      if (!errorMessage) {
        throw new Error('Failed to reset database - no error message received');
      }
      toast.error(errorMessage);
    }
  };

  const openConfirmModal = (
    title: string,
    message: string,
    confirmText: string,
    requireTyping: string | undefined,
    severity: 'warning' | 'danger',
    onConfirm: () => Promise<void>
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      requireTyping,
      severity,
      onConfirm,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Developer Tools</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="space-y-6">
            {/* Clear All Data - Warning level (keeps divisions) */}
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
              <div className="flex items-start gap-3 mb-3">
                <Icon icon="solar:trash-bin-trash-bold" className="text-warning-600 mt-0.5" width={24} />
                <div>
                  <h4 className="text-md font-semibold text-warning-700">Clear All Data</h4>
                  <p className="text-sm text-warning-600">
                    Clears all operational data (members, checkins, visitors, badges, events). Keeps admin users and divisions.
                  </p>
                </div>
              </div>
              <Tooltip content="Requires typing 'DELETE' to confirm. Admin users and divisions are preserved.">
                <Button
                  color="warning"
                  variant="solid"
                  startContent={<Icon icon="solar:trash-bin-minimalistic-linear" width={18} />}
                  onPress={() =>
                    openConfirmModal(
                      'Clear All Data',
                      'This will permanently delete all members, checkins, visitors, badges, and events. Admin users and divisions will be kept. This action cannot be undone.',
                      'Clear All Data',
                      'DELETE',
                      'warning',
                      handleClearAll
                    )
                  }
                >
                  Clear All Data
                </Button>
              </Tooltip>
            </div>

            {/* Clear by Table - Warning level */}
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
              <div className="flex items-start gap-3 mb-3">
                <Icon icon="solar:database-bold" className="text-warning-600 mt-0.5" width={24} />
                <div>
                  <h4 className="text-md font-semibold text-warning-700">Clear Individual Tables</h4>
                  <p className="text-sm text-warning-600">
                    Select tables to clear. Use caution as this may leave orphaned records.
                  </p>
                </div>
              </div>
              <CheckboxGroup
                value={selectedTables}
                onValueChange={(values) => setSelectedTables(values as ClearableTable[])}
                orientation="horizontal"
                classNames={{
                  wrapper: 'gap-4 flex-wrap',
                }}
              >
                {ALL_TABLES.map((table) => (
                  <Tooltip key={table} content={TABLE_DESCRIPTIONS[table]}>
                    <div className="inline-block">
                      <Checkbox value={table} color="warning">
                        {TABLE_LABELS[table]}
                      </Checkbox>
                    </div>
                  </Tooltip>
                ))}
              </CheckboxGroup>
              <div className="mt-4 flex gap-2">
                <Tooltip content={selectedTables.length === 0 ? 'Select at least one table to clear' : `Clear ${selectedTables.length} selected table(s)`}>
                  <Button
                    color="warning"
                    variant="solid"
                    isDisabled={selectedTables.length === 0}
                    startContent={<Icon icon="solar:trash-bin-minimalistic-linear" width={18} />}
                    onPress={() =>
                      openConfirmModal(
                        'Clear Selected Tables',
                        `This will permanently delete all records from: ${selectedTables.map(t => TABLE_LABELS[t]).join(', ')}. This action cannot be undone.`,
                        'Clear Selected',
                        'DELETE',
                        'warning',
                        handleClearSelectedTables
                      )
                    }
                  >
                    Clear Selected ({selectedTables.length})
                  </Button>
                </Tooltip>
                {selectedTables.length > 0 && (
                  <Tooltip content="Deselect all tables">
                    <Button
                      variant="light"
                      onPress={() => setSelectedTables([])}
                    >
                      Clear Selection
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Reset to Fresh - Danger level (nuclear option) */}
            <div className="rounded-lg border border-danger-200 bg-danger-50 p-4">
              <div className="flex items-start gap-3 mb-3">
                <Icon icon="solar:danger-triangle-bold" className="text-danger mt-0.5" width={24} />
                <div>
                  <h4 className="text-md font-semibold text-danger">Reset to Fresh State</h4>
                  <p className="text-sm text-danger-600">
                    <strong>DANGER:</strong> Deletes ALL data including divisions. Only admin users are kept for login access. This completely resets the database to a fresh state.
                  </p>
                </div>
              </div>
              <Tooltip color="danger" content="Requires typing 'RESET EVERYTHING' to confirm. Only use for development!">
                <Button
                  color="danger"
                  startContent={<Icon icon="solar:restart-bold" width={18} />}
                  onPress={() =>
                    openConfirmModal(
                      'Reset to Fresh State',
                      'This will DELETE EVERYTHING including divisions. Only admin users will remain. This is irreversible and should only be used for development.',
                      'Reset Everything',
                      'RESET EVERYTHING',
                      'danger',
                      handleReset
                    )
                  }
                >
                  Reset to Fresh State
                </Button>
              </Tooltip>
            </div>
          </div>
        </CardBody>
      </Card>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        requireTyping={confirmModal.requireTyping}
        severity={confirmModal.severity}
      />
    </div>
  );
}
