import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWithinInterval,
  parseISO,
  getDay,
  format,
  addMonths,
} from 'date-fns';
import type { HolidayExclusion, TrainingYear, DayException } from '@shared/types/reports';
import type { ScheduleSettings, WorkingHoursSettings } from '@shared/types/settings';

export type DayType =
  | 'holiday'
  | 'day_off'
  | 'cancelled_training'
  | 'cancelled_admin'
  | 'training'
  | 'admin'
  | 'workday'
  | 'none';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Check if a date falls within any holiday exclusion period
 */
export function isHoliday(date: Date, exclusions: HolidayExclusion[]): boolean {
  return exclusions.some((exclusion) => {
    const start = parseISO(exclusion.start);
    const end = parseISO(exclusion.end);
    return isWithinInterval(date, { start, end });
  });
}

/**
 * Check if a date is within the training year range
 */
export function isInTrainingYear(date: Date, trainingYear: TrainingYear): boolean {
  const start = new Date(trainingYear.startDate);
  const end = new Date(trainingYear.endDate);
  return isWithinInterval(date, { start, end });
}

/**
 * Get the day exception for a specific date, if any
 */
export function getDayException(date: Date, exceptions: DayException[]): DayException | undefined {
  const dateStr = format(date, 'yyyy-MM-dd');
  return exceptions.find((exc) => exc.date === dateStr);
}

/**
 * Get the base day type (what the day would be without exceptions)
 */
export function getBaseDayType(
  date: Date,
  trainingYear: TrainingYear,
  scheduleSettings: ScheduleSettings,
  workingHoursSettings: WorkingHoursSettings
): 'holiday' | 'training' | 'admin' | 'workday' | 'none' {
  if (!isInTrainingYear(date, trainingYear)) {
    return 'none';
  }

  if (isHoliday(date, trainingYear.holidayExclusions)) {
    return 'holiday';
  }

  const dayName = DAY_NAMES[getDay(date)];

  if (dayName === scheduleSettings.trainingNightDay.toLowerCase()) {
    return 'training';
  }

  if (dayName === scheduleSettings.adminNightDay.toLowerCase()) {
    return 'admin';
  }

  const workdays = workingHoursSettings.regularWeekdays.map((d) => d.toLowerCase());
  if (workdays.includes(dayName)) {
    return 'workday';
  }

  return 'none';
}

/**
 * Get the day type for a specific date
 * Priority: holiday > day_off > cancelled > training > admin > workday > none
 */
export function getDayType(
  date: Date,
  trainingYear: TrainingYear,
  scheduleSettings: ScheduleSettings,
  workingHoursSettings: WorkingHoursSettings
): DayType {
  // First check if within training year
  if (!isInTrainingYear(date, trainingYear)) {
    return 'none';
  }

  // Highest priority: holidays
  if (isHoliday(date, trainingYear.holidayExclusions)) {
    return 'holiday';
  }

  // Check for day exceptions
  const exception = getDayException(date, trainingYear.dayExceptions || []);
  if (exception) {
    return exception.type;
  }

  const dayName = DAY_NAMES[getDay(date)];

  // Training night
  if (dayName === scheduleSettings.trainingNightDay.toLowerCase()) {
    return 'training';
  }

  // Admin night
  if (dayName === scheduleSettings.adminNightDay.toLowerCase()) {
    return 'admin';
  }

  // Workday
  const workdays = workingHoursSettings.regularWeekdays.map((d) => d.toLowerCase());
  if (workdays.includes(dayName)) {
    return 'workday';
  }

  return 'none';
}

/**
 * Get color classes for a day type
 */
export function getDayTypeColor(dayType: DayType): { bg: string; text: string; extra?: string } {
  switch (dayType) {
    case 'holiday':
      return { bg: 'bg-danger-200', text: 'text-danger-800' };
    case 'day_off':
      return { bg: 'bg-default-300', text: 'text-default-600', extra: 'line-through' };
    case 'cancelled_training':
      return { bg: 'bg-primary-100', text: 'text-primary-400', extra: 'line-through opacity-60' };
    case 'cancelled_admin':
      return { bg: 'bg-secondary-100', text: 'text-secondary-400', extra: 'line-through opacity-60' };
    case 'training':
      return { bg: 'bg-primary-200', text: 'text-primary-800' };
    case 'admin':
      return { bg: 'bg-secondary-200', text: 'text-secondary-800' };
    case 'workday':
      return { bg: 'bg-success-200', text: 'text-success-800' };
    case 'none':
    default:
      return { bg: '', text: 'text-default-400' };
  }
}

/**
 * Get all months that should be displayed for a training year
 * Returns an array of Date objects representing the first day of each month
 */
export function getMonthsInRange(trainingYear: TrainingYear): Date[] {
  const start = startOfMonth(new Date(trainingYear.startDate));
  const end = endOfMonth(new Date(trainingYear.endDate));

  const months: Date[] = [];
  let current = start;

  while (current <= end) {
    months.push(current);
    current = addMonths(current, 1);
  }

  return months;
}

/**
 * Get all days in a month with their positions (for grid layout)
 */
export function getMonthDays(monthStart: Date): { date: Date; dayOfMonth: number }[] {
  const start = startOfMonth(monthStart);
  const end = endOfMonth(monthStart);

  return eachDayOfInterval({ start, end }).map((date) => ({
    date,
    dayOfMonth: parseInt(format(date, 'd'), 10),
  }));
}

/**
 * Get the starting column position (0-6) for the first day of the month
 */
export function getFirstDayOffset(monthStart: Date): number {
  return getDay(startOfMonth(monthStart));
}
