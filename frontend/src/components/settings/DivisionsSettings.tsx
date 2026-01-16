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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Spinner,
  Tooltip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { getDivisionChipVariant, TruncatedText } from '@sentinel/ui';
import type { Division, CreateDivisionInput } from '@shared/types';

export default function DivisionsSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDivision, setEditDivision] = useState<Division | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Division | null>(null);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const queryClient = useQueryClient();

  const { data: divisionsData, isLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await api.get<{ divisions: Division[] }>('/divisions');
      return response.data;
    },
  });
  const divisions = divisionsData?.divisions;

  const handleAdd = () => {
    setEditDivision(null);
    setIsModalOpen(true);
  };

  const handleEdit = (division: Division) => {
    setEditDivision(division);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['divisions'] });
    setIsModalOpen(false);
    setEditDivision(null);
  };

  const handleDeleteClick = async (division: Division) => {
    setIsCheckingUsage(true);
    try {
      const response = await api.get<{ count: number }>(`/divisions/${division.id}/usage`);
      setUsageCount(response.data.count);
      setDeleteConfirm(division);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message || 'Failed to fetch usage count';
      toast.error(message);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/divisions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      setDeleteConfirm(null);
      setUsageCount(null);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const message = err.response?.data?.error?.message || 'Failed to delete division';
      toast.error(message);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Divisions</h3>
          <p className="text-sm text-default-500">Manage organizational divisions for member grouping</p>
        </div>
        <Tooltip content="Create a new division for organizing members">
          <Button color="primary" onPress={handleAdd} startContent={<Icon icon="solar:add-circle-linear" width={18} />}>
            Add Division
          </Button>
        </Tooltip>
      </div>

      <Table aria-label="Divisions">
        <TableHeader>
          <TableColumn>CODE</TableColumn>
          <TableColumn>NAME</TableColumn>
          <TableColumn>DESCRIPTION</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No divisions">
          {(divisions ? divisions : []).map((division) => (
            <TableRow key={division.id}>
              <TableCell>
                <Tooltip content="Division code used in reports">
                  <Chip size="sm" variant={getDivisionChipVariant().variant} radius={getDivisionChipVariant().radius}>{division.code}</Chip>
                </Tooltip>
              </TableCell>
              <TableCell>{division.name}</TableCell>
              <TableCell>
                {division.description ? (
                  <TruncatedText content={division.description} className="truncate max-w-xs" />
                ) : (
                  <span className="text-default-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Tooltip content="Edit division details">
                    <Button size="sm" variant="light" onPress={() => handleEdit(division)}>
                      Edit
                    </Button>
                  </Tooltip>
                  <Tooltip content="Delete this division">
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => handleDeleteClick(division)}
                      isLoading={isCheckingUsage}
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

      <DivisionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        division={editDivision}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => {
          setDeleteConfirm(null);
          setUsageCount(null);
        }}
        size="md"
      >
        <ModalContent>
          <ModalHeader>Delete Division</ModalHeader>
          <ModalBody>
            {usageCount !== null && usageCount > 0 ? (
              <div className="rounded-lg bg-danger-50 p-4 border border-danger-200">
                <p className="text-danger font-medium">
                  Cannot delete. Used by {usageCount} member{usageCount !== 1 ? 's' : ''}.
                </p>
                <p className="text-sm text-danger-700 mt-2">
                  Please reassign members to a different division before deleting this one.
                </p>
              </div>
            ) : (
              <>
                <p>
                  Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
                </p>
                <p className="text-sm text-default-500 mt-2">
                  This division is not currently in use. This action cannot be undone.
                </p>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => {
                setDeleteConfirm(null);
                setUsageCount(null);
              }}
            >
              {usageCount !== null && usageCount > 0 ? 'Close' : 'Cancel'}
            </Button>
            {usageCount === 0 && (
              <Button
                color="danger"
                onPress={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
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

function DivisionModal({
  isOpen,
  onClose,
  onSave,
  division,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  division: Division | null;
}) {
  const [formData, setFormData] = useState<Partial<CreateDivisionInput>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (division) {
      setFormData({ name: division.name, code: division.code, description: division.description });
    } else {
      setFormData({});
    }
    setError('');
  }, [division, isOpen]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (division) {
        await api.put(`/divisions/${division.id}`, formData);
      } else {
        await api.post('/divisions', formData);
      }
      onSave();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message || 'Failed to save division';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{division ? 'Edit Division' : 'Add Division'}</ModalHeader>
        <ModalBody>
          {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</div>}
          <div className="space-y-4">
            <Input
              label="Code"
              value={formData.code ? formData.code : ''}
              onValueChange={(v) => setFormData({ ...formData, code: v })}
              isRequired
              maxLength={20}
            />
            <Input
              label="Name"
              value={formData.name ? formData.name : ''}
              onValueChange={(v) => setFormData({ ...formData, name: v })}
              isRequired
            />
            <Input
              label="Description"
              value={formData.description ? formData.description : ''}
              onValueChange={(v) => setFormData({ ...formData, description: v })}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>Cancel</Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>Save</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
