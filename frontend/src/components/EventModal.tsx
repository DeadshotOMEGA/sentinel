import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  TextArea,
  Button,
  Switch,
} from './ui/heroui-polyfills';
import { api } from '../lib/api';
import type { Event } from '@shared/types';

interface EventModalProps {
  isOpen: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onSave: () => void;
  onClose?: () => void;
  event?: Event | null;
}

interface EventFormData {
  name: string;
  code: string;
  description: string;
  startDate: string;
  endDate: string;
  autoExpireBadges: boolean;
}

export default function EventModal({ isOpen, onOpenChange, onSave, event }: EventModalProps) {
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    code: '',
    description: '',
    startDate: '',
    endDate: '',
    autoExpireBadges: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeManual, setCodeManual] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name,
        code: event.code,
        description: event.description || '',
        startDate: new Date(event.startDate).toISOString().split('T')[0],
        endDate: new Date(event.endDate).toISOString().split('T')[0],
        autoExpireBadges: event.autoExpireBadges,
      });
      setCodeManual(true);
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        startDate: '',
        endDate: '',
        autoExpireBadges: true,
      });
      setCodeManual(false);
    }
    setError('');
  }, [event, isOpen]);

  const generateCode = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length === 0) {
      return '';
    }
    const initials = words
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${initials}${randomNum}`;
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      if (!codeManual && !event) {
        return { ...prev, name, code: generateCode(name) };
      }
      return { ...prev, name };
    });
  };

  const handleCodeChange = (code: string) => {
    setCodeManual(true);
    setFormData({ ...formData, code });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Event name is required');
      return false;
    }
    if (!formData.code.trim()) {
      setError('Event code is required');
      return false;
    }
    if (!formData.startDate) {
      setError('Start date is required');
      return false;
    }
    if (!formData.endDate) {
      setError('End date is required');
      return false;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date must be after start date');
      return false;
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
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        autoExpireBadges: formData.autoExpireBadges,
      };

      if (event) {
        await api.put(`/events/${event.id}`, payload);
      } else {
        await api.post('/events', payload);
      }

      onSave();
      onOpenChange?.(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to save event - no error message received');
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
      <ModalContent role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
        {(onClose) => (
          <>
            <ModalHeader id="event-modal-title">{event ? 'Edit Event' : 'Create Event'}</ModalHeader>
            <ModalBody>
              {error && (
                <div id="event-modal-error" className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger" role="alert">
                  {error}
                </div>
              )}
              <div className="space-y-4" aria-describedby={error ? 'event-modal-error' : undefined}>
                <div>
                  <Input
                    label="Event Name"
                    placeholder="e.g., Annual Training Exercise"
                    value={formData.name}
                    onValueChange={handleNameChange}
                    isRequired
                    autoFocus
                    aria-invalid={error ? 'true' : 'false'}
                  />
                </div>
                <div>
                  <Input
                    label="Event Code"
                    placeholder="e.g., ATE001"
                    value={formData.code}
                    onValueChange={handleCodeChange}
                    isRequired
                    aria-describedby="event-code-hint"
                    aria-invalid={error ? 'true' : 'false'}
                  />
                  <span id="event-code-hint" className="mt-1 block text-xs text-gray-600">
                    {!codeManual && !event
                      ? 'Auto-generated from name (edit to customize)'
                      : 'Unique identifier for the event'}
                  </span>
                </div>
                <div>
                  <TextArea
                    label="Description"
                    placeholder="Optional event description"
                    value={formData.description}
                    onValueChange={(v) => setFormData({ ...formData, description: v })}
                    minRows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start Date"
                    type="date"
                    value={formData.startDate}
                    onValueChange={(v) => setFormData({ ...formData, startDate: v })}
                    isRequired
                    aria-invalid={error ? 'true' : 'false'}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    value={formData.endDate}
                    onValueChange={(v) => setFormData({ ...formData, endDate: v })}
                    isRequired
                    aria-invalid={error ? 'true' : 'false'}
                  />
                </div>
                <Switch
                  isSelected={formData.autoExpireBadges}
                  onValueChange={(v) => setFormData({ ...formData, autoExpireBadges: v })}
                >
                  <div>
                    <p className="text-sm font-medium">Auto-expire badges</p>
                    <p className="text-xs text-gray-600">
                      Automatically deactivate attendee badges after event end date
                    </p>
                  </div>
                </Switch>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
                {event ? 'Save Changes' : 'Create Event'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
