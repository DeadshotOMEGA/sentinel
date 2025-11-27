import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Select,
  SelectItem,
} from './ui/heroui-polyfills';
import { api } from '../lib/api';
import type { Event } from '@shared/types';

interface AddAttendeeModalProps {
  isOpen: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onSuccess: () => void;
  onClose?: () => void;
  eventId: string;
  event: Event;
}

interface AttendeeFormData {
  name: string;
  rank: string;
  organization: string;
  role: string;
  accessStart: string;
  accessEnd: string;
}

const roles = [
  { key: 'participant', label: 'Participant' },
  { key: 'instructor', label: 'Instructor' },
  { key: 'staff', label: 'Staff' },
  { key: 'volunteer', label: 'Volunteer' },
];

export default function AddAttendeeModal({
  isOpen,
  onOpenChange,
  onSuccess,
  eventId,
  event,
}: AddAttendeeModalProps) {
  const [formData, setFormData] = useState<AttendeeFormData>({
    name: '',
    rank: '',
    organization: '',
    role: 'participant',
    accessStart: '',
    accessEnd: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && event) {
      setFormData({
        name: '',
        rank: '',
        organization: '',
        role: 'participant',
        accessStart: new Date(event.startDate).toISOString().split('T')[0],
        accessEnd: new Date(event.endDate).toISOString().split('T')[0],
      });
      setError('');
    }
  }, [isOpen, event]);

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.organization.trim()) {
      setError('Organization is required');
      return false;
    }
    if (!formData.role) {
      setError('Role is required');
      return false;
    }
    if (formData.accessStart && formData.accessEnd) {
      if (new Date(formData.accessEnd) < new Date(formData.accessStart)) {
        setError('Access end date must be after start date');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        rank: formData.rank.trim() || null,
        organization: formData.organization.trim(),
        role: formData.role,
        accessStart: formData.accessStart
          ? new Date(formData.accessStart).toISOString()
          : null,
        accessEnd: formData.accessEnd ? new Date(formData.accessEnd).toISOString() : null,
      };

      await api.post(`/events/${eventId}/attendees`, payload);
      onSuccess();
      onOpenChange?.(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to add attendee - no error message received');
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Add Attendee</ModalHeader>
            <ModalBody>
              {error && (
                <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <Input
                  label="Name"
                  placeholder="Full name"
                  value={formData.name}
                  onValueChange={(v) => setFormData({ ...formData, name: v })}
                  isRequired
                  autoFocus
                />
                <Input
                  label="Rank"
                  placeholder="e.g., Lt(N), Cdr, civilian (optional)"
                  value={formData.rank}
                  onValueChange={(v) => setFormData({ ...formData, rank: v })}
                />
                <Input
                  label="Organization"
                  placeholder="e.g., HMCS Chippawa, 38 Brigade"
                  value={formData.organization}
                  onValueChange={(v) => setFormData({ ...formData, organization: v })}
                  isRequired
                />
                <Select
                  label="Role"
                  selectedKeys={[formData.role]}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string;
                    setFormData({ ...formData, role: key });
                  }}
                  isRequired
                >
                  {roles.map((role) => (
                    <SelectItem key={role.key}>{role.label}</SelectItem>
                  ))}
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Access Start"
                      type="date"
                      value={formData.accessStart}
                      onValueChange={(v) => setFormData({ ...formData, accessStart: v })}
                    />
                    <span className="mt-1 block text-xs text-gray-600">Defaults to event start</span>
                  </div>
                  <div>
                    <Input
                      label="Access End"
                      type="date"
                      value={formData.accessEnd}
                      onValueChange={(v) => setFormData({ ...formData, accessEnd: v })}
                    />
                    <span className="mt-1 block text-xs text-gray-600">Defaults to event end</span>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
                Add Attendee
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
