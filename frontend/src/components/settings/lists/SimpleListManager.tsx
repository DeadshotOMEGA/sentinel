import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  Spinner,
  Chip,
  Tooltip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import type {
  ListItem,
  ListItemWithUsage,
  ListType,
  CreateListItemInput,
  UpdateListItemInput,
} from '@shared/types';

interface SimpleListManagerProps {
  listType: ListType;
  title: string;
  description?: string;
  allowReorder?: boolean;
}

interface ListItemsResponse {
  items: ListItemWithUsage[];
}

interface ListItemResponse {
  item: ListItem;
}

interface UsageResponse {
  usageCount: number;
}

interface ListItemFormData {
  code: string;
  name: string;
  description?: string;
}

interface FormErrors {
  code?: string;
  name?: string;
  description?: string;
}

/**
 * Generate a code from a name: lowercase, spaces/hyphens to underscores
 */
function generateCodeFromName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_').replace(/'/g, '');
}

// Validation function matching backend constraints
function validateFormData(formData: ListItemFormData): FormErrors {
  const errors: FormErrors = {};

  if (!formData.code || formData.code.trim().length === 0) {
    errors.code = 'Code is required';
  } else if (formData.code.length > 50) {
    errors.code = 'Code must be 50 characters or less';
  }

  if (!formData.name || formData.name.trim().length === 0) {
    errors.name = 'Name is required';
  } else if (formData.name.length > 200) {
    errors.name = 'Name must be 200 characters or less';
  }

  if (formData.description && formData.description.length > 500) {
    errors.description = 'Description must be 500 characters or less';
  }

  return errors;
}

