import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  CheckboxGroup,
  Checkbox,
  Spinner,
} from '@heroui/react';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import type {
  BMQCourse,
  BMQEnrollmentWithMember,
  BMQEnrollmentStatus,
} from '@shared/types/reports';

interface CreateBMQCourseInput {
  name: string;
  startDate: string;
  endDate: string;
  trainingDays: string[];
  trainingStartTime: string;
  trainingEndTime: string;
}

interface BMQCourseWithCount extends BMQCourse {
  enrollmentCount?: number;
}

const weekdays = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const statusColors: Record<BMQEnrollmentStatus, 'primary' | 'success' | 'default'> = {
  enrolled: 'primary',
  completed: 'success',
  withdrawn: 'default',
};

function capitalizeDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/** Strip seconds from time string (HH:MM:SS -> HH:MM) */
function formatTime(time: string): string {
  return time.slice(0, 5);
}

export default function BMQCoursesSettings() {
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<BMQCourse | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null);

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['bmq-courses', { active: activeTab === 'active' }],
    queryFn: async () => {
      const response = await api.get<{ courses: BMQCourseWithCount[] }>(
        `/bmq-courses?active=${activeTab === 'active'}`
      );
      return response.data;
    },
  });

  const { data: enrollmentsData } = useQuery({
    queryKey: ['bmq-enrollments', selectedCourseId],
    queryFn: async () => {
      const response = await api.get<{ enrollments: BMQEnrollmentWithMember[] }>(
        `/bmq-courses/${selectedCourseId}/enrollments`
      );
      return response.data;
    },
    enabled: !!selectedCourseId,
  });

  const handleAdd = () => {
    setEditCourse(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (course: BMQCourse) => {
    setEditCourse(course);
    setIsCreateModalOpen(true);
  };

  const handleViewEnrollments = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const handleDelete = (courseId: string) => {
    setDeleteCourseId(courseId);
  };

  if (coursesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const courses = coursesData?.courses ? coursesData.courses : [];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(k) => setActiveTab(k as 'active' | 'past')}
        >
          <Tab key="active" title="Active Courses" />
          <Tab key="past" title="Past Courses" />
        </Tabs>
        <Button color="primary" onPress={handleAdd}>
          Create Course
        </Button>
      </div>

      <Table aria-label="BMQ Courses">
        <TableHeader>
          <TableColumn>NAME</TableColumn>
          <TableColumn>DATES</TableColumn>
          <TableColumn>TRAINING DAYS</TableColumn>
          <TableColumn>TRAINING TIME</TableColumn>
          <TableColumn>ENROLLMENTS</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody emptyContent={`No ${activeTab} courses`}>
          {courses.map((course) => (
            <TableRow key={course.id}>
              <TableCell>{course.name}</TableCell>
              <TableCell>
                {format(new Date(course.startDate), 'MMM d, yyyy')} -{' '}
                {format(new Date(course.endDate), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                {course.trainingDays.map(capitalizeDay).join(', ')}
              </TableCell>
              <TableCell>
                {formatTime(course.trainingStartTime)} - {formatTime(course.trainingEndTime)}
              </TableCell>
              <TableCell>
                <Chip size="sm" color="primary" variant="flat">
                  {course.enrollmentCount ? course.enrollmentCount : 0}
                </Chip>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => handleViewEnrollments(course.id)}
                  >
                    Enrollments
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => handleEdit(course)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => handleDelete(course.id)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CourseModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditCourse(null);
        }}
        course={editCourse}
      />

      <EnrollmentsModal
        isOpen={!!selectedCourseId}
        onClose={() => setSelectedCourseId(null)}
        courseId={selectedCourseId}
        enrollments={enrollmentsData?.enrollments ? enrollmentsData.enrollments : []}
      />

      <DeleteConfirmModal
        isOpen={!!deleteCourseId}
        onClose={() => setDeleteCourseId(null)}
        courseId={deleteCourseId}
        enrollmentCount={
          courses.find((c) => c.id === deleteCourseId)?.enrollmentCount
            ? courses.find((c) => c.id === deleteCourseId)!.enrollmentCount!
            : 0
        }
      />
    </>
  );
}

function CourseModal({
  isOpen,
  onClose,
  course,
}: {
  isOpen: boolean;
  onClose: () => void;
  course: BMQCourse | null;
}) {
  const [formData, setFormData] = useState<Partial<CreateBMQCourseInput>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name,
        startDate: format(new Date(course.startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(course.endDate), 'yyyy-MM-dd'),
        trainingDays: course.trainingDays,
        trainingStartTime: course.trainingStartTime,
        trainingEndTime: course.trainingEndTime,
      });
    } else {
      setFormData({});
    }
    setError('');
  }, [course, isOpen]);

  const validateForm = (): string | null => {
    if (!formData.name || formData.name.trim().length === 0) {
      return 'Name is required';
    }
    if (formData.name.length > 100) {
      return 'Name must be 100 characters or less';
    }
    if (!formData.startDate) {
      return 'Start date is required';
    }
    if (!formData.endDate) {
      return 'End date is required';
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      return 'Start date must be before end date';
    }
    if (!formData.trainingDays || formData.trainingDays.length === 0) {
      return 'At least one training day is required';
    }
    if (!formData.trainingStartTime) {
      return 'Start time is required';
    }
    if (!formData.trainingEndTime) {
      return 'End time is required';
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.trainingStartTime)) {
      return 'Start time must be in HH:MM format';
    }
    if (!timeRegex.test(formData.trainingEndTime)) {
      return 'End time must be in HH:MM format';
    }

    // Compare times
    if (formData.trainingStartTime >= formData.trainingEndTime) {
      return 'Start time must be before end time';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      if (course) {
        await api.put(`/bmq-courses/${course.id}`, formData);
      } else {
        await api.post('/bmq-courses', formData);
      }
      queryClient.invalidateQueries({ queryKey: ['bmq-courses'] });
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to save course - no error message received');
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>{course ? 'Edit Course' : 'Create Course'}</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <Input
              label="Course Name"
              placeholder="e.g., Fall 2024 BMQ"
              value={formData.name ? formData.name : ''}
              onValueChange={(v) => setFormData({ ...formData, name: v })}
              isRequired
              maxLength={100}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={formData.startDate ? formData.startDate : ''}
                onValueChange={(v) => setFormData({ ...formData, startDate: v })}
                isRequired
              />
              <Input
                label="End Date"
                type="date"
                value={formData.endDate ? formData.endDate : ''}
                onValueChange={(v) => setFormData({ ...formData, endDate: v })}
                isRequired
              />
            </div>
            <CheckboxGroup
              label="Training Days"
              value={formData.trainingDays ? formData.trainingDays : []}
              onValueChange={(values) =>
                setFormData({ ...formData, trainingDays: values })
              }
              orientation="horizontal"
              classNames={{
                wrapper: 'gap-4',
              }}
            >
              {weekdays.map((day) => (
                <Checkbox key={day.key} value={day.key}>
                  {day.label}
                </Checkbox>
              ))}
            </CheckboxGroup>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Time"
                type="time"
                placeholder="HH:MM"
                value={formData.trainingStartTime ? formData.trainingStartTime : ''}
                onValueChange={(v) => setFormData({ ...formData, trainingStartTime: v })}
                isRequired
              />
              <Input
                label="End Time"
                type="time"
                placeholder="HH:MM"
                value={formData.trainingEndTime ? formData.trainingEndTime : ''}
                onValueChange={(v) => setFormData({ ...formData, trainingEndTime: v })}
                isRequired
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
            {course ? 'Save' : 'Create'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function EnrollmentsModal({
  isOpen,
  onClose,
  courseId,
  enrollments,
}: {
  isOpen: boolean;
  onClose: () => void;
  courseId: string | null;
  enrollments: BMQEnrollmentWithMember[];
}) {
  if (!courseId) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <ModalContent>
        <ModalHeader>Course Enrollments</ModalHeader>
        <ModalBody>
          <Table aria-label="Enrollments">
            <TableHeader>
              <TableColumn>SERVICE #</TableColumn>
              <TableColumn>RANK</TableColumn>
              <TableColumn>NAME</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>ENROLLED DATE</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No enrollments">
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-mono">
                    {enrollment.member.serviceNumber}
                  </TableCell>
                  <TableCell>{enrollment.member.rank}</TableCell>
                  <TableCell>
                    {enrollment.member.lastName}, {enrollment.member.firstName}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={statusColors[enrollment.status]} variant="flat">
                      {enrollment.status}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {format(new Date(enrollment.enrolledAt), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button onPress={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  courseId,
  enrollmentCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  courseId: string | null;
  enrollmentCount: number;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!courseId) return;

    setIsLoading(true);
    setError('');
    try {
      await api.delete(`/bmq-courses/${courseId}`);
      queryClient.invalidateQueries({ queryKey: ['bmq-courses'] });
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to delete course - no error message received');
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Delete Course</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <p className="text-sm">
            Are you sure you want to delete this course?
          </p>
          {enrollmentCount > 0 && (
            <div className="mt-3 rounded-lg bg-warning-50 p-3">
              <p className="text-sm font-semibold text-warning-700">Warning</p>
              <p className="mt-1 text-sm text-warning-700">
                This course has <strong>{enrollmentCount}</strong> enrollment
                {enrollmentCount !== 1 ? 's' : ''}. Deleting this course will also delete all
                associated enrollment records.
              </p>
            </div>
          )}
          <p className="mt-3 text-sm text-gray-600">This action cannot be undone.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="danger" onPress={handleDelete} isLoading={isLoading}>
            Delete Course
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
