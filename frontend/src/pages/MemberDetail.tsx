import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Spinner,
  Chip,
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Textarea,
  Accordion,
  AccordionItem,
  Pagination,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import PageWrapper from '../components/PageWrapper';
import MemberModal from '../components/MemberModal';
import MemberBadgeAssignmentModal from '../components/MemberBadgeAssignmentModal';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import type {
  MemberWithDivision,
  BMQEnrollmentWithCourse,
  BMQCourse,
  BMQEnrollmentStatus,
  CheckinWithMember,
  Division,
  MemberStatus,
  Tag,
} from '@shared/types';

function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const historyLimit = 10;

  // Fetch member details
  const { data: memberData, isLoading: memberLoading } = useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      const response = await api.get<{ member: MemberWithDivision }>(`/members/${memberId}`);
      return response.data;
    },
    enabled: !!memberId,
  });

  // Fetch divisions for edit modal
  const { data: divisionsData } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await api.get<{ divisions: Division[] }>('/divisions');
      return response.data;
    },
  });

  // Fetch tags for edit modal
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get<{ tags: Tag[] }>('/tags');
      return response.data;
    },
  });

  // Fetch member's BMQ enrollments
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['member-bmq-enrollments', memberId],
    queryFn: async () => {
      const response = await api.get<{ enrollments: BMQEnrollmentWithCourse[] }>(
        `/members/${memberId}/bmq-enrollments`
      );
      return response.data;
    },
    enabled: !!memberId,
  });

  // Fetch check-in history (only when Activity tab is selected)
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['member-history', memberId, historyPage, historyLimit],
    queryFn: async () => {
      const response = await api.get<{
        checkins: CheckinWithMember[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/members/${memberId}/history?page=${historyPage}&limit=${historyLimit}`);
      return response.data;
    },
    enabled: !!memberId && activeTab === 'activity',
  });

  // Fetch active BMQ courses for enrollment
  const { data: coursesData } = useQuery({
    queryKey: ['bmq-courses-active'],
    queryFn: async () => {
      const response = await api.get<{ courses: BMQCourse[] }>('/bmq-courses?active=true');
      return response.data;
    },
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return api.post(`/bmq-courses/${courseId}/enrollments`, { memberId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-bmq-enrollments', memberId] });
      toast.success('Enrolled in BMQ course');
      setIsEnrollModalOpen(false);
      setSelectedCourseId('');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = error.response?.data?.error?.message || 'Failed to enroll in course';
      toast.error(message);
    },
  });

  // Update enrollment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ enrollmentId, status }: { enrollmentId: string; status: BMQEnrollmentStatus }) => {
      return api.put(`/bmq-courses/enrollments/${enrollmentId}`, {
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-bmq-enrollments', memberId] });
      toast.success('Enrollment status updated');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = error.response?.data?.error?.message || 'Failed to update enrollment status';
      toast.error(message);
    },
  });

  // Update member status mutation
  const updateMemberStatusMutation = useMutation({
    mutationFn: async (status: MemberStatus) => {
      return api.put(`/members/${memberId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      toast.success('Member status updated');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = error.response?.data?.error?.message || 'Failed to update member status';
      toast.error(message);
    },
  });

  // Delete member mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/members/${memberId}`);
    },
    onSuccess: () => {
      toast.success('Member deleted');
      navigate('/members');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = error.response?.data?.error?.message || 'Failed to delete member';
      toast.error(message);
    },
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      return api.put(`/members/${memberId}`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      toast.success('Notes updated');
      setIsEditingNotes(false);
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = error.response?.data?.error?.message || 'Failed to update notes';
      toast.error(message);
    },
  });

  const member = memberData?.member;
  const enrollments = enrollmentsData?.enrollments ?? [];
  const courses = coursesData?.courses ?? [];
  const divisions = divisionsData?.divisions ?? [];
  const tags = tagsData?.tags ?? [];
  const checkins = historyData?.checkins ?? [];
  const pagination = historyData?.pagination;

  // Filter out courses the member is already enrolled in
  const availableCourses = courses.filter(
    (course) => !enrollments.some((enrollment) => enrollment.bmqCourseId === course.id)
  );

  const handleEnroll = () => {
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }
    enrollMutation.mutate(selectedCourseId);
  };

  const handleUpdateStatus = (enrollmentId: string, status: BMQEnrollmentStatus) => {
    updateStatusMutation.mutate({ enrollmentId, status });
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notesValue);
  };

  const handleCancelNotes = () => {
    setNotesValue(member?.notes || '');
    setIsEditingNotes(false);
  };

  const handleArchive = () => {
    updateMemberStatusMutation.mutate('inactive');
    setIsArchiveModalOpen(false);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setIsDeleteModalOpen(false);
  };

  const handleExport = () => {
    console.log('Export member data:', member);
    toast.success('Export feature coming soon');
  };

  const handlePrint = () => {
    window.print();
  };

  const getDropdownItems = () => {
    const statusItems = [];

    if (member?.status !== 'active') {
      statusItems.push(
        <DropdownItem
          key="set-active"
          startContent={<Icon icon="solar:check-circle-linear" width={18} />}
          onPress={() => updateMemberStatusMutation.mutate('active')}
        >
          Set Active
        </DropdownItem>
      );
    }

    if (member?.status !== 'inactive') {
      statusItems.push(
        <DropdownItem
          key="set-inactive"
          startContent={<Icon icon="solar:close-circle-linear" width={18} />}
          onPress={() => updateMemberStatusMutation.mutate('inactive')}
        >
          Set Inactive
        </DropdownItem>
      );
    }

    if (member?.status !== 'pending_review') {
      statusItems.push(
        <DropdownItem
          key="set-pending"
          startContent={<Icon icon="solar:clock-circle-linear" width={18} />}
          onPress={() => updateMemberStatusMutation.mutate('pending_review')}
        >
          Set ED&T
        </DropdownItem>
      );
    }

    return (
      <>
        {statusItems.length > 0 && (
          <DropdownSection title="Status" showDivider>
            {statusItems}
          </DropdownSection>
        )}
        <DropdownSection>
          <DropdownItem
            key="archive"
            startContent={<Icon icon="solar:archive-linear" width={18} />}
            onPress={() => setIsArchiveModalOpen(true)}
          >
            Archive
          </DropdownItem>
          <DropdownItem
            key="delete"
            color="danger"
            className="text-danger"
            startContent={<Icon icon="solar:trash-bin-trash-linear" width={18} />}
            onPress={() => setIsDeleteModalOpen(true)}
          >
            Delete
          </DropdownItem>
        </DropdownSection>
        <DropdownSection title="More">
          <DropdownItem
            key="export"
            startContent={<Icon icon="solar:export-linear" width={18} />}
            onPress={handleExport}
          >
            Export
          </DropdownItem>
          <DropdownItem
            key="print"
            startContent={<Icon icon="solar:printer-linear" width={18} />}
            onPress={handlePrint}
          >
            Print
          </DropdownItem>
        </DropdownSection>
      </>
    );
  };

  const getStatusColor = (status: BMQEnrollmentStatus): 'primary' | 'success' | 'default' => {
    switch (status) {
      case 'enrolled':
        return 'primary';
      case 'completed':
        return 'success';
      case 'withdrawn':
        return 'default';
    }
  };

  const getMemberStatusColor = (status: MemberStatus): 'success' | 'default' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'pending_review':
        return 'warning';
    }
  };

  const getMemberTypeColor = (
    type: 'class_a' | 'class_b' | 'class_c' | 'reg_force'
  ): 'default' | 'success' | 'warning' | 'primary' => {
    switch (type) {
      case 'class_a':
        return 'default';
      case 'class_b':
        return 'success';
      case 'class_c':
        return 'warning';
      case 'reg_force':
        return 'primary';
    }
  };

  const getMemberTypeLabel = (type: 'class_a' | 'class_b' | 'class_c' | 'reg_force'): string => {
    switch (type) {
      case 'class_a':
        return 'Class A';
      case 'class_b':
        return 'Class B';
      case 'class_c':
        return 'Class C';
      case 'reg_force':
        return 'Reg Force';
    }
  };

  const getContractWarning = (contractEnd?: Date) => {
    if (!contractEnd) return null;
    const daysUntilExpiry = Math.ceil(
      (new Date(contractEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry < 0) return 'danger';
    if (daysUntilExpiry <= 30) return 'warning';
    return null;
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (memberLoading) {
    return (
      <PageWrapper title="Member Detail">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    );
  }

  if (!member) {
    return (
      <PageWrapper title="Member Detail">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="mb-4 text-default-500">Member not found</p>
          <Button onPress={() => navigate('/members')}>Back to Members</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={`${member.rank} ${member.lastName}, ${member.firstName}`}>
      {/* Two-column layout: Main content left, sidebar right */}
      <div className="flex flex-col-reverse gap-6 lg:flex-row">
        {/* Main content - Left on desktop, bottom on mobile */}
        <div className="flex-1 min-w-0">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            aria-label="Member details tabs"
          >
            <Tab key="overview" title="Overview" />
            <Tab key="training" title="Training" />
            <Tab key="activity" title="Activity" />
            <Tab key="notes" title="Notes" />
          </Tabs>

          <div className="mt-6">
            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Military Profile Card */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Military Profile</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-default-500">Rank</p>
                        <p className="text-base">{member.rank}</p>
                      </div>
                      {member.moc && (
                        <div>
                          <p className="text-sm text-default-500">MOC</p>
                          <Chip size="sm" variant="flat">
                            {member.moc}
                          </Chip>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-default-500">Member Type</p>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={getMemberTypeColor(member.memberType)}
                        >
                          {getMemberTypeLabel(member.memberType)}
                        </Chip>
                      </div>
                      {member.mess && (
                        <div>
                          <p className="text-sm text-default-500">Mess</p>
                          <Chip size="sm" variant="flat">
                            {member.mess}
                          </Chip>
                        </div>
                      )}
                      {(member.contractStart || member.contractEnd) && (
                        <div className="col-span-2">
                          <p className="text-sm text-default-500">Contract Period</p>
                          <div className="flex items-center gap-2">
                            <p className="text-base">
                              {formatDate(member.contractStart)} — {formatDate(member.contractEnd)}
                            </p>
                            {member.contractEnd && getContractWarning(member.contractEnd) && (
                              <Chip
                                size="sm"
                                color={getContractWarning(member.contractEnd) as 'warning' | 'danger'}
                              >
                                {getContractWarning(member.contractEnd) === 'danger'
                                  ? 'Expired'
                                  : 'Expiring Soon'}
                              </Chip>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-default-500">Badge</p>
                        {member.badgeId ? (
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-base">{member.badgeId}</p>
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => setIsBadgeModalOpen(true)}
                              aria-label="Manage badge assignment"
                            >
                              Manage
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            startContent={<Icon icon="solar:card-linear" width={16} />}
                            onPress={() => setIsBadgeModalOpen(true)}
                            aria-label="Assign badge to member"
                          >
                            Assign Badge
                          </Button>
                        )}
                      </div>
                      {member.employeeNumber && (
                        <div>
                          <p className="text-sm text-default-500">Employee Number</p>
                          <p className="font-mono text-base">{member.employeeNumber}</p>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>

                {/* Timestamps Card (Collapsed Accordion) */}
                <Card>
                  <CardBody className="p-0">
                    <Accordion>
                      <AccordionItem
                        key="timestamps"
                        aria-label="Timestamps"
                        title="Timestamps"
                        classNames={{
                          title: 'text-sm font-semibold',
                        }}
                      >
                        <div className="grid grid-cols-2 gap-4 pb-4">
                          <div>
                            <p className="text-sm text-default-500">Created At</p>
                            <p className="text-base">{formatDateTime(member.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-default-500">Updated At</p>
                            <p className="text-base">{formatDateTime(member.updatedAt)}</p>
                          </div>
                        </div>
                      </AccordionItem>
                    </Accordion>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Tab 2: Training */}
            {activeTab === 'training' && (
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">BMQ Enrollment</h3>
                  <Button
                    color="primary"
                    size="sm"
                    startContent={<Icon icon="solar:add-circle-bold" width={18} />}
                    onPress={() => setIsEnrollModalOpen(true)}
                    isDisabled={availableCourses.length === 0}
                    aria-label="Enroll in BMQ course"
                  >
                    Enroll in Course
                  </Button>
                </CardHeader>
                <CardBody>
                  {enrollmentsLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : enrollments.length === 0 ? (
                    <p className="py-8 text-center text-default-500">
                      Not enrolled in any BMQ courses
                    </p>
                  ) : (
                    <Table aria-label="BMQ Enrollments" removeWrapper>
                      <TableHeader>
                        <TableColumn>COURSE NAME</TableColumn>
                        <TableColumn>STATUS</TableColumn>
                        <TableColumn>ENROLLED DATE</TableColumn>
                        <TableColumn>COMPLETED DATE</TableColumn>
                        <TableColumn align="end">ACTIONS</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {enrollments.map((enrollment) => (
                          <TableRow key={enrollment.id}>
                            <TableCell>{enrollment.course.name}</TableCell>
                            <TableCell>
                              <Chip size="sm" color={getStatusColor(enrollment.status)}>
                                {enrollment.status}
                              </Chip>
                            </TableCell>
                            <TableCell>{formatDate(enrollment.enrolledAt)}</TableCell>
                            <TableCell>{formatDate(enrollment.completedAt)}</TableCell>
                            <TableCell>
                              {enrollment.status === 'enrolled' && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="flat"
                                    color="success"
                                    onPress={() => handleUpdateStatus(enrollment.id, 'completed')}
                                    isLoading={updateStatusMutation.isPending}
                                    aria-label="Mark enrollment as completed"
                                  >
                                    Mark Completed
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="flat"
                                    color="default"
                                    onPress={() => handleUpdateStatus(enrollment.id, 'withdrawn')}
                                    isLoading={updateStatusMutation.isPending}
                                    aria-label="Mark enrollment as withdrawn"
                                  >
                                    Mark Withdrawn
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Tab 3: Activity */}
            {activeTab === 'activity' && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Check-in Timeline</h3>
                </CardHeader>
                <CardBody>
                  {historyLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : checkins.length === 0 ? (
                    <p className="py-8 text-center text-default-500">No check-in history</p>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {checkins.map((checkin, index) => (
                          <div key={checkin.id} className="flex gap-4">
                            {/* Timeline dot */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`h-3 w-3 rounded-full ${
                                  checkin.direction === 'in' ? 'bg-success' : 'bg-default-400'
                                }`}
                              />
                              {index < checkins.length - 1 && (
                                <div className="h-full w-0.5 flex-1 bg-default-200" />
                              )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2">
                                <Chip
                                  size="sm"
                                  color={checkin.direction === 'in' ? 'success' : 'default'}
                                >
                                  {checkin.direction === 'in' ? 'Check In' : 'Check Out'}
                                </Chip>
                                <span className="text-sm text-default-500">
                                  {formatDateTime(checkin.timestamp)}
                                </span>
                              </div>
                              {checkin.kioskId && (
                                <p className="mt-1 text-sm text-default-400">
                                  Location: {checkin.kioskId}
                                </p>
                              )}
                              {checkin.method === 'admin_manual' && (
                                <p className="mt-1 text-sm text-default-400">
                                  Method: Manual (Admin)
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {pagination && pagination.totalPages > 1 && (
                        <div className="mt-6 flex justify-center">
                          <Pagination
                            total={pagination.totalPages}
                            page={historyPage}
                            onChange={setHistoryPage}
                            showControls
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Tab 4: Notes */}
            {activeTab === 'notes' && (
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Member Notes</h3>
                  {!isEditingNotes && (
                    <Button
                      size="sm"
                      variant="flat"
                      startContent={<Icon icon="solar:pen-linear" width={18} />}
                      onPress={() => {
                        setNotesValue(member.notes || '');
                        setIsEditingNotes(true);
                      }}
                      aria-label="Edit notes"
                    >
                      Edit
                    </Button>
                  )}
                </CardHeader>
                <CardBody>
                  {isEditingNotes ? (
                    <>
                      <Textarea
                        value={notesValue}
                        onValueChange={setNotesValue}
                        placeholder="Enter notes about this member..."
                        minRows={6}
                        aria-label="Member notes"
                      />
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          variant="flat"
                          onPress={handleCancelNotes}
                          aria-label="Cancel editing notes"
                        >
                          Cancel
                        </Button>
                        <Button
                          color="primary"
                          onPress={handleSaveNotes}
                          isLoading={updateNotesMutation.isPending}
                          aria-label="Save notes"
                        >
                          Save
                        </Button>
                      </div>
                    </>
                  ) : member.notes ? (
                    <p className="whitespace-pre-wrap text-base">{member.notes}</p>
                  ) : (
                    <p className="text-default-400">No notes recorded</p>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar - Right on desktop, top on mobile */}
        <div className="w-full lg:w-80 lg:sticky lg:top-0 lg:self-start">
          <Card>
            <CardBody className="space-y-4">
              {/* Status Chip */}
              <div className="flex justify-center">
                <Chip color={getMemberStatusColor(member.status)} variant="flat">
                  {member.status === 'active'
                    ? 'Active'
                    : member.status === 'inactive'
                    ? 'Inactive'
                    : 'Pending Review'}
                </Chip>
              </div>

              {/* Name */}
              <div className="text-center">
                <h2 className="text-xl font-semibold">
                  {member.rank} {member.lastName}, {member.firstName}
                </h2>
              </div>

              {/* Service Number */}
              <div className="text-center">
                <p className="font-mono text-sm text-default-500">SN: {member.serviceNumber}</p>
              </div>

              {/* Division */}
              <div className="flex justify-center">
                <Chip variant="flat">{member.division.name}</Chip>
              </div>

              {/* Contact Info */}
              {(member.email || member.mobilePhone || member.homePhone) && (
                <div className="space-y-2">
                  {member.email && (
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:letter-linear" width={18} className="text-default-400" />
                      <a
                        href={`mailto:${member.email}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {member.email}
                      </a>
                    </div>
                  )}
                  {member.mobilePhone && (
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:smartphone-linear" width={18} className="text-default-400" />
                      <a
                        href={`tel:${member.mobilePhone}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {member.mobilePhone}
                      </a>
                    </div>
                  )}
                  {member.homePhone && (
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:phone-linear" width={18} className="text-default-400" />
                      <a
                        href={`tel:${member.homePhone}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {member.homePhone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  color="primary"
                  variant="flat"
                  className="flex-1"
                  onPress={() => setIsEditModalOpen(true)}
                  startContent={<Icon icon="solar:pen-linear" width={18} />}
                  aria-label="Edit member details"
                >
                  Edit
                </Button>
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      variant="flat"
                      endContent={<Icon icon="solar:alt-arrow-down-linear" width={18} />}
                      aria-label="More actions"
                    >
                      Actions
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Member actions">
                    {getDropdownItems()}
                  </DropdownMenu>
                </Dropdown>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Enroll in Course Modal */}
      <Modal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Enroll in BMQ Course</ModalHeader>
          <ModalBody>
            {availableCourses.length === 0 ? (
              <p className="text-default-500">No active BMQ courses available for enrollment.</p>
            ) : (
              <Select
                label="Select BMQ Course"
                placeholder="Choose a course"
                selectedKeys={selectedCourseId ? [selectedCourseId] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  setSelectedCourseId(selected);
                }}
                aria-label="Select BMQ course"
              >
                {availableCourses.map((course) => (
                  <SelectItem key={course.id}>
                    {course.name} ({formatDate(course.startDate)} - {formatDate(course.endDate)})
                  </SelectItem>
                ))}
              </Select>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleEnroll}
              isLoading={enrollMutation.isPending}
              isDisabled={!selectedCourseId || availableCourses.length === 0}
            >
              Enroll
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Member Modal */}
      <MemberModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['member', memberId] });
          setIsEditModalOpen(false);
          toast.success('Member updated');
        }}
        member={member}
        divisions={divisions}
        tags={tags}
      />

      {/* Archive Confirmation Modal */}
      <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Archive Member</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to archive{' '}
              <strong>
                {member.rank} {member.lastName}, {member.firstName}
              </strong>
              ? This will set their status to inactive.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsArchiveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="warning"
              onPress={handleArchive}
              isLoading={updateMemberStatusMutation.isPending}
            >
              Archive
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Delete Member</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to permanently delete{' '}
              <strong>
                {member.rank} {member.lastName}, {member.firstName}
              </strong>
              ? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button color="danger" onPress={handleDelete} isLoading={deleteMutation.isPending}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Badge Assignment Modal */}
      <MemberBadgeAssignmentModal
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        onSuccess={() => {
          setIsBadgeModalOpen(false);
        }}
        member={member}
      />
    </PageWrapper>
  );
}

export default function MemberDetail() {
  return <MemberDetailPage />;
}
