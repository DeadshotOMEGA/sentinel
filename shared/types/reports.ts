// Training Year Types
export interface TrainingYear {
  id: string;
  name: string;                        // e.g., "2024-2025"
  startDate: Date;
  endDate: Date;
  holidayExclusions: HolidayExclusion[];
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HolidayExclusion {
  start: string;                       // ISO date string
  end: string;                         // ISO date string
  name: string;                        // e.g., "Christmas Break"
}

// BMQ Course Types
export interface BMQCourse {
  id: string;
  name: string;                        // e.g., "Fall 2024 BMQ"
  startDate: Date;
  endDate: Date;
  trainingDays: string[];              // e.g., ["saturday", "sunday"]
  trainingStartTime: string;           // e.g., "08:00"
  trainingEndTime: string;             // e.g., "16:00"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BMQEnrollmentStatus = 'enrolled' | 'completed' | 'withdrawn';

export interface BMQEnrollment {
  id: string;
  memberId: string;
  bmqCourseId: string;
  enrolledAt: Date;
  completedAt: Date | null;
  status: BMQEnrollmentStatus;
}

export interface BMQEnrollmentWithMember extends BMQEnrollment {
  member: {
    id: string;
    serviceNumber: string;
    firstName: string;
    lastName: string;
    rank: string;
    divisionId: string;
  };
}

export interface BMQEnrollmentWithCourse extends BMQEnrollment {
  course: BMQCourse;
}

// Report Types
export type ReportType =
  | 'daily_checkin'
  | 'training_night_attendance'
  | 'bmq_attendance'
  | 'personnel_roster'
  | 'visitor_summary';

export type AttendanceStatus = 'new' | 'insufficient_data' | 'calculated';
export type ThresholdFlag = 'none' | 'warning' | 'critical';
export type TrendDirection = 'up' | 'down' | 'stable' | 'none';

export interface AttendanceCalculation {
  status: AttendanceStatus;
  percentage?: number;
  attended?: number;
  possible?: number;
  flag?: ThresholdFlag;
  badge?: string;                      // e.g., "New", "BMQ"
  display?: string;                    // e.g., "3 of 5" for insufficient data
}

export interface TrendIndicator {
  trend: TrendDirection;
  delta?: number;                      // e.g., +5 or -3
}

// Report Configuration Types
export type OrganizationOption =
  | 'full_unit'
  | 'grouped_by_division'
  | 'separated_by_division'
  | 'specific_division'
  | 'specific_member';

export interface TrainingNightReportConfig {
  periodStart: string;                 // ISO date
  periodEnd: string;                   // ISO date
  organizationOption: OrganizationOption;
  divisionId?: string;
  memberId?: string;
  includeFTStaff: boolean;
  showBMQBadge: boolean;
}

export interface BMQReportConfig {
  courseId: string;
  organizationOption: OrganizationOption;
  divisionId?: string;
}

export interface PersonnelRosterConfig {
  divisionId?: string;
  sortOrder: 'division_rank' | 'rank' | 'alphabetical';
}

export interface VisitorSummaryConfig {
  startDate: string;                   // ISO date
  endDate: string;                     // ISO date
  visitType?: string;
  organization?: string;
}

export interface DailyCheckinConfig {
  divisionId?: string;
  memberType?: 'all' | 'ft_staff' | 'reserve';
}

// Report Data Types (returned from API)
export interface TrainingNightAttendanceData {
  member: {
    id: string;
    serviceNumber: string;
    firstName: string;
    lastName: string;
    rank: string;
    division: { id: string; name: string };
  };
  attendance: AttendanceCalculation;
  trend: TrendIndicator;
  isBMQEnrolled: boolean;
  enrollmentDate: Date;
}

export interface BMQAttendanceData {
  member: {
    id: string;
    serviceNumber: string;
    firstName: string;
    lastName: string;
    rank: string;
    division: { id: string; name: string };
  };
  attendance: AttendanceCalculation;
  enrollment: BMQEnrollment;
}

// Audit Log Types
export interface ReportAuditLog {
  id: string;
  reportType: ReportType;
  reportConfig: Record<string, unknown>;
  generatedBy: string | null;          // null for scheduled
  isScheduled: boolean;
  scheduledReportId: string | null;
  generatedAt: Date;
  fileSizeBytes: number | null;
  generationTimeMs: number | null;
}
