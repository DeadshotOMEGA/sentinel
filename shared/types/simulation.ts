// Data Simulation Types

/**
 * Member categories for simulation purposes
 * - fts: Full-Time Staff (Class B/Reg Force with CHW in notes)
 * - fts_edt: FTS with Excused from Drill & Training
 * - reserve: Reserve members (Class A, or Class B/Reg Force without CHW)
 * - reserve_edt: Reserve with Excused from Drill & Training
 * - bmq_student: Members in BMQ Division
 */
export type SimulationMemberCategory =
  | 'fts'
  | 'fts_edt'
  | 'reserve'
  | 'reserve_edt'
  | 'bmq_student';

/**
 * Time range configuration for simulation
 */
export interface SimulationTimeRange {
  mode: 'last_days' | 'custom';
  lastDays?: number;          // 7, 30, 60, 90, 180, 365
  startDate?: string;         // ISO date string
  endDate?: string;           // ISO date string
}

/**
 * Attendance rate configuration (0-100 percentages)
 */
export interface SimulationAttendanceRates {
  ftsWorkDays: number;        // Default: 95
  ftsTrainingNight: number;   // Default: 90
  ftsAdminNight: number;      // Default: 70
  reserveTrainingNight: number; // Default: 70
  reserveAdminNight: number;  // Default: 40
  bmqAttendance: number;      // Default: 90
  edtAppearance: number;      // Default: 15 (rare appearances for ED&T members)
}

/**
 * Simulation intensity controls
 */
export interface SimulationIntensity {
  visitorsPerDay: {
    min: number;              // Default: 2
    max: number;              // Default: 8
  };
  eventsPerMonth: {
    min: number;              // Default: 1
    max: number;              // Default: 3
  };
  edgeCasePercentage: number; // Default: 10 (percentage of records with anomalies)
}

/**
 * Request payload for simulation endpoint
 */
export interface SimulationRequest {
  timeRange: SimulationTimeRange;
  attendanceRates: SimulationAttendanceRates;
  intensity: SimulationIntensity;
  warnOnOverlap: boolean;
}

/**
 * Response from simulation endpoint
 */
export interface SimulationResponse {
  summary: {
    dateRange: {
      start: string;          // ISO date string
      end: string;            // ISO date string
    };
    daysSimulated: number;
    generated: {
      checkins: number;
      visitors: number;
      events: number;
      eventAttendees: number;
      eventCheckins: number;
    };
    memberBreakdown: {
      fts: number;
      reserve: number;
      bmq: number;
      edt: number;
    };
    edgeCases: {
      forgottenCheckouts: number;
      lateArrivals: number;
      earlyDepartures: number;
      flaggedEntries: number;
    };
  };
  warnings: string[];         // Overlap warnings, skipped days, etc.
}

/**
 * Pre-simulation check response
 */
export interface SimulationPrecheck {
  hasOverlap: boolean;
  existingCheckins: number;
  existingVisitors: number;
  existingEvents: number;
  dateRange: {
    start: string;
    end: string;
  };
  activeMembers: number;
  memberCategories: Record<SimulationMemberCategory, number>;
}

/**
 * Internal: Resolved schedule for a specific date
 */
export interface ResolvedSchedule {
  date: string;               // ISO date string
  dayOfWeek: string;          // 'monday', 'tuesday', etc.
  isHoliday: boolean;
  holidayName?: string;
  isWorkDay: boolean;
  isSummerHours: boolean;
  isTrainingNight: boolean;
  isAdminNight: boolean;
  isBmqTrainingDay: boolean;
  workHours?: {
    start: string;            // HH:MM
    end: string;              // HH:MM
  };
  trainingNightHours?: {
    start: string;
    end: string;
  };
  adminNightHours?: {
    start: string;
    end: string;
  };
  bmqHours?: {
    start: string;
    end: string;
  };
}

/**
 * Internal: Categorized member for simulation
 */
export interface CategorizedMember {
  id: string;
  serviceNumber: string;
  firstName: string;
  lastName: string;
  rank: string;
  divisionId: string;
  badgeId: string | null;
  memberType: string;
  category: SimulationMemberCategory;
}

/**
 * Default attendance rates
 */
export const DEFAULT_ATTENDANCE_RATES: SimulationAttendanceRates = {
  ftsWorkDays: 95,
  ftsTrainingNight: 90,
  ftsAdminNight: 70,
  reserveTrainingNight: 70,
  reserveAdminNight: 40,
  bmqAttendance: 90,
  edtAppearance: 15,
};

/**
 * Default simulation intensity
 */
export const DEFAULT_INTENSITY: SimulationIntensity = {
  visitorsPerDay: { min: 2, max: 8 },
  eventsPerMonth: { min: 1, max: 3 },
  edgeCasePercentage: 10,
};
