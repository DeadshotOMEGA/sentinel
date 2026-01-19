import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';
import type { AdminUser, AdminRole } from '../../../../shared/types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user: AdminUser | null;
  currentUserRole: 'quartermaster' | 'admin' | 'developer';
}

interface UserFormData {
  username: string;
  displayName: string;
  role: AdminRole;
  password: string;
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

const ROLE_OPTIONS: Array<{ value: AdminRole; label: string }> = [
  { value: 'quartermaster', label: 'Quartermaster' },
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
];

export default function UserModal({
  isOpen,
  onClose,
  onSave,
  user,
  currentUserRole,
}: UserModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    displayName: '',
    role: 'admin',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = user !== null;
  const passwordValidation = validatePassword(formData.password);

  // Filter role options based on current user role
  const availableRoles = ROLE_OPTIONS.filter((option) => {
    if (currentUserRole === 'admin') {
      // Admins cannot create developers (privilege escalation prevention)
      return option.value !== 'developer';
    }
    return true;
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        password: '',
      });
    } else {
      setFormData({
        username: '',
        displayName: '',
        role: 'admin',
        password: '',
      });
    }
    setError('');
  }, [user, isOpen]);

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (formData.username.trim().length > 100) {
      setError('Username must be at most 100 characters');
      return false;
    }
    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return false;
    }
    if (!isEditMode && !isPasswordValid(passwordValidation)) {
      setError('Password does not meet requirements');
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
      if (isEditMode) {
        await api.put(`/admin-users/${user.id}`, {
          displayName: formData.displayName.trim(),
          role: formData.role,
        });
      } else {
        await api.post('/admin-users', {
          username: formData.username.trim(),
          displayName: formData.displayName.trim(),
          role: formData.role,
          password: formData.password,
        });
      }

      onSave();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; details?: string } } } };
      const message = error.response?.data?.error?.message;
      const details = error.response?.data?.error?.details;
      if (!message) {
        throw new Error('Failed to save user - no error message received');
      }
      // Show detailed error if available, otherwise show generic message
      setError(details ? `${message}: ${details}` : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>{isEditMode ? 'Edit User' : 'Create User'}</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <Input
              label="Username"
              placeholder="Enter username (min 3 characters)"
              value={formData.username}
              onValueChange={(v) => setFormData({ ...formData, username: v })}
              isRequired
              isDisabled={isEditMode}
              autoFocus={!isEditMode}
              description={!isEditMode ? "3-100 characters" : undefined}
            />
            <Input
              label="Display Name"
              placeholder="Enter display name"
              value={formData.displayName}
              onValueChange={(v) => setFormData({ ...formData, displayName: v })}
              isRequired
              autoFocus={isEditMode}
            />
            <Select
              label="Role"
              selectedKeys={[formData.role]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as AdminRole;
                if (selected) {
                  setFormData({ ...formData, role: selected });
                }
              }}
              isRequired
            >
              {availableRoles.map((option) => (
                <SelectItem key={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>

            {!isEditMode && (
              <>
                <Input
                  type="password"
                  label="Password"
                  placeholder="Enter password"
                  value={formData.password}
                  onValueChange={(v) => setFormData({ ...formData, password: v })}
                  isRequired
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
              </>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
            {isEditMode ? 'Save Changes' : 'Create User'}
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
