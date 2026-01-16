import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  Select,
  SelectItem,
  Link,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { PageWrapper } from '@sentinel/ui';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import type { Badge, BadgeWithDetails, BadgeStatus } from '@shared/types';
import ListsSettings from '../components/settings/ListsSettings';
import TrainingYearSettings from '../components/settings/TrainingYearSettings';
import WorkingHoursSettings from '../components/settings/WorkingHoursSettings';
import ReportSettingsForm from '../components/settings/ReportSettingsForm';
import BMQCoursesSettings from '../components/settings/BMQCoursesSettings';
import TagsSettings from '../components/settings/TagsSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import DevToolsSection from '../components/settings/DevToolsSection';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const [tab, setTab] = useState('lists');
  const { user } = useAuth();
  const userRole = user?.role;

  return (
    <PageWrapper title="Settings">
      <div className="-mx-1 -mt-1 min-h-0 flex-1 overflow-auto px-1 pt-1 pb-6">
        <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
          <Tab key="lists" title={
            <Tooltip content="Manage reference lists and lookup values">
              <span>
                <span className="flex items-center gap-2">
                  <Icon icon="solar:list-bold" width={18} />
                  Lists
                </span>
              </span>
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
          {(userRole === 'admin' || userRole === 'developer') && (
            <Tab key="security" title={
              <Tooltip content="Manage user accounts and view audit logs">
                <span>Security</span>
              </Tooltip>
            } />
          )}
          {userRole === 'developer' && (
            <Tab key="dev-tools" title={
              <Tooltip content="Developer tools and database utilities">
                <span>Dev Tools</span>
              </Tooltip>
            } />
          )}
        </Tabs>

        <div className="mt-6">
          {tab === 'lists' && <ListsSettings />}
          {tab === 'badges' && <BadgesSettings />}
          {tab === 'training-year' && <TrainingYearSettings />}
          {tab === 'working-hours' && <WorkingHoursSettings />}
          {tab === 'report-settings' && <ReportSettingsForm />}
          {tab === 'bmq-courses' && <BMQCoursesSettings />}
          {tab === 'tags' && <TagsSettings />}
          {tab === 'security' && <SecuritySettings />}
          {tab === 'dev-tools' && <DevToolsSection />}
        </div>
      </div>
    </PageWrapper>
  );
}

const BADGE_STATUSES: BadgeStatus[] = ['active', 'lost', 'disabled', 'returned'];

