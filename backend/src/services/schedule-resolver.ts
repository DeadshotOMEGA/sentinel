import { prisma } from '../db/prisma';
import type {
  ResolvedSchedule,
  ScheduleSettings,
  WorkingHoursSettings,
  TrainingYear,
  HolidayExclusion,
  BMQCourse,
} from '@shared/types';

/**
 * Day of week mapping
 */
const DAYS_OF_WEEK = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/**
 * Schedule Resolver Service
 *
 * Resolves what activities are scheduled for any given date by reading:
 * - Working Hours Settings (work days, training nights, admin nights)
 * - Training Years (holiday exclusions)
 * - BMQ Courses (BMQ training days)
 */
export class ScheduleResolver {
  private scheduleSettings: ScheduleSettings | null = null;
  private workingHoursSettings: WorkingHoursSettings | null = null;
  private trainingYear: TrainingYear | null = null;
  private bmqCourses: BMQCourse[] = [];
  private initialized = false;

  /**
   * Load all settings from database
   */
  async initialize(): Promise<void> {
    // Load report settings
    const settings = await prisma.report_settings.findMany({
      where: {
        key: { in: ['schedule', 'working_hours'] },
      },
    });

    for (const setting of settings) {
      if (setting.key === 'schedule') {
        this.scheduleSettings = setting.value as unknown as ScheduleSettings;
      } else if (setting.key === 'working_hours') {
        this.workingHoursSettings = setting.value as unknown as WorkingHoursSettings;
      }
    }

    // Load current training year
    const trainingYear = await prisma.training_years.findFirst({
      where: { is_current: true },
    });

    if (trainingYear) {
      this.trainingYear = {
        id: trainingYear.id,
        name: trainingYear.name,
        startDate: trainingYear.start_date,
        endDate: trainingYear.end_date,
        holidayExclusions: (trainingYear.holiday_exclusions ?? []) as unknown as HolidayExclusion[],
        isCurrent: trainingYear.is_current ?? false,
        createdAt: trainingYear.created_at ?? new Date(),
        updatedAt: trainingYear.updated_at ?? new Date(),
      };
    }

    // Load active BMQ courses
    const bmqCourses = await prisma.bmq_courses.findMany({
      where: { is_active: true },
    });

    this.bmqCourses = bmqCourses.map((course) => ({
      id: course.id,
      name: course.name,
      startDate: course.start_date,
      endDate: course.end_date,
      trainingDays: course.training_days,
      trainingStartTime: formatTimeFromDate(course.training_start_time),
      trainingEndTime: formatTimeFromDate(course.training_end_time),
      isActive: course.is_active ?? true,
      createdAt: course.created_at ?? new Date(),
      updatedAt: course.updated_at ?? new Date(),
    }));

    this.initialized = true;
  }

  /**
   * Ensure settings are loaded
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('ScheduleResolver not initialized. Call initialize() first.');
    }
  }

  /**
   * Get schedule settings
   */
  getScheduleSettings(): ScheduleSettings | null {
    this.ensureInitialized();
    return this.scheduleSettings;
  }

  /**
   * Get working hours settings
   */
  getWorkingHoursSettings(): WorkingHoursSettings | null {
    this.ensureInitialized();
    return this.workingHoursSettings;
  }

  /**
   * Get current training year
   */
  getTrainingYear(): TrainingYear | null {
    this.ensureInitialized();
    return this.trainingYear;
  }

  /**
   * Get active BMQ courses
   */
  getBmqCourses(): BMQCourse[] {
    this.ensureInitialized();
    return this.bmqCourses;
  }

  /**
   * Resolve schedule for a specific date
   */
  resolveDate(date: Date): ResolvedSchedule {
    this.ensureInitialized();

    const dateStr = date.toISOString().split('T')[0];
    if (!dateStr) {
      throw new Error('Invalid date');
    }
    // Use getUTCDay() to match the UTC date from toISOString()
    const dayOfWeek = DAYS_OF_WEEK[date.getUTCDay()];
    if (!dayOfWeek) {
      throw new Error('Invalid day of week');
    }

    // Check if it's a holiday
    const holidayInfo = this.isHoliday(date);

    // Check if it's summer hours period
    const isSummerHours = this.isSummerPeriod(date);

    // Check if it's a regular work day
    const isWorkDay = this.isWorkDay(dayOfWeek, holidayInfo.isHoliday);

    // Check if it's training night
    const isTrainingNight =
      !holidayInfo.isHoliday &&
      this.scheduleSettings?.trainingNightDay === dayOfWeek;

    // Check if it's admin night
    const isAdminNight =
      !holidayInfo.isHoliday &&
      this.scheduleSettings?.adminNightDay === dayOfWeek;

    // Check if it's a BMQ training day
    const bmqInfo = this.isBmqTrainingDay(date, dayOfWeek);

    // Build resolved schedule
    const resolved: ResolvedSchedule = {
      date: dateStr,
      dayOfWeek,
      isHoliday: holidayInfo.isHoliday,
      holidayName: holidayInfo.holidayName,
      isWorkDay,
      isSummerHours,
      isTrainingNight,
      isAdminNight,
      isBmqTrainingDay: bmqInfo.isBmqDay,
    };

    // Add work hours if it's a work day
    if (isWorkDay && this.workingHoursSettings) {
      if (isSummerHours) {
        resolved.workHours = {
          start: this.workingHoursSettings.summerWeekdayStart,
          end: this.workingHoursSettings.summerWeekdayEnd,
        };
      } else {
        resolved.workHours = {
          start: this.workingHoursSettings.regularWeekdayStart,
          end: this.workingHoursSettings.regularWeekdayEnd,
        };
      }
    }

    // Add training night hours
    if (isTrainingNight && this.scheduleSettings) {
      resolved.trainingNightHours = {
        start: this.scheduleSettings.trainingNightStart,
        end: this.scheduleSettings.trainingNightEnd,
      };
    }

    // Add admin night hours
    if (isAdminNight && this.scheduleSettings) {
      resolved.adminNightHours = {
        start: this.scheduleSettings.adminNightStart,
        end: this.scheduleSettings.adminNightEnd,
      };
    }

    // Add BMQ hours
    if (bmqInfo.isBmqDay && bmqInfo.hours) {
      resolved.bmqHours = bmqInfo.hours;
    }

    return resolved;
  }

