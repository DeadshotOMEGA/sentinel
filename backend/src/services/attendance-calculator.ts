import { pool } from '../db/connection';
import type {
  AttendanceCalculation,
  TrendIndicator,
  ThresholdFlag,
  HolidayExclusion
} from '../../../shared/types/reports';

interface AttendanceParams {
  memberId: string;
  periodStart: Date;
  periodEnd: Date;
  trainingDay: string;           // e.g., "tuesday"
  trainingStartTime: string;     // e.g., "19:00"
  trainingEndTime: string;       // e.g., "22:10"
  holidayExclusions: HolidayExclusion[];
  thresholds: {
    warningThreshold: number;
    criticalThreshold: number;
  };
  memberHandling: {
    newMemberGracePeriod: number;  // weeks
    minimumTrainingNights: number;
  };
}

/**
 * Get all training nights (specific day of week) within a date range,
 * excluding holiday periods.
 */
export function getTrainingNights(
  startDate: Date,
  endDate: Date,
  trainingDay: string,
  holidayExclusions: HolidayExclusion[]
): Date[] {
  // Map day name to day number (0=Sunday, 1=Monday, etc.)
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDay = dayMap[trainingDay.toLowerCase()];
  if (targetDay === undefined) {
    throw new Error(`Invalid training day: ${trainingDay}`);
  }

  const nights: Date[] = [];
  const current = new Date(startDate);

  // Find first occurrence of training day
  while (current.getDay() !== targetDay && current <= endDate) {
    current.setDate(current.getDate() + 1);
  }

  // Iterate through all training days in range
  while (current <= endDate) {
    // Check if this date falls within any holiday exclusion
    const isHoliday = holidayExclusions.some(exclusion => {
      const exStart = new Date(exclusion.start);
      const exEnd = new Date(exclusion.end);
      return current >= exStart && current <= exEnd;
    });

    if (!isHoliday) {
      nights.push(new Date(current));
    }

    current.setDate(current.getDate() + 7);
  }

  return nights;
}

/**
 * Get check-ins for a member during training night hours on training nights.
 */
export async function getTrainingNightCheckins(
  memberId: string,
  trainingNights: Date[],
  trainingStartTime: string,
  trainingEndTime: string
): Promise<Date[]> {
  if (trainingNights.length === 0) return [];

  // Build query to find check-ins on training nights within training hours
  const dateConditions = trainingNights.map((night, i) => {
    const dateStr = night.toISOString().split('T')[0];
    return `(DATE(c.timestamp AT TIME ZONE 'America/Winnipeg') = $${i + 4}::date)`;
  }).join(' OR ');

  const query = `
    SELECT DISTINCT DATE(c.timestamp AT TIME ZONE 'America/Winnipeg') as checkin_date
    FROM checkins c
    WHERE c.member_id = $1
      AND c.direction = 'in'
      AND (c.timestamp AT TIME ZONE 'America/Winnipeg')::time >= $2::time
      AND (c.timestamp AT TIME ZONE 'America/Winnipeg')::time <= $3::time
      AND (${dateConditions})
    ORDER BY checkin_date
  `;

  const params = [
    memberId,
    trainingStartTime,
    trainingEndTime,
    ...trainingNights.map(n => n.toISOString().split('T')[0]),
  ];

  const result = await pool.query(query, params);
  return result.rows.map(row => new Date(row.checkin_date));
}

/**
 * Get threshold flag based on percentage.
 */
export function getThresholdFlag(
  percentage: number,
  warningThreshold: number,
  criticalThreshold: number
): ThresholdFlag {
  if (percentage >= warningThreshold) return 'none';
  if (percentage >= criticalThreshold) return 'warning';
  return 'critical';
}

/**
 * Calculate training night attendance for a member.
 */
export async function calculateTrainingNightAttendance(
  params: AttendanceParams
): Promise<AttendanceCalculation> {
  const {
    memberId,
    periodStart,
    periodEnd,
    trainingDay,
    trainingStartTime,
    trainingEndTime,
    holidayExclusions,
    thresholds,
    memberHandling,
  } = params;

  // Get member enrollment date
  const memberResult = await pool.query(
    'SELECT created_at FROM members WHERE id = $1',
    [memberId]
  );

  if (memberResult.rows.length === 0) {
    throw new Error(`Member not found: ${memberId}`);
  }

  const enrollmentDate = new Date(memberResult.rows[0].created_at);

  // Check if member is within grace period
  const gracePeriodEnd = new Date(enrollmentDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (memberHandling.newMemberGracePeriod * 7));

  if (new Date() < gracePeriodEnd) {
    return {
      status: 'new',
      badge: 'New',
    };
  }

  // Effective start is later of period start or enrollment date
  const effectiveStart = enrollmentDate > periodStart ? enrollmentDate : periodStart;

  // Get all training nights in the effective period
  const possibleNights = getTrainingNights(
    effectiveStart,
    periodEnd,
    trainingDay,
    holidayExclusions
  );

  // Check minimum training nights requirement
  if (possibleNights.length < memberHandling.minimumTrainingNights) {
    const attendedNights = await getTrainingNightCheckins(
      memberId,
      possibleNights,
      trainingStartTime,
      trainingEndTime
    );

    return {
      status: 'insufficient_data',
      attended: attendedNights.length,
      possible: possibleNights.length,
      display: `${attendedNights.length} of ${possibleNights.length}`,
    };
  }

  // Calculate attendance
  const attendedNights = await getTrainingNightCheckins(
    memberId,
    possibleNights,
    trainingStartTime,
    trainingEndTime
  );

  const percentage = (attendedNights.length / possibleNights.length) * 100;
  const flag = getThresholdFlag(percentage, thresholds.warningThreshold, thresholds.criticalThreshold);

  return {
    status: 'calculated',
    percentage: Math.round(percentage * 10) / 10,
    attended: attendedNights.length,
    possible: possibleNights.length,
    flag,
  };
}

/**
 * Calculate attendance trend by comparing current period to previous period.
 */
export async function calculateTrend(
  memberId: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  params: Omit<AttendanceParams, 'memberId' | 'periodStart' | 'periodEnd'>
): Promise<TrendIndicator> {
  // Calculate previous period (same length, just before current)
  const periodLength = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
  const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);
  const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);

  const currentAttendance = await calculateTrainingNightAttendance({
    memberId,
    periodStart: currentPeriodStart,
    periodEnd: currentPeriodEnd,
    ...params,
  });

  const previousAttendance = await calculateTrainingNightAttendance({
    memberId,
    periodStart: previousPeriodStart,
    periodEnd: previousPeriodEnd,
    ...params,
  });

  // Can only calculate trend if both periods have calculated percentages
  if (currentAttendance.status !== 'calculated' || previousAttendance.status !== 'calculated') {
    return { trend: 'none' };
  }

  const delta = (currentAttendance.percentage ?? 0) - (previousAttendance.percentage ?? 0);

  if (delta > 2) return { trend: 'up', delta: Math.round(delta) };
  if (delta < -2) return { trend: 'down', delta: Math.round(delta) };
  return { trend: 'stable', delta: Math.round(delta) };
}