function BadgesSettings() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [badgeToDelete, setBadgeToDelete] = useState<BadgeWithDetails | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');

  const { data: badgesData, isLoading } = useQuery({
    queryKey: ['badges', 'details'],
    queryFn: async () => {
      const response = await api.get<{ badges: BadgeWithDetails[] }>('/badges?details=true');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (serialNumber: string) => {
      const response = await api.post<{ badge: Badge }>('/badges', { serialNumber });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      toast.success('Badge added successfully');
      setIsAddModalOpen(false);
      setSerialNumber('');
    },
    onError: (err: { response?: { data?: { error?: string | { message?: string } } } }) => {
      const errorData = err.response?.data?.error;
      const message = typeof errorData === 'string'
        ? errorData
        : errorData?.message || 'Failed to add badge';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      await api.delete(`/badges/${badgeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      toast.success('Badge deleted successfully');
      setIsDeleteModalOpen(false);
      setBadgeToDelete(null);
    },
    onError: (err: { response?: { data?: { error?: string | { message?: string } } } }) => {
      const errorData = err.response?.data?.error;
      const message = typeof errorData === 'string'
        ? errorData
        : errorData?.message || 'Failed to delete badge';
      toast.error(message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ badgeId, status }: { badgeId: string; status: BadgeStatus }) => {
      const response = await api.put<{ badge: Badge }>(`/badges/${badgeId}/status`, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      if (variables.status === 'returned') {
        toast.success('Badge marked as returned and unassigned');
      } else {
        toast.success('Badge status updated');
      }
    },
    onError: (err: { response?: { data?: { error?: string | { message?: string } } } }) => {
      const errorData = err.response?.data?.error;
      const message = typeof errorData === 'string'
        ? errorData
        : errorData?.message || 'Failed to update status';
      toast.error(message);
    },
  });

  const badges = badgesData?.badges;

  // Filter badges based on search and filters
  const filteredBadges = useMemo(() => {
    if (!badges) return [];

    return badges.filter((badge) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSerial = badge.serialNumber.toLowerCase().includes(query);
        const matchesMember = badge.assignedMember
          ? `${badge.assignedMember.firstName} ${badge.assignedMember.lastName}`.toLowerCase().includes(query) ||
            badge.assignedMember.serviceNumber.toLowerCase().includes(query)
          : false;
        if (!matchesSerial && !matchesMember) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && badge.status !== statusFilter) return false;

      // Assignment filter
      if (assignmentFilter === 'assigned' && badge.assignmentType === 'unassigned') return false;
      if (assignmentFilter === 'unassigned' && badge.assignmentType !== 'unassigned') return false;

      return true;
    });
  }, [badges, searchQuery, statusFilter, assignmentFilter]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  const assigned = badges?.filter((b) => b.assignmentType !== 'unassigned').length ?? 0;
  const unassigned = badges?.filter((b) => b.assignmentType === 'unassigned').length ?? 0;

  const handleAddBadge = () => {
    if (!serialNumber.trim()) {
      toast.error('Please enter a serial number');
      return;
    }
    createMutation.mutate(serialNumber.trim());
  };

  const handleDeleteClick = (badge: BadgeWithDetails) => {
    setBadgeToDelete(badge);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (badgeToDelete) {
      deleteMutation.mutate(badgeToDelete.id);
    }
  };

  const handleStatusChange = (badgeId: string, status: BadgeStatus) => {
    statusMutation.mutate({ badgeId, status });
  };

  const getStatusColor = (status: BadgeStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'lost': return 'danger';
      case 'disabled': return 'warning';
      case 'returned': return 'default';
      default: return 'default';
    }
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="mb-6 flex items-center justify-between">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 flex-1 mr-4">
          <Tooltip content="Total number of RFID badges in the system">
            <Card>
              <CardBody className="text-center">
                <p className="text-2xl font-bold">{badges?.length ?? 0}</p>
                <p className="text-sm text-default-500">Total Badges</p>
              </CardBody>
            </Card>
          </Tooltip>
          <Tooltip content="Badges currently assigned to members">
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
        <Button
          color="primary"
          startContent={<Icon icon="solar:add-circle-bold" width={20} />}
          onPress={() => setIsAddModalOpen(true)}
        >
          Add Badge
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by serial number or member name..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Icon icon="solar:magnifer-linear" className="text-default-400" />}
          className="w-full sm:w-72"
          size="sm"
          isClearable
          onClear={() => setSearchQuery('')}
        />
        <Select
          label="Status"
          selectedKeys={[statusFilter]}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-36"
          size="sm"
        >
          <SelectItem key="all">All Status</SelectItem>
          <SelectItem key="active">Active</SelectItem>
          <SelectItem key="lost">Lost</SelectItem>
          <SelectItem key="disabled">Disabled</SelectItem>
          <SelectItem key="returned">Returned</SelectItem>
        </Select>
        <Select
          label="Assignment"
          selectedKeys={[assignmentFilter]}
          onChange={(e) => setAssignmentFilter(e.target.value)}
          className="w-40"
          size="sm"
        >
          <SelectItem key="all">All Badges</SelectItem>
          <SelectItem key="assigned">Assigned</SelectItem>
          <SelectItem key="unassigned">Unassigned</SelectItem>
        </Select>
        {(searchQuery || statusFilter !== 'all' || assignmentFilter !== 'all') && (
          <Button
            variant="light"
            size="sm"
            onPress={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setAssignmentFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results count */}
      {filteredBadges.length !== badges?.length && (
        <p className="text-sm text-default-500 mb-2">
          Showing {filteredBadges.length} of {badges?.length} badges
        </p>
      )}

      <Table aria-label="Badges">
        <TableHeader>
          <TableColumn>SERIAL NUMBER</TableColumn>
          <TableColumn>ASSIGNED TO</TableColumn>
          <TableColumn>STATUS</TableColumn>
          <TableColumn>LAST SCAN</TableColumn>
          <TableColumn align="end">ACTIONS</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No badges match your filters">
          {filteredBadges.map((badge) => (
            <TableRow key={badge.id}>
              <TableCell>
                <span className="font-mono">{badge.serialNumber}</span>
              </TableCell>
              <TableCell>
                {badge.assignedMember ? (
                  <Link
                    className="text-sm cursor-pointer hover:underline"
                    onPress={() => navigate(`/members/${badge.assignedMember!.id}`)}
                  >
                    {badge.assignedMember.lastName}, {badge.assignedMember.firstName}
                    <span className="text-default-400 ml-1">
                      ({badge.assignedMember.serviceNumber})
                    </span>
                  </Link>
                ) : (
                  <span className="text-default-400 text-sm">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                <Select
                  aria-label="Badge status"
                  selectedKeys={[badge.status]}
                  onChange={(e) => handleStatusChange(badge.id, e.target.value as BadgeStatus)}
                  size="sm"
                  className="w-28"
                  isDisabled={statusMutation.isPending}
                  classNames={{
                    trigger: `${getStatusColor(badge.status) === 'success' ? 'bg-success-50' : getStatusColor(badge.status) === 'danger' ? 'bg-danger-50' : getStatusColor(badge.status) === 'warning' ? 'bg-warning-50' : 'bg-default-100'}`,
                  }}
                >
                  {BADGE_STATUSES.map((status) => (
                    <SelectItem key={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </Select>
              </TableCell>
              <TableCell>
                {badge.lastScan ? (
                  <Tooltip content={`${badge.lastScan.direction === 'in' ? 'Checked in' : 'Checked out'} at ${badge.lastScan.kioskId}`}>
                    <span className="cursor-help text-sm">
                      {new Date(badge.lastScan.timestamp).toLocaleDateString()}{' '}
                      <span className="text-default-400">
                        @ {badge.lastScan.kioskId}
                      </span>
                    </span>
                  </Tooltip>
                ) : (
                  <span className="text-default-400 text-sm">Never</span>
                )}
              </TableCell>
              <TableCell>
                <Tooltip content={badge.assignmentType !== 'unassigned' ? 'Unassign badge before deleting' : 'Delete this badge'}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    isDisabled={badge.assignmentType !== 'unassigned'}
                    onPress={() => handleDeleteClick(badge)}
                    aria-label="Delete badge"
                  >
                    <Icon icon="solar:trash-bin-trash-linear" width={18} />
                  </Button>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add Badge Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Add New Badge</ModalHeader>
          <ModalBody>
            <Input
              label="Serial Number"
              placeholder="Scan badge or enter serial number"
              value={serialNumber}
              onValueChange={setSerialNumber}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddBadge();
                }
              }}
            />
            <p className="text-xs text-default-500 mt-2">
              Scan the RFID badge or manually enter the serial number printed on the badge.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleAddBadge}
              isLoading={createMutation.isPending}
            >
              Add Badge
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Delete Badge</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to delete badge{' '}
              <strong className="font-mono">{badgeToDelete?.serialNumber}</strong>?
            </p>
            <p className="text-sm text-default-500 mt-2">
              This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={handleConfirmDelete}
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
