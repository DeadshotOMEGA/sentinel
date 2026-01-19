import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Checkbox,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';
import type { AdminUser } from '../../../../shared/types';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onSuccess: () => void;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function validatePassword(password: string): PasswordValidation {
  return {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

function isPasswordValid(validation: PasswordValidation): boolean {
  return (
    validation.minLength &&
    validation.hasUppercase &&
    validation.hasLowercase &&
    validation.hasNumber &&
    validation.hasSpecial
  );
}

export default function ResetPasswordModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordValidation = validatePassword(password);
  const canSubmit = isPasswordValid(passwordValidation) && confirmationChecked;

  useEffect(() => {
    setPassword('');
    setConfirmationChecked(false);
    setError('');
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!user) {
      return;
    }

    if (!canSubmit) {
      setError('Please complete all requirements before submitting');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.post(`/admin-users/${user.id}/reset-password`, {
        newPassword: password,
      });

      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to reset password - no error message received');
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>Reset Password</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="rounded-lg bg-warning-50 p-3">
              <p className="text-sm text-warning-700">
                Resetting password for:{' '}
                <span className="font-semibold">
                  {user.displayName}
                </span>{' '}
                ({user.username})
              </p>
            </div>

            <Input
              type="password"
              label="New Password"
              placeholder="Enter new password"
              value={password}
              onValueChange={setPassword}
              isRequired
              autoFocus
            />

            <div className="rounded-lg bg-default-100 p-3">
              <p className="mb-2 text-sm font-medium text-default-700">
                Password Requirements
              </p>
              <div className="space-y-1">
                <PasswordRequirement
                  met={passwordValidation.minLength}
                  label="At least 12 characters"
                />
                <PasswordRequirement
                  met={passwordValidation.hasUppercase}
                  label="Contains uppercase letter"
                />
                <PasswordRequirement
                  met={passwordValidation.hasLowercase}
                  label="Contains lowercase letter"
                />
                <PasswordRequirement
                  met={passwordValidation.hasNumber}
                  label="Contains number"
                />
                <PasswordRequirement
                  met={passwordValidation.hasSpecial}
                  label="Contains special character"
                />
              </div>
            </div>

            <Checkbox
              isSelected={confirmationChecked}
              onValueChange={setConfirmationChecked}
            >
              <span className="text-sm">
                I understand this will immediately change the user&apos;s password
              </span>
            </Checkbox>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="danger"
            onPress={handleSubmit}
            isLoading={isLoading}
            isDisabled={!canSubmit}
          >
            Reset Password
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon
        icon={met ? 'mdi:check-circle' : 'mdi:close-circle'}
        className={met ? 'text-success' : 'text-danger'}
        width={16}
        height={16}
      />
      <span className={`text-sm ${met ? 'text-success' : 'text-default-500'}`}>
        {label}
      </span>
    </div>
  );
}