  /**
   * Resolve schedule for a date range
   */
  resolveDateRange(startDate: Date, endDate: Date): ResolvedSchedule[] {
    const schedules: ResolvedSchedule[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      schedules.push(this.resolveDate(current));
      current.setDate(current.getDate() + 1);
    }

    return schedules;
  }

  /**
   * Check if a date falls within a holiday exclusion period
   */
  private isHoliday(date: Date): { isHoliday: boolean; holidayName?: string } {
    if (!this.trainingYear?.holidayExclusions) {
      return { isHoliday: false };
    }

    const dateTime = date.getTime();

    for (const exclusion of this.trainingYear.holidayExclusions) {
      const exclusionStart = new Date(exclusion.start).getTime();
      const exclusionEnd = new Date(exclusion.end).getTime();

      if (dateTime >= exclusionStart && dateTime <= exclusionEnd) {
        return { isHoliday: true, holidayName: exclusion.name };
      }
    }

    return { isHoliday: false };
  }

  /**
   * Check if a date falls within summer hours period
   */
  private isSummerPeriod(date: Date): boolean {
    if (!this.workingHoursSettings) {
      return false;
    }

    const { summerStartDate, summerEndDate } = this.workingHoursSettings;

    // Parse MM-DD format
    const [startMonth, startDay] = summerStartDate.split('-').map(Number);
    const [endMonth, endDay] = summerEndDate.split('-').map(Number);

    if (!startMonth || !startDay || !endMonth || !endDay) {
      return false;
    }

    // Use UTC methods to match ISO date string interpretation
    const dateMonth = date.getUTCMonth() + 1; // JS months are 0-indexed
    const dateDay = date.getUTCDate();

    // Create comparable date values (month * 100 + day)
    const dateValue = dateMonth * 100 + dateDay;
    const startValue = startMonth * 100 + startDay;
    const endValue = endMonth * 100 + endDay;

    return dateValue >= startValue && dateValue <= endValue;
  }

  /**
   * Check if it's a regular work day
   */
  private isWorkDay(dayOfWeek: string, isHoliday: boolean): boolean {
    if (isHoliday) {
      return false;
    }

    if (!this.workingHoursSettings?.regularWeekdays) {
      return false;
    }

    return this.workingHoursSettings.regularWeekdays.includes(dayOfWeek);
  }

  /**
   * Check if it's a BMQ training day
   */
  private isBmqTrainingDay(
    date: Date,
    dayOfWeek: string
  ): { isBmqDay: boolean; hours?: { start: string; end: string } } {
    const dateTime = date.getTime();

    for (const course of this.bmqCourses) {
      const courseStart = new Date(course.startDate).getTime();
      const courseEnd = new Date(course.endDate).getTime();

      // Check if date is within course period
      if (dateTime >= courseStart && dateTime <= courseEnd) {
        // Check if it's a training day for this course
        if (course.trainingDays.includes(dayOfWeek)) {
          return {
            isBmqDay: true,
            hours: {
              start: course.trainingStartTime,
              end: course.trainingEndTime,
            },
          };
        }
      }
    }

    return { isBmqDay: false };
  }
}

/**
 * Format a Date object (time column) to HH:MM string
 */
function formatTimeFromDate(time: Date): string {
  const hours = time.getUTCHours().toString().padStart(2, '0');
  const minutes = time.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Singleton instance for reuse
 */
let resolverInstance: ScheduleResolver | null = null;

/**
 * Get or create schedule resolver instance
 */
export async function getScheduleResolver(): Promise<ScheduleResolver> {
  if (!resolverInstance) {
    resolverInstance = new ScheduleResolver();
    await resolverInstance.initialize();
  }
  return resolverInstance;
}

/**
 * Reset resolver (for testing or when settings change)
 */
export function resetScheduleResolver(): void {
  resolverInstance = null;
}
