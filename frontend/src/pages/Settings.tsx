import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  Tab,
  Card,
  CardBody,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Spinner,
} from '../components/ui/heroui-polyfills';
import PageWrapper from '../components/PageWrapper';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '../components/ui/SentinelTable';
import { api } from '../lib/api';
import type { Division, Badge, CreateDivisionInput } from '@shared/types';
import { SearchBar, ConfirmDialog, EmptyState } from '@sentinel/ui';

export default function Settings() {
  const [tab, setTab] = useState('divisions');

  return (
    <PageWrapper title="Settings">
      <Tabs
        selectedKey={tab}
        onSelectionChange={(k) => setTab(k as string)}
        aria-label="Settings categories"
      >
        <Tab key="divisions" title="Divisions" />
        <Tab key="badges" title="Badges" />
      </Tabs>

      <div className="mt-6">
        {tab === 'divisions' && <DivisionsSettings />}
        {tab === 'badges' && <BadgesSettings />}
      </div>
    </PageWrapper>
  );
}

function DivisionsSettings() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDivision, setEditDivision] = useState<Division | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Division | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: divisions, isLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await api.get<{ divisions: Division[] }>('/divisions');
      return response.data.divisions;
    },
  });

  // Filter divisions by search query
  const filteredDivisions = divisions?.filter((division) =>
    division.name.toLowerCase().includes(search.toLowerCase()) ||
    division.code.toLowerCase().includes(search.toLowerCase())
  );

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

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await api.delete(`/divisions/${deleteConfirm.id}`);
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      setDeleteConfirm(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to delete division - no error message received');
      }
      // In a real app, you'd show this error to the user
      console.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  return (
    <>
      <div className="mb-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search divisions..."
            aria-label="Search divisions"
            className="flex-1 max-w-md"
          />
          <Button color="primary" onPress={handleAdd}>Add Division</Button>
        </div>
      </div>

      {filteredDivisions && filteredDivisions.length === 0 ? (
        search.trim() ? (
          <EmptyState
            variant="no-results"
            heading="No divisions found"
            description="Try adjusting your search"
          />
        ) : (
          <EmptyState
            variant="no-data"
            heading="No divisions yet"
            description="Add your first division to get started"
            action={{
              label: "Add Division",
              onClick: handleAdd
            }}
          />
        )
      ) : (
        <Table aria-label="Divisions list">
          <TableHeader>
            <TableColumn>CODE</TableColumn>
            <TableColumn>NAME</TableColumn>
            <TableColumn>DESCRIPTION</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody emptyContent="No divisions">
            {(filteredDivisions ? filteredDivisions : []).map((division) => (
              <TableRow key={division.id}>
                <TableCell><Chip size="sm">{division.code}</Chip></TableCell>
                <TableCell>{division.name}</TableCell>
                <TableCell>{division.description ? division.description : '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => handleEdit(division)}
                      aria-label={`Edit division ${division.name}`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => setDeleteConfirm(division)}
                      aria-label={`Delete division ${division.name}`}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DivisionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        division={editDivision}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Division"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
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
  }, [division]);

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
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to save division - no error message received');
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent role="dialog" aria-modal="true">
        <ModalHeader>{division ? 'Edit Division' : 'Add Division'}</ModalHeader>
        <ModalBody>
          {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</div>}
          <div className="space-y-4">
            <Input
              label="Code"
              value={formData.code ? formData.code : ''}
              onValueChange={(v) => setFormData({ ...formData, code: v })}
              maxLength={20}
              isRequired
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

function BadgesSettings() {
  const { data: badges, isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const response = await api.get<{ badges: Badge[] }>('/badges');
      return response.data.badges;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  const assigned = badges?.filter((b) => b.assignmentType !== 'unassigned').length ? badges.filter((b) => b.assignmentType !== 'unassigned').length : 0;
  const unassigned = badges?.filter((b) => b.assignmentType === 'unassigned').length ? badges.filter((b) => b.assignmentType === 'unassigned').length : 0;

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="text-center" role="region" aria-label={`Total badges: ${badges?.length ? badges.length : 0}`}>
            <span className="sr-only">Total badges: </span>
            <p className="text-2xl font-bold" aria-hidden="true">{badges?.length ? badges.length : 0}</p>
            <p className="text-sm text-gray-600" aria-hidden="true">Total Badges</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center" role="region" aria-label={`Assigned badges: ${assigned}`}>
            <span className="sr-only">Assigned badges: </span>
            <p className="text-2xl font-bold text-success" aria-hidden="true">{assigned}</p>
            <p className="text-sm text-gray-600" aria-hidden="true">Assigned</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center" role="region" aria-label={`Available badges: ${unassigned}`}>
            <span className="sr-only">Available badges: </span>
            <p className="text-2xl font-bold text-gray-500" aria-hidden="true">{unassigned}</p>
            <p className="text-sm text-gray-600" aria-hidden="true">Available</p>
          </CardBody>
        </Card>
      </div>

      <Table aria-label="Badges list">
        <TableHeader>
          <TableColumn>SERIAL NUMBER</TableColumn>
          <TableColumn>TYPE</TableColumn>
          <TableColumn>STATUS</TableColumn>
          <TableColumn>LAST USED</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No badges registered">
          {(badges ? badges : []).map((badge) => (
            <TableRow key={badge.id}>
              <TableCell className="font-mono">{badge.serialNumber}</TableCell>
              <TableCell>
                <Chip size="sm" variant="flat">
                  {badge.assignmentType}
                </Chip>
              </TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  color={badge.status === 'active' ? 'success' : 'default'}
                >
                  {badge.status}
                </Chip>
              </TableCell>
              <TableCell>
                {badge.lastUsed
                  ? new Date(badge.lastUsed).toLocaleDateString()
                  : 'Never'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