export default function SimpleListManager({
  listType,
  title,
  description,
  allowReorder = false,
}: SimpleListManagerProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ListItemWithUsage | null>(null);
  const [deleteItem, setDeleteItem] = useState<ListItemWithUsage | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [localItems, setLocalItems] = useState<ListItemWithUsage[]>([]);

  // Fetch list items
  const { data, isLoading, error } = useQuery({
    queryKey: ['lists', listType],
    queryFn: async () => {
      const response = await api.get<ListItemsResponse>(`/lists/${listType}`);
      return response.data;
    },
  });

  // Sync local items with query data
  useEffect(() => {
    if (data?.items) {
      setLocalItems(data.items);
    }
  }, [data?.items]);

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      await api.put(`/lists/${listType}/reorder`, { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', listType] });
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = err.response?.data?.error?.message || 'Failed to reorder items';
      toast.error(message);
      // Revert to original order on error
      if (data?.items) {
        setLocalItems(data.items);
      }
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateListItemInput) => {
      const response = await api.post<ListItemResponse>(`/lists/${listType}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', listType] });
      toast.success('Item added successfully');
      handleCloseModal();
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = err.response?.data?.error?.message || 'Failed to add item';
      toast.error(message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateListItemInput }) => {
      const response = await api.put<ListItemResponse>(`/lists/${listType}/${id}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', listType] });
      toast.success('Item updated successfully');
      handleCloseModal();
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = err.response?.data?.error?.message || 'Failed to update item';
      toast.error(message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/lists/${listType}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', listType] });
      toast.success('Item deleted successfully');
      handleCloseDeleteModal();
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = err.response?.data?.error?.message || 'Failed to delete item';
      toast.error(message);
    },
  });

  const handleAdd = () => {
    setEditItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ListItemWithUsage) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: ListItemWithUsage) => {
    setDeleteItem(item);
    setUsageCount(null);
    setIsDeleteModalOpen(true);

    // Fetch usage count
    setIsLoadingUsage(true);
    try {
      const response = await api.get<UsageResponse>(`/lists/${listType}/${item.id}/usage`);
      setUsageCount(response.data.usageCount);
    } catch {
      // Fallback to the usage count from the list data
      setUsageCount(item.usageCount);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteItem(null);
    setUsageCount(null);
  };

  const handleConfirmDelete = () => {
    if (deleteItem) {
      deleteMutation.mutate(deleteItem.id);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...localItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setLocalItems(newItems);
    reorderMutation.mutate(newItems.map((item) => item.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === localItems.length - 1) return;
    const newItems = [...localItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setLocalItems(newItems);
    reorderMutation.mutate(newItems.map((item) => item.id));
  };

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <div className="rounded-lg bg-danger-50 p-4 text-danger">
            <p className="font-semibold">Failed to load {title.toLowerCase()}</p>
            <p className="mt-1 text-sm">Please try refreshing the page.</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const items = localItems;

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-default-500 mt-1">{description}</p>
            )}
          </div>
          <Tooltip content={`Add a new ${title.toLowerCase().replace(/s$/, '')}`}>
            <Button
              color="primary"
              onPress={handleAdd}
              startContent={<Icon icon="solar:add-circle-linear" width={18} />}
            >
              Add
            </Button>
          </Tooltip>
        </CardHeader>
        <CardBody>
          {allowReorder ? (
            <ReorderableTable
              items={items}
              title={title}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isReordering={reorderMutation.isPending}
            />
          ) : (
            <Table aria-label={`${title} table`}>
              <TableHeader>
                <TableColumn>NAME</TableColumn>
                <TableColumn width={100}>USAGE COUNT</TableColumn>
                <TableColumn width={120} align="end">ACTIONS</TableColumn>
              </TableHeader>
              <TableBody emptyContent={`No ${title.toLowerCase()} defined`}>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        {item.isSystem && (
                          <Tooltip content="System item (cannot be deleted)">
                            <Chip size="sm" variant="flat" color="warning">
                              System
                            </Chip>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tooltip content="Number of records using this item">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={item.usageCount > 0 ? 'primary' : 'default'}
                        >
                          {item.usageCount}
                        </Chip>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Tooltip content="Edit this item">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => handleEdit(item)}
                            aria-label="Edit"
                          >
                            <Icon icon="solar:pen-linear" width={18} />
                          </Button>
                        </Tooltip>
                        <Tooltip
                          content={
                            item.isSystem
                              ? 'System items cannot be deleted'
                              : 'Delete this item'
                          }
                        >
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            isDisabled={item.isSystem}
                            onPress={() => handleDelete(item)}
                            aria-label="Delete"
                          >
                            <Icon icon="solar:trash-bin-trash-linear" width={18} />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      <ListItemModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        item={editItem}
        onSave={(formData) => {
          if (editItem) {
            updateMutation.mutate({ id: editItem.id, input: formData });
          } else {
            createMutation.mutate(formData);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
        title={title}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal}>
        <ModalContent>
          <ModalHeader>Delete Item</ModalHeader>
          <ModalBody>
            {isLoadingUsage ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Checking usage...</span>
              </div>
            ) : usageCount !== null && usageCount > 0 ? (
              <div className="rounded-lg bg-danger-50 p-4 border border-danger-200">
                <p className="font-semibold text-danger">Cannot delete</p>
                <p className="mt-2 text-sm text-danger-700">
                  Used by <strong>{usageCount}</strong> record{usageCount !== 1 ? 's' : ''}.
                </p>
              </div>
            ) : (
              <>
                <p>
                  Are you sure you want to delete{' '}
                  <strong>&apos;{deleteItem?.name}&apos;</strong>?
                </p>
                <p className="mt-2 text-sm text-default-500">
                  This action cannot be undone.
                </p>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={handleCloseDeleteModal}>
              {usageCount !== null && usageCount > 0 ? 'Close' : 'Cancel'}
            </Button>
            {usageCount === 0 && (
              <Button
                color="danger"
                onPress={handleConfirmDelete}
                isLoading={deleteMutation.isPending}
              >
                Delete
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// Separate component for reorderable table to avoid conditional column rendering issues
function ReorderableTable({
  items,
  title,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isReordering,
}: {
  items: ListItemWithUsage[];
  title: string;
  onEdit: (item: ListItemWithUsage) => void;
  onDelete: (item: ListItemWithUsage) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isReordering: boolean;
}) {
  return (
    <Table aria-label={`${title} table`}>
      <TableHeader>
        <TableColumn width={80}>ORDER</TableColumn>
        <TableColumn>NAME</TableColumn>
        <TableColumn width={100}>USAGE COUNT</TableColumn>
        <TableColumn width={120} align="end">ACTIONS</TableColumn>
      </TableHeader>
      <TableBody emptyContent={`No ${title.toLowerCase()} defined`}>
        {items.map((item, index) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="flex gap-1">
                <Tooltip content="Move up">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    isDisabled={index === 0 || isReordering}
                    onPress={() => onMoveUp(index)}
                    aria-label="Move up"
                  >
                    <Icon icon="solar:alt-arrow-up-linear" width={16} />
                  </Button>
                </Tooltip>
                <Tooltip content="Move down">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    isDisabled={index === items.length - 1 || isReordering}
                    onPress={() => onMoveDown(index)}
                    aria-label="Move down"
                  >
                    <Icon icon="solar:alt-arrow-down-linear" width={16} />
                  </Button>
                </Tooltip>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.name}</span>
                {item.isSystem && (
                  <Tooltip content="System item (cannot be deleted)">
                    <Chip size="sm" variant="flat" color="warning">
                      System
                    </Chip>
                  </Tooltip>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Tooltip content="Number of records using this item">
                <Chip
                  size="sm"
                  variant="flat"
                  color={item.usageCount > 0 ? 'primary' : 'default'}
                >
                  {item.usageCount}
                </Chip>
              </Tooltip>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Tooltip content="Edit this item">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => onEdit(item)}
                    aria-label="Edit"
                  >
                    <Icon icon="solar:pen-linear" width={18} />
                  </Button>
                </Tooltip>
                <Tooltip
                  content={
                    item.isSystem
                      ? 'System items cannot be deleted'
                      : 'Delete this item'
                  }
                >
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    isDisabled={item.isSystem}
                    onPress={() => onDelete(item)}
                    aria-label="Delete"
                  >
                    <Icon icon="solar:trash-bin-trash-linear" width={18} />
                  </Button>
                </Tooltip>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ListItemModal({
  isOpen,
  onClose,
  item,
  onSave,
  isLoading,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: ListItemWithUsage | null;
  onSave: (formData: ListItemFormData) => void;
  isLoading: boolean;
  title: string;
}) {
  const [formData, setFormData] = useState<ListItemFormData>({ code: '', name: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);

  useEffect(() => {
    if (item) {
      setFormData({
        code: item.code,
        name: item.name,
        description: item.description ?? '',
      });
      setAutoGenerateCode(false); // Don't auto-generate when editing
    } else {
      setFormData({ code: '', name: '', description: '' });
      setAutoGenerateCode(true);
    }
    setErrors({});
    setSaveError(null);
  }, [item, isOpen]);

  const handleNameChange = (name: string) => {
    const newFormData = { ...formData, name };
    // Auto-generate code from name if creating new item and user hasn't manually edited code
    if (autoGenerateCode && !item) {
      newFormData.code = generateCodeFromName(name);
    }
    setFormData(newFormData);
  };

  const handleCodeChange = (code: string) => {
    setFormData({ ...formData, code });
    // Once user manually edits code, stop auto-generating
    setAutoGenerateCode(false);
  };

  const validate = (): boolean => {
    const validationErrors = validateFormData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = () => {
    if (validate()) {
      setSaveError(null);
      onSave({
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      });
    }
  };

  const singularTitle = title.replace(/s$/, '');

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{item ? `Edit ${singularTitle}` : `Add ${singularTitle}`}</ModalHeader>
        <ModalBody>
          {saveError && (
            <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger border border-danger-200 mb-4">
              {saveError}
            </div>
          )}
          <div className="space-y-4">
            <Input
              label="Name"
              placeholder={`Enter ${singularTitle.toLowerCase()} name`}
              value={formData.name}
              onValueChange={handleNameChange}
              isRequired
              maxLength={200}
              isInvalid={!!errors.name}
              errorMessage={errors.name}
              autoFocus
              description="Display name shown in dropdowns"
            />
            <Input
              label="Code"
              placeholder={`Enter ${singularTitle.toLowerCase()} code`}
              value={formData.code}
              onValueChange={handleCodeChange}
              isRequired
              maxLength={50}
              isInvalid={!!errors.code}
              errorMessage={errors.code}
              description="Unique identifier (auto-generated from name)"
            />
            <Textarea
              label="Description"
              placeholder="Optional description"
              value={formData.description ?? ''}
              onValueChange={(v) => setFormData({ ...formData, description: v })}
              maxLength={500}
              isInvalid={!!errors.description}
              errorMessage={errors.description}
              minRows={2}
              maxRows={4}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
