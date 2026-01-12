import { useState, useEffect, useMemo } from 'react';
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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';
import type { TrainingYear, HolidayExclusion } from '@shared/types/reports';
import TrainingYearCalendarGrid from './TrainingYearCalendarGrid';

interface TrainingYearFormData {
  name: string;
  startDate: string;
  endDate: string;
  holidayExclusions: HolidayExclusion[];
}

interface CreateTrainingYearInput {
  name: string;
  startDate: string;
  endDate: string;
  holidayExclusions: HolidayExclusion[];
}

export default function TrainingYearSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editYear, setEditYear] = useState<TrainingYear | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TrainingYear | null>(null);
  const [setCurrentConfirm, setSetCurrentConfirm] = useState<TrainingYear | null>(null);
  const queryClient = useQueryClient();

  const { data: yearsData, isLoading } = useQuery({
    queryKey: ['training-years'],
    queryFn: async () => {
      const response = await api.get<{ trainingYears: TrainingYear[] }>('/training-years');
      return response.data;
    },
  });

  const years = yearsData?.trainingYears;
  const currentYear = useMemo(() => years?.find((y) => y.isCurrent), [years]);

  const handleAdd = () => {
    setEditYear(null);
    setIsModalOpen(true);
  };

  const handleEdit = (year: TrainingYear) => {
    setEditYear(year);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['training-years'] });
    setIsModalOpen(false);
    setEditYear(null);
  };

  const handleSetCurrentClick = (year: TrainingYear) => {
    setSetCurrentConfirm(year);
  };

  const handleDeleteClick = (year: TrainingYear) => {
    setDeleteConfirm(year);
  };

  const setCurrentMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/training-years/${id}/set-current`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-years'] });
      setSetCurrentConfirm(null);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const message = err.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to set current training year - no error message received');
      }
      alert(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/training-years/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-years'] });
      setDeleteConfirm(null);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const message = err.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to delete training year - no error message received');
      }
      alert(message);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button color="primary" onPress={handleAdd} size="lg" style={{ minHeight: '48px' }}>
          Add Training Year
        </Button>
      </div>

      <Table aria-label="Training Years">
        <TableHeader>
          <TableColumn>NAME</TableColumn>
          <TableColumn>START DATE</TableColumn>
          <TableColumn>END DATE</TableColumn>
          <TableColumn>STATUS</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No training years configured">
          {(years ? years : []).map((year) => (
            <TableRow key={year.id}>
              <TableCell className="font-medium">{year.name}</TableCell>
              <TableCell>{new Date(year.startDate).toLocaleDateString('en-CA')}</TableCell>
              <TableCell>{new Date(year.endDate).toLocaleDateString('en-CA')}</TableCell>
              <TableCell>
                {year.isCurrent ? (
                  <Chip color="success" size="sm">Current</Chip>
                ) : null}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        style={{ minWidth: '48px', minHeight: '48px' }}
                      >
                        <Icon icon="mdi:dots-vertical" width={20} />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      aria-label="Training year actions"
                      disabledKeys={year.isCurrent ? ['set-current', 'delete'] : []}
                    >
                      <DropdownItem
                        key="edit"
                        startContent={<Icon icon="mdi:pencil" width={18} />}
                        onPress={() => handleEdit(year)}
                      >
                        Edit
                      </DropdownItem>
                      <DropdownItem
                        key="set-current"
                        startContent={<Icon icon="mdi:check-circle" width={18} />}
                        onPress={() => handleSetCurrentClick(year)}
                        className={year.isCurrent ? 'hidden' : ''}
                      >
                        Set as Current
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        className={year.isCurrent ? 'hidden' : 'text-danger'}
                        color="danger"
                        startContent={<Icon icon="mdi:delete" width={18} />}
                        onPress={() => handleDeleteClick(year)}
                      >
                        Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Calendar Grid for Current Training Year */}
      {currentYear && (
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-medium">Training Year Calendar</h3>
          <TrainingYearCalendarGrid trainingYear={currentYear} />
        </div>
      )}

      <TrainingYearModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        year={editYear}
      />

      {/* Set Current Confirmation Modal */}
      <Modal
        isOpen={!!setCurrentConfirm}
        onClose={() => setSetCurrentConfirm(null)}
        size="md"
      >
        <ModalContent>
          <ModalHeader>Set as Current Training Year</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to set <strong>{setCurrentConfirm?.name}</strong> as the current training year?
            </p>
            <p className="mt-2 text-sm text-default-500">
              This will update all reports and attendance calculations to use this training year.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setSetCurrentConfirm(null)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={() => setCurrentConfirm && setCurrentMutation.mutate(setCurrentConfirm.id)}
              isLoading={setCurrentMutation.isPending}
            >
              Set as Current
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        size="md"
      >
        <ModalContent>
          <ModalHeader>Delete Training Year</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
            </p>
            <div className="mt-4 rounded-lg bg-warning-50 p-3">
              <p className="text-sm text-warning-700">
                <strong>Warning:</strong> This action cannot be undone. Historical reports using this training year may be affected.
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function TrainingYearModal({
  isOpen,
  onClose,
  onSave,
  year,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  year: TrainingYear | null;
}) {
  const [formData, setFormData] = useState<TrainingYearFormData>({
    name: '',
    startDate: '',
    endDate: '',
    holidayExclusions: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (year) {
      setFormData({
        name: year.name,
        startDate: new Date(year.startDate).toISOString().split('T')[0],
        endDate: new Date(year.endDate).toISOString().split('T')[0],
        holidayExclusions: year.holidayExclusions,
      });
    } else {
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        holidayExclusions: [],
      });
    }
    setError('');
  }, [year, isOpen]);

  const handleAddExclusion = () => {
    setFormData({
      ...formData,
      holidayExclusions: [
        ...formData.holidayExclusions,
        { name: '', start: '', end: '' },
      ],
    });
  };

  const handleRemoveExclusion = (index: number) => {
    setFormData({
      ...formData,
      holidayExclusions: formData.holidayExclusions.filter((_, i) => i !== index),
    });
  };

  const handleExclusionChange = (
    index: number,
    field: keyof HolidayExclusion,
    value: string
  ) => {
    const updated = [...formData.holidayExclusions];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, holidayExclusions: updated });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Training year name is required');
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

    // Validate holiday exclusions
    for (let i = 0; i < formData.holidayExclusions.length; i++) {
      const exc = formData.holidayExclusions[i];
      if (!exc.name.trim()) {
        setError(`Holiday exclusion #${i + 1}: Name is required`);
        return false;
      }
      if (!exc.start) {
        setError(`Holiday exclusion #${i + 1}: Start date is required`);
        return false;
      }
      if (!exc.end) {
        setError(`Holiday exclusion #${i + 1}: End date is required`);
        return false;
      }
      if (new Date(exc.end) < new Date(exc.start)) {
        setError(`Holiday exclusion #${i + 1}: End date must be after start date`);
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
      const payload: CreateTrainingYearInput = {
        name: formData.name.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        holidayExclusions: formData.holidayExclusions,
      };

      if (year) {
        await api.put(`/training-years/${year.id}`, payload);
      } else {
        await api.post('/training-years', payload);
      }

      onSave();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to save training year - no error message received');
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{year ? 'Edit Training Year' : 'Add Training Year'}</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="space-y-6">
            <Input
              label="Training Year Name"
              placeholder="e.g., 2024-2025"
              value={formData.name}
              onValueChange={(v) => setFormData({ ...formData, name: v })}
              isRequired
              autoFocus
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                label="Start Date"
                value={formData.startDate}
                onValueChange={(v) => setFormData({ ...formData, startDate: v })}
                isRequired
              />
              <Input
                type="date"
                label="End Date"
                value={formData.endDate}
                onValueChange={(v) => setFormData({ ...formData, endDate: v })}
                isRequired
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium">Holiday Exclusions</label>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  onPress={handleAddExclusion}
                  startContent={<Icon icon="mdi:plus" width={18} />}
                  style={{ minHeight: '48px' }}
                >
                  Add Exclusion
                </Button>
              </div>

              {formData.holidayExclusions.length === 0 && (
                <div className="rounded-lg border border-dashed border-default-300 p-4 text-center text-sm text-default-500">
                  No holiday exclusions added. Click "Add Exclusion" to add training nights that should be excluded from attendance calculations.
                </div>
              )}

              <div className="space-y-3">
                {formData.holidayExclusions.map((exclusion, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-default-200 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-default-600">
                        Exclusion #{index + 1}
                      </span>
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        isIconOnly
                        onPress={() => handleRemoveExclusion(index)}
                        style={{ minWidth: '48px', minHeight: '48px' }}
                      >
                        <Icon icon="mdi:delete" width={18} />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <Input
                        label="Name"
                        placeholder="e.g., Christmas Break"
                        value={exclusion.name}
                        onValueChange={(v) =>
                          handleExclusionChange(index, 'name', v)
                        }
                        isRequired
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="date"
                          label="Start Date"
                          value={exclusion.start}
                          onValueChange={(v) =>
                            handleExclusionChange(index, 'start', v)
                          }
                          isRequired
                        />
                        <Input
                          type="date"
                          label="End Date"
                          value={exclusion.end}
                          onValueChange={(v) =>
                            handleExclusionChange(index, 'end', v)
                          }
                          isRequired
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} style={{ minHeight: '48px' }}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={isLoading}
            style={{ minHeight: '48px' }}
          >
            {year ? 'Save Changes' : 'Create Training Year'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
