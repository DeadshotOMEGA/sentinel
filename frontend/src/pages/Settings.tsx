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
  Tooltip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { TruncatedText } from '../components/tooltips';
import PageWrapper from '../components/PageWrapper';
import { api } from '../lib/api';
import type { Division, Badge, CreateDivisionInput } from '@shared/types';
import TrainingYearSettings from '../components/settings/TrainingYearSettings';
import WorkingHoursSettings from '../components/settings/WorkingHoursSettings';
import ReportSettingsForm from '../components/settings/ReportSettingsForm';
import BMQCoursesSettings from '../components/settings/BMQCoursesSettings';
import DevToolsSection from '../components/settings/DevToolsSection';

export default function Settings() {
  const [tab, setTab] = useState('divisions');

  return (
    <PageWrapper title="Settings">
      <div className="-mx-1 -mt-1 min-h-0 flex-1 overflow-auto px-1 pt-1 pb-6">
        <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
          <Tab key="divisions" title={
            <Tooltip content="Manage unit divisions and departments">
              <span>Divisions</span>
            </Tooltip>
          } />
          <Tab key="badges" title={
            <Tooltip content="View and manage RFID badges">
              <span>Badges</span>
            </Tooltip>
          } />
          <Tab key="training-year" title={
            <Tooltip content="Configure training year start/end dates">
              <span>Training Year</span>
            </Tooltip>
          } />
          <Tab key="working-hours" title={
            <Tooltip content="Set building operating hours">
              <span>Working Hours</span>
            </Tooltip>
          } />
          <Tab key="report-settings" title={
            <Tooltip content="Configure report headers and formats">
              <span>Report Settings</span>
            </Tooltip>
          } />
          <Tab key="bmq-courses" title={
            <Tooltip content="Manage Basic Military Qualification courses">
              <span>BMQ Courses</span>
            </Tooltip>
          } />
          <Tab key="dev-tools" title={
            <Tooltip content="Developer tools and database utilities">
              <span>Dev Tools</span>
            </Tooltip>
          } />
        </Tabs>

        <div className="mt-6">
          {tab === 'divisions' && <DivisionsSettings />}
          {tab === 'badges' && <BadgesSettings />}
          {tab === 'training-year' && <TrainingYearSettings />}
          {tab === 'working-hours' && <WorkingHoursSettings />}
          {tab === 'report-settings' && <ReportSettingsForm />}
          {tab === 'bmq-courses' && <BMQCoursesSettings />}
          {tab === 'dev-tools' && <DevToolsSection />}
        </div>
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
                  <Chip size="sm">{division.code}</Chip>
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
                <Tooltip content="Edit division details">
                  <Button size="sm" variant="light" onPress={() => handleEdit(division)}>
                    Edit
                  </Button>
                </Tooltip>
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
  const { data: badgesData, isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const response = await api.get<{ badges: Badge[] }>('/badges');
      return response.data;
    },
  });
  const badges = badgesData?.badges;

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  const assigned = badges?.filter((b) => b.assignmentType !== 'unassigned').length ? badges.filter((b) => b.assignmentType !== 'unassigned').length : 0;
  const unassigned = badges?.filter((b) => b.assignmentType === 'unassigned').length ? badges.filter((b) => b.assignmentType === 'unassigned').length : 0;

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tooltip content="Total number of RFID badges in the system">
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold">{badges?.length ? badges.length : 0}</p>
              <p className="text-sm text-default-500">Total Badges</p>
            </CardBody>
          </Card>
        </Tooltip>
        <Tooltip content="Badges currently assigned to members or kiosks">
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-success">{assigned}</p>
              <p className="text-sm text-default-500">Assigned</p>
            </CardBody>
          </Card>
        </Tooltip>
        <Tooltip content="Badges available for assignment">
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-default-400">{unassigned}</p>
              <p className="text-sm text-default-500">Available</p>
            </CardBody>
          </Card>
        </Tooltip>
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
              <TableCell>
                <Tooltip content="Badge serial number (from RFID chip)">
                  <span className="font-mono">{badge.serialNumber}</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip content={
                  badge.assignmentType === 'member' ? 'Assigned to a unit member' :
                  badge.assignmentType === 'event' ? 'Assigned to an event' :
                  'Not currently assigned'
                }>
                  <Chip size="sm" variant="flat">
                    {badge.assignmentType}
                  </Chip>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip content={
                  badge.status === 'active' ? 'Badge is active and can be used' :
                  badge.status === 'lost' ? 'Badge reported lost' :
                  badge.status === 'damaged' ? 'Badge is damaged' :
                  'Badge is inactive'
                }>
                  <Chip
                    size="sm"
                    color={badge.status === 'active' ? 'success' : badge.status === 'lost' ? 'danger' : 'default'}
                  >
                    {badge.status}
                  </Chip>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip content={badge.lastUsed ? `Last scan: ${new Date(badge.lastUsed).toLocaleString()}` : 'Badge has never been scanned'}>
                  <span className="cursor-help">
                    {badge.lastUsed
                      ? new Date(badge.lastUsed).toLocaleDateString()
                      : 'Never'}
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
