import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import PageWrapper from '../components/PageWrapper';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import type { MemberWithDivision, BMQEnrollmentWithCourse, BMQCourse, BMQEnrollmentStatus } from '@shared/types';

function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Fetch member details
  const { data: memberData, isLoading: memberLoading } = useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      const response = await api.get<{ member: MemberWithDivision }>(`/members/${memberId}`);
      return response.data;
    },
    enabled: !!memberId,
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

  const member = memberData?.member;
  const enrollments = enrollmentsData?.enrollments ?? [];
  const courses = coursesData?.courses ?? [];

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

  const formatDate = (date: Date | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
    <PageWrapper title="Member Detail">
      <div className="flex flex-col gap-6">
        {/* Member Info Card */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {member.rank} {member.firstName} {member.lastName}
              </h2>
              <p className="text-sm text-default-500">Service Number: {member.serviceNumber}</p>
            </div>
            <Button
              variant="flat"
              startContent={<Icon icon="solar:arrow-left-linear" width={18} />}
              onPress={() => navigate('/members')}
            >
              Back to Members
            </Button>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-default-500">Division</p>
                <p className="text-base">{member.division.name}</p>
              </div>
              <div>
                <p className="text-sm text-default-500">Member Type</p>
                <Chip
                  size="sm"
                  variant="flat"
                  color={
                    member.memberType === 'class_a' ? 'default' :
                    member.memberType === 'class_b' ? 'success' :
                    member.memberType === 'class_c' ? 'warning' :
                    'primary'
                  }
                >
                  {member.memberType === 'class_a' ? 'Class A' :
                   member.memberType === 'class_b' ? 'Class B' :
                   member.memberType === 'class_c' ? 'Class C' :
                   'Reg Force'}
                </Chip>
              </div>
              {member.mess && (
                <div>
                  <p className="text-sm text-default-500">Mess</p>
                  <p className="text-base">{member.mess}</p>
                </div>
              )}
              {member.email && (
                <div>
                  <p className="text-sm text-default-500">Email</p>
                  <p className="text-base">{member.email}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* BMQ Enrollment Card */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">BMQ Enrollment</h3>
            <Button
              color="primary"
              size="sm"
              startContent={<Icon icon="solar:add-circle-bold" width={18} />}
              onPress={() => setIsEnrollModalOpen(true)}
              isDisabled={availableCourses.length === 0}
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
              <p className="py-8 text-center text-default-500">Not enrolled in any BMQ courses</p>
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
                            >
                              Mark Completed
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              color="default"
                              onPress={() => handleUpdateStatus(enrollment.id, 'withdrawn')}
                              isLoading={updateStatusMutation.isPending}
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
    </PageWrapper>
  );
}

export default function MemberDetail() {
  return <MemberDetailPage />;
}
