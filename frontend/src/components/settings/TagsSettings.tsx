import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Spinner,
  Tooltip,
  Textarea,
  Alert,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { TruncatedText } from '../tooltips';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { getTagChipVariant } from '../../lib/chipVariants';
import type { Tag, CreateTagInput, UpdateTagInput } from '@shared/types';

interface TagsResponse {
  tags: Tag[];
}

interface UsageResponse {
  usageCount: number;
}

interface TagWithUsage extends Tag {
  usageCount?: number;
}

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

export default function TagsSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [deleteTag, setDeleteTag] = useState<Tag | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteUsageCount, setDeleteUsageCount] = useState<number | null>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [localTags, setLocalTags] = useState<TagWithUsage[]>([]);
  const queryClient = useQueryClient();

  const { data: tagsData, isLoading, error } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get<TagsResponse>('/tags');
      return response.data;
    },
  });
  const tags = tagsData?.tags;

  // Sync local tags with query data for optimistic updates
  useEffect(() => {
    if (tagsWithUsage.length > 0) {
      setLocalTags(tagsWithUsage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags]);

  // Fetch usage counts for all tags
  const usageQueries = useQueries({
    queries: (tags ?? []).map((tag) => ({
      queryKey: ['tag-usage', tag.id],
      queryFn: async () => {
        const response = await api.get<UsageResponse>(`/tags/${tag.id}/usage`);
        return { tagId: tag.id, usageCount: response.data.usageCount };
      },
      staleTime: 30000, // Cache for 30 seconds
    })),
  });

  // Build a map of tag ID to usage count
  const usageCountMap = new Map<string, number>();
  usageQueries.forEach((query) => {
    if (query.data) {
      usageCountMap.set(query.data.tagId, query.data.usageCount);
    }
  });

  // Enrich tags with usage counts
  const tagsWithUsage: TagWithUsage[] = (tags ?? []).map((tag) => ({
    ...tag,
    usageCount: usageCountMap.get(tag.id),
  }));

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      await api.put('/tags/reorder', { tagIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (err: { response?: { data?: { error?: { message?: string } | string } } }) => {
      const errorData = err.response?.data?.error;
      const message = typeof errorData === 'string'
        ? errorData
        : errorData?.message || 'Failed to reorder tags';
      toast.error(message);
      // Revert to original order on error
      if (tagsWithUsage.length > 0) {
        setLocalTags(tagsWithUsage);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag-usage'] });
      toast.success('Tag deleted successfully');
      handleCloseDeleteModal();
    },
    onError: (err: { response?: { data?: { error?: { message?: string } | string } } }) => {
      const errorData = err.response?.data?.error;
      const message = typeof errorData === 'string'
        ? errorData
        : errorData?.message || 'Failed to delete tag';
      toast.error(message);
    },
  });

  const handleAdd = () => {
    setEditTag(null);
    setIsModalOpen(true);
  };

  const handleEdit = (tag: Tag) => {
    setEditTag(tag);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (tag: Tag) => {
    setDeleteTag(tag);
    setIsDeleteModalOpen(true);
    setDeleteUsageCount(null);
    setIsCheckingUsage(true);

    try {
      const response = await api.get<UsageResponse>(`/tags/${tag.id}/usage`);
      setDeleteUsageCount(response.data.usageCount);
    } catch {
      toast.error('Failed to check tag usage');
      setDeleteUsageCount(0);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTag && deleteUsageCount === 0) {
      deleteMutation.mutate(deleteTag.id);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteTag(null);
    setDeleteUsageCount(null);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    queryClient.invalidateQueries({ queryKey: ['tag-usage'] });
    setIsModalOpen(false);
    setEditTag(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newTags = [...localTags];
    [newTags[index - 1], newTags[index]] = [newTags[index], newTags[index - 1]];
    setLocalTags(newTags);
    reorderMutation.mutate(newTags.map((tag) => tag.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === localTags.length - 1) return;
    const newTags = [...localTags];
    [newTags[index], newTags[index + 1]] = [newTags[index + 1], newTags[index]];
    setLocalTags(newTags);
    reorderMutation.mutate(newTags.map((tag) => tag.id));
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
      <Alert color="danger" className="mb-4">
        Failed to load tags. Please try refreshing the page.
      </Alert>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tags</h3>
          <p className="text-sm text-default-500">Manage tags for categorizing and filtering members</p>
        </div>
        <Tooltip content="Create a new tag for categorizing members">
          <Button
            color="primary"
            onPress={handleAdd}
            startContent={<Icon icon="solar:add-circle-linear" width={18} />}
          >
            Add Tag
          </Button>
        </Tooltip>
      </div>

      <Table aria-label="Tags">
        <TableHeader>
          <TableColumn width={80}>ORDER</TableColumn>
          <TableColumn>NAME</TableColumn>
          <TableColumn>COLOR</TableColumn>
          <TableColumn>DESCRIPTION</TableColumn>
          <TableColumn width={100}>USAGE COUNT</TableColumn>
          <TableColumn width={120} align="end">ACTIONS</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No tags defined">
          {localTags.map((tag, index) => (
            <TableRow key={tag.id}>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    isDisabled={index === 0 || reorderMutation.isPending}
                    onPress={() => handleMoveUp(index)}
                    aria-label="Move up"
                  >
                    <Icon icon="solar:alt-arrow-up-bold" width={16} />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    isDisabled={index === localTags.length - 1 || reorderMutation.isPending}
                    onPress={() => handleMoveDown(index)}
                    aria-label="Move down"
                  >
                    <Icon icon="solar:alt-arrow-down-bold" width={16} />
                  </Button>
                </div>
              </TableCell>
              <TableCell>{tag.name}</TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  variant={getTagChipVariant()}
                  style={{
                    backgroundColor: AVAILABLE_COLORS.find(c => c.value === tag.color)?.hex || tag.color,
                    color: '#ffffff'
                  }}
                >
                  {tag.name}
                </Chip>
              </TableCell>
              <TableCell>
                {tag.description ? (
                  <TruncatedText content={tag.description} className="max-w-xs truncate" />
                ) : (
                  <span className="text-default-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <Tooltip content={`${tag.usageCount ?? 0} member${tag.usageCount !== 1 ? 's' : ''} assigned this tag`}>
                  <span className={tag.usageCount === undefined ? 'text-default-400' : ''}>
                    {tag.usageCount ?? <Spinner size="sm" />}
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Tooltip content="Edit tag details">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => handleEdit(tag)}
                      aria-label="Edit"
                    >
                      <Icon icon="solar:pen-linear" width={18} />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Delete this tag">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => handleDeleteClick(tag)}
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

      <TagModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        tag={editTag}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal}>
        <ModalContent>
          <ModalHeader>Delete Tag</ModalHeader>
          <ModalBody>
            {isCheckingUsage ? (
              <div className="flex items-center justify-center py-4">
                <Spinner size="sm" />
                <span className="ml-2">Checking usage...</span>
              </div>
            ) : deleteUsageCount !== null && deleteUsageCount > 0 ? (
              <Alert color="danger">
                Cannot delete tag &quot;{deleteTag?.name}&quot;. It is currently used by{' '}
                {deleteUsageCount} {deleteUsageCount === 1 ? 'member' : 'members'}.
              </Alert>
            ) : (
              <>
                <p>
                  Are you sure you want to delete the tag{' '}
                  <strong>&quot;{deleteTag?.name}&quot;</strong>?
                </p>
                <p className="mt-2 text-sm text-default-500">This action cannot be undone.</p>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={handleCloseDeleteModal}>
              Cancel
            </Button>
            {deleteUsageCount === 0 && (
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

function TagModal({
  isOpen,
  onClose,
  onSave,
  tag,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  tag: Tag | null;
}) {
  const [formData, setFormData] = useState<Partial<CreateTagInput>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tag) {
      setFormData({
        name: tag.name,
        color: tag.color,
        description: tag.description,
      });
    } else {
      setFormData({ color: 'blue' }); // Default blue color
    }
    setError('');
  }, [tag, isOpen]);

  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.color?.trim()) {
      setError('Color is required');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const payload: CreateTagInput | UpdateTagInput = {
        name: formData.name.trim(),
        color: formData.color.trim(),
        description: formData.description?.trim() || undefined,
      };

      if (tag) {
        await api.put(`/tags/${tag.id}`, payload);
        toast.success('Tag updated successfully');
      } else {
        await api.post('/tags', payload);
        toast.success('Tag created successfully');
      }
      onSave();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message?: string } | string } } };
      const errorData = apiError.response?.data?.error;
      const message = typeof errorData === 'string'
        ? errorData
        : errorData?.message || 'Failed to save tag';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{tag ? 'Edit Tag' : 'Add Tag'}</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</div>
          )}
          <div className="space-y-4">
            <Input
              label="Name"
              placeholder="Enter tag name"
              value={formData.name ?? ''}
              onValueChange={(v) => setFormData({ ...formData, name: v })}
              isRequired
              maxLength={100}
            />
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
                    variant={getTagChipVariant()}
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
            <Textarea
              label="Description"
              placeholder="Enter tag description (optional)"
              value={formData.description ?? ''}
              onValueChange={(v) => setFormData({ ...formData, description: v })}
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

