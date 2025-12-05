// Schedule Settings
export interface ScheduleSettings {
  trainingNightDay: string;            // e.g., "tuesday"
  trainingNightStart: string;          // e.g., "19:00"
  trainingNightEnd: string;            // e.g., "22:10"
  adminNightDay: string;               // e.g., "thursday"
  adminNightStart: string;
  adminNightEnd: string;
}

// Working Hours Settings
export interface WorkingHoursSettings {
  regularWeekdayStart: string;         // e.g., "08:00"
  regularWeekdayEnd: string;           // e.g., "16:00"
  regularWeekdays: string[];           // e.g., ["monday", "wednesday", "friday"]
  summerStartDate: string;             // e.g., "06-01" (MM-DD)
  summerEndDate: string;               // e.g., "08-31"
  summerWeekdayStart: string;
  summerWeekdayEnd: string;
}

// Threshold Settings
export interface ThresholdSettings {
  warningThreshold: number;            // e.g., 75
  criticalThreshold: number;           // e.g., 50
  showThresholdFlags: boolean;
  bmqSeparateThresholds: boolean;
  bmqWarningThreshold: number;
  bmqCriticalThreshold: number;
}

// Member Handling Settings
export interface MemberHandlingSettings {
  newMemberGracePeriod: number;        // weeks
  minimumTrainingNights: number;
  includeFTStaff: boolean;
  showBMQBadge: boolean;
  showTrendIndicators: boolean;
}

// Formatting Settings
export type SortOrder = 'division_rank' | 'rank' | 'alphabetical';
export type PageSize = 'letter' | 'a4';
export type DateFormat = 'DD MMM YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';

export interface FormattingSettings {
  defaultSortOrder: SortOrder;
  showServiceNumber: boolean;
  dateFormat: DateFormat;
  pageSize: PageSize;
}

// Combined Report Settings
export interface AllReportSettings {
  schedule: ScheduleSettings;
  workingHours: WorkingHoursSettings;
  thresholds: ThresholdSettings;
  memberHandling: MemberHandlingSettings;
  formatting: FormattingSettings;
}

// Settings API Types
export interface ReportSetting {
  key: string;
  value: unknown;
  updatedAt: Date;
}
