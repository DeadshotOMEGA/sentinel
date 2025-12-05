import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  Tab,
  Card,
  CardBody,
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
} from '@heroui/react';
import PageWrapper from '../components/PageWrapper';
import { api } from '../lib/api';
import type { Division, Badge, CreateDivisionInput } from '@shared/types';

export default function Settings() {
  const [tab, setTab] = useState('divisions');

  return (
    <PageWrapper title="Settings">
      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDivision, setEditDivision] = useState<Division | null>(null);
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

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button color="primary" onPress={handleAdd}>Add Division</Button>
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
              <TableCell><Chip size="sm">{division.code}</Chip></TableCell>
              <TableCell>{division.name}</TableCell>
              <TableCell>{division.description ? division.description : '-'}</TableCell>
              <TableCell>
                <Button size="sm" variant="light" onPress={() => handleEdit(division)}>
                  Edit
                </Button>
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

function BadgesSettings() {
  const { data: badges, isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const response = await api.get<Badge[]>('/badges');
      return response.data;
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
          <CardBody className="text-center">
            <p className="text-2xl font-bold">{badges?.length ? badges.length : 0}</p>
            <p className="text-sm text-gray-600">Total Badges</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-2xl font-bold text-success">{assigned}</p>
            <p className="text-sm text-gray-600">Assigned</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-2xl font-bold text-gray-500">{unassigned}</p>
            <p className="text-sm text-gray-600">Available</p>
          </CardBody>
        </Card>
      </div>

      <Table aria-label="Badges">
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
