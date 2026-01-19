import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Spinner,
  Tooltip,
  Alert,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { TruncatedText } from '@sentinel/ui';
import type {
  VisitTypeEnum,
  VisitTypeWithUsage,
  MemberStatusEnum,
  MemberStatusWithUsage,
  MemberTypeEnum,
  MemberTypeWithUsage,
  BadgeStatusEnum,
  BadgeStatusWithUsage,
} from '@shared/types';

// Available colors in the 500 range to align with app's design system
const AVAILABLE_COLORS = [
  { value: 'blue', label: 'Blue', hex: '#3b82f6' },
  { value: 'purple', label: 'Purple', hex: '#a855f7' },
  { value: 'pink', label: 'Pink', hex: '#ec4899' },
  { value: 'red', label: 'Red', hex: '#ef4444' },
  { value: 'orange', label: 'Orange', hex: '#f97316' },
  { value: 'yellow', label: 'Yellow', hex: '#eab308' },
  { value: 'green', label: 'Green', hex: '#22c55e' },
  { value: 'teal', label: 'Teal', hex: '#14b8a6' },
  { value: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { value: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { value: 'violet', label: 'Violet', hex: '#8b5cf6' },
  { value: 'fuchsia', label: 'Fuchsia', hex: '#d946ef' },
  { value: 'rose', label: 'Rose', hex: '#f43f5e' },
  { value: 'amber', label: 'Amber', hex: '#f59e0b' },
  { value: 'lime', label: 'Lime', hex: '#84cc16' },
  { value: 'emerald', label: 'Emerald', hex: '#10b981' },
  { value: 'sky', label: 'Sky', hex: '#0ea5e9' },
  { value: 'slate', label: 'Slate', hex: '#64748b' },
];

// ============================================================================
// Types
// ============================================================================

type EnumType = 'visit-types' | 'member-statuses' | 'member-types' | 'badge-statuses';

interface EnumListManagerProps {
  enumType: EnumType;
  title: string;
  description?: string;
  showColor?: boolean;
}

/**
 * Get chip variant based on enum type
 */
function getChipVariant(enumType: EnumType): 'solid' | 'flat' | 'faded' | 'dot' {
  switch (enumType) {
    case 'member-statuses':
      return 'faded';
    case 'badge-statuses':
      return 'dot';
    case 'member-types':
      return 'solid';
    case 'visit-types':
    default:
      return 'flat';
  }
}

// Union type for all enum items with usage
type EnumItemWithUsage =
  | VisitTypeWithUsage
  | MemberStatusWithUsage
  | MemberTypeWithUsage
  | BadgeStatusWithUsage;

// Union type for all enum items without usage
type EnumItem =
  | VisitTypeEnum
  | MemberStatusEnum
  | MemberTypeEnum
  | BadgeStatusEnum;

// Form data structure
interface EnumFormData {
  code: string;
  name: string;
  description: string;
  color?: string;
}

// Form validation errors
interface FormErrors {
  code?: string;
  name?: string;
  description?: string;
}

// ============================================================================
// Validation Schema
// ============================================================================

const enumFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code must be at most 50 characters')
    .regex(
      /^[a-z0-9_]+$/,
      'Code must be lowercase alphanumeric with underscores only'
    ),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .transform((val) => val || ''),
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Maps enum type to the response key from the API
 */
function getResponseKey(enumType: EnumType): string {
  switch (enumType) {
    case 'visit-types':
      return 'visitTypes';
    case 'member-statuses':
      return 'memberStatuses';
    case 'member-types':
      return 'memberTypes';
    case 'badge-statuses':
      return 'badgeStatuses';
  }
}

/**
 * Maps enum type to the singular response key for create/update
 */
function getSingularResponseKey(enumType: EnumType): string {
  switch (enumType) {
    case 'visit-types':
      return 'visitType';
    case 'member-statuses':
      return 'memberStatus';
    case 'member-types':
      return 'memberType';
    case 'badge-statuses':
      return 'badgeStatus';
  }
}

/**
 * Validates code input - returns error message or undefined
 */
function validateCodeInput(value: string): string | undefined {
  if (!value) return undefined;
  if (value !== value.toLowerCase()) {
    return 'Code must be lowercase';
  }
  if (!/^[a-z0-9_]*$/.test(value)) {
    return 'Only lowercase letters, numbers, and underscores allowed';
  }
  return undefined;
}

// ============================================================================
// Component
// ============================================================================

export default function EnumListManager({
  enumType,
  title,
  description,
  showColor = false,
}: EnumListManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<EnumItemWithUsage | null>(null);
  const [deleteItem, setDeleteItem] = useState<EnumItemWithUsage | null>(null);
  const queryClient = useQueryClient();

  // Fetch enum items
  const { data, isLoading, error } = useQuery({
    queryKey: ['enums', enumType],
    queryFn: async () => {
      const response = await api.get<Record<string, EnumItemWithUsage[]>>(
        `/enums/${enumType}`
      );
      return response.data;
    },
  });

  const items = data ? data[getResponseKey(enumType)] : [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (input: { code: string; name: string; description?: string }) => {
      const response = await api.post<Record<string, EnumItem>>(
        `/enums/${enumType}`,
        input
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enums', enumType] });
      toast.success(`${title.slice(0, -1)} created successfully`);
      handleCloseModal();
    },
    onError: (err: { response?: { data?: { error?: string | { message?: string } } } }) => {
      const errorData = err.response?.data?.error;
      const message =
        typeof errorData === 'string'
          ? errorData
          : errorData?.message || 'Failed to create item';
      toast.error(message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: { code?: string; name?: string; description?: string };
    }) => {
      const response = await api.put<Record<string, EnumItem>>(
        `/enums/${enumType}/${id}`,
        input
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enums', enumType] });
      toast.success(`${title.slice(0, -1)} updated successfully`);
      handleCloseModal();
    },
    onError: (err: { response?: { data?: { error?: string | { message?: string } } } }) => {
      const errorData = err.response?.data?.error;
      const message =
        typeof errorData === 'string'
          ? errorData
          : errorData?.message || 'Failed to update item';
      toast.error(message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/enums/${enumType}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enums', enumType] });
      toast.success(`${title.slice(0, -1)} deleted successfully`);
      handleCloseDeleteModal();
    },
    onError: (err: { response?: { data?: { error?: string | { message?: string } } } }) => {
      const errorData = err.response?.data?.error;
      const message =
        typeof errorData === 'string'
          ? errorData
          : errorData?.message || 'Failed to delete item';
      toast.error(message);
    },
  });

  const handleAdd = () => {
    setEditItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: EnumItemWithUsage) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item: EnumItemWithUsage) => {
    setDeleteItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteItem(null);
  };

  const handleSave = (formData: EnumFormData) => {
    const input = {
      code: formData.code,
      name: formData.name,
      description: formData.description || undefined,
      color: showColor ? formData.color : undefined,
    };

    if (editItem) {
      updateMutation.mutate({ id: editItem.id, input });
    } else {
      createMutation.mutate(input);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteItem) {
      deleteMutation.mutate(deleteItem.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert color="danger" title="Error loading data">
        Failed to load {title.toLowerCase()}. Please try again.
      </Alert>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-default-500">{description}</p>
          )}
        </div>
        <Tooltip content={`Add a new ${title.toLowerCase().slice(0, -1)}`}>
          <Button
            color="primary"
            onPress={handleAdd}
            startContent={<Icon icon="solar:add-circle-linear" width={18} />}
          >
            Add {title.slice(0, -1)}
          </Button>
        </Tooltip>
      </div>

      <Table aria-label={title}>
        <TableHeader>
          <TableColumn>CODE</TableColumn>
          <TableColumn>NAME</TableColumn>
          {showColor && <TableColumn>COLOR</TableColumn>}
          <TableColumn>DESCRIPTION</TableColumn>
          <TableColumn>USAGE COUNT</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody emptyContent={`No ${title.toLowerCase()}`}>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Tooltip content="Unique identifier code">
                  <Chip
                    size="sm"
                    variant={getChipVariant(enumType)}
                    radius={enumType === 'member-types' ? 'sm' : undefined}
                  >
                    {item.code}
                  </Chip>
                </Tooltip>
              </TableCell>
              <TableCell>{item.name}</TableCell>
              {showColor && (
                <TableCell>
                  <Chip
                    size="sm"
                    variant={getChipVariant(enumType)}
                    style={{
                      backgroundColor: AVAILABLE_COLORS.find(c => c.value === item.color)?.hex || item.color,
                      color: '#ffffff'
                    }}
                  >
                    {item.name}
                  </Chip>
                </TableCell>
              )}
              <TableCell>
                {item.description ? (
                  <TruncatedText
                    content={item.description}
                    className="max-w-xs truncate"
                  />
                ) : (
                  <span className="text-default-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <Tooltip
                  content={
                    item.usageCount > 0
                      ? `Used by ${item.usageCount} record${item.usageCount === 1 ? '' : 's'}`
                      : 'Not currently in use'
                  }
                >
                  <span
                    className={
                      item.usageCount > 0
                        ? 'font-medium'
                        : 'text-default-400'
                    }
                  >
                    {item.usageCount}
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Tooltip content="Edit this item">
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => handleEdit(item)}
                    >
                      Edit
                    </Button>
                  </Tooltip>
                  <Tooltip
                    content={
                      item.usageCount > 0
                        ? 'Cannot delete - item is in use'
                        : 'Delete this item'
                    }
                  >
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      isDisabled={item.usageCount > 0}
                      onPress={() => handleDelete(item)}
                    >
                      Delete
                    </Button>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add/Edit Modal */}
      <EnumFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        editItem={editItem}
        title={title}
        isLoading={createMutation.isPending || updateMutation.isPending}
        showColor={showColor}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        item={deleteItem}
        title={title}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

// ============================================================================
// Form Modal Component
// ============================================================================

interface EnumFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: EnumFormData) => void;
  editItem: EnumItemWithUsage | null;
  title: string;
  isLoading: boolean;
  showColor?: boolean;
}

function EnumFormModal({
  isOpen,
  onClose,
  onSave,
  editItem,
  title,
  isLoading,
  showColor = false,
}: EnumFormModalProps) {
  // Extract enumType from title to determine variant
  const enumType: EnumType = title.toLowerCase().includes('visit') ? 'visit-types'
    : title.toLowerCase().includes('member status') ? 'member-statuses'
    : title.toLowerCase().includes('badge') ? 'badge-statuses'
    : 'member-types';
  const [formData, setFormData] = useState<EnumFormData>({
    code: '',
    name: '',
    description: '',
    color: 'blue',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [codeInputError, setCodeInputError] = useState<string | undefined>();

  // Reset form when modal opens/closes or edit item changes
  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setFormData({
          code: editItem.code,
          name: editItem.name,
          description: editItem.description || '',
          color: editItem.color || 'blue',
        });
      } else {
        setFormData({ code: '', name: '', description: '', color: 'blue' });
      }
      setErrors({});
      setCodeInputError(undefined);
    }
  }, [isOpen, editItem]);

  const handleCodeChange = (value: string) => {
    const inputError = validateCodeInput(value);
    setCodeInputError(inputError);
    setFormData({ ...formData, code: value });
    // Clear validation error if user is typing
    if (errors.code) {
      setErrors({ ...errors, code: undefined });
    }
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    if (errors.name) {
      setErrors({ ...errors, name: undefined });
    }
  };

  const handleDescriptionChange = (value: string) => {
    setFormData({ ...formData, description: value });
    if (errors.description) {
      setErrors({ ...errors, description: undefined });
    }
  };

  const handleSubmit = () => {
    // Validate form data
    const result = enumFormSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    onSave(result.data);
  };

  const singularTitle = title.slice(0, -1);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {editItem ? `Edit ${singularTitle}` : `Add ${singularTitle}`}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Code"
              placeholder="e.g., contractor, active, class_a"
              value={formData.code}
              onValueChange={handleCodeChange}
              isRequired
              maxLength={50}
              isInvalid={!!errors.code || !!codeInputError}
              errorMessage={errors.code || codeInputError}
              description="Lowercase letters, numbers, and underscores only"
            />
            <Input
              label="Name"
              placeholder="Display name"
              value={formData.name}
              onValueChange={handleNameChange}
              isRequired
              maxLength={100}
              isInvalid={!!errors.name}
              errorMessage={errors.name}
            />
            {showColor && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Color <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVAILABLE_COLORS.map((colorOption) => (
                    <button
                      key={colorOption.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: colorOption.value })}
                      className={`
                        h-12 rounded-lg border-2 transition-all
                        ${formData.color === colorOption.value
                          ? 'border-primary scale-105 shadow-md'
                          : 'border-transparent hover:border-default-300'
                        }
                      `}
                      style={{ backgroundColor: colorOption.hex }}
                      title={colorOption.label}
                    >
                      {formData.color === colorOption.value && (
                        <Icon icon="solar:check-circle-bold" className="mx-auto text-white" width={20} />
                      )}
                    </button>
                  ))}
                </div>
                {formData.color && formData.name && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-default-500">Preview:</span>
                    <Chip
                      size="sm"
                      variant={getChipVariant(enumType)}
                      style={{
                        backgroundColor: AVAILABLE_COLORS.find(c => c.value === formData.color)?.hex,
                        color: '#ffffff',
                      }}
                    >
                      {formData.name}
                    </Chip>
                  </div>
                )}
              </div>
            )}
            <Textarea
              label="Description"
              placeholder="Optional description"
              value={formData.description}
              onValueChange={handleDescriptionChange}
              maxLength={500}
              isInvalid={!!errors.description}
              errorMessage={errors.description}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={isLoading}
            isDisabled={!!codeInputError}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ============================================================================
// Delete Confirmation Modal Component
// ============================================================================

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: EnumItemWithUsage | null;
  title: string;
  isLoading: boolean;
}

function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  title,
  isLoading,
}: DeleteConfirmationModalProps) {
  const singularTitle = title.slice(0, -1).toLowerCase();

  // Should not happen since button is disabled when usage > 0, but check anyway
  const hasUsage = item && item.usageCount > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Delete {title.slice(0, -1)}</ModalHeader>
        <ModalBody>
          {hasUsage ? (
            <Alert color="danger" title="Cannot delete">
              This {singularTitle} is currently in use by {item.usageCount}{' '}
              record{item.usageCount === 1 ? '' : 's'} and cannot be deleted.
              Remove all references before deleting.
            </Alert>
          ) : (
            <>
              <p>
                Are you sure you want to delete the {singularTitle}{' '}
                <strong>{item?.name}</strong> ({item?.code})?
              </p>
              <p className="mt-2 text-sm text-default-500">
                This action cannot be undone.
              </p>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          {!hasUsage && (
            <Button
              color="danger"
              onPress={onConfirm}
              isLoading={isLoading}
            >
              Delete
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
