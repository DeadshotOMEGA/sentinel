import { pool } from '../db/connection';
import type { AttendanceCalculation, ThresholdFlag } from '../../../shared/types/reports';
import { getThresholdFlag } from './attendance-calculator';

interface BMQAttendanceParams {
  memberId: string;
  courseId: string;
  thresholds: {
    warningThreshold: number;
    criticalThreshold: number;
  };
}

/**
 * Get all session dates for a BMQ course based on training days.
 * Now supports multiple training days per week (e.g., Saturday AND Sunday).
 */
export async function getBMQSessions(courseId: string): Promise<Date[]> {
  const courseResult = await pool.query(
    'SELECT start_date, end_date, training_days FROM bmq_courses WHERE id = $1',
    [courseId]
  );

  if (courseResult.rows.length === 0) {
    throw new Error(`BMQ course not found: ${courseId}`);
  }

  const { start_date, end_date, training_days } = courseResult.rows[0];

  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  // Convert training_days array to day numbers
  const targetDays: number[] = (training_days as string[]).map(day => {
    const dayNum = dayMap[day.toLowerCase()];
    if (dayNum === undefined) {
      throw new Error(`Invalid training day: ${day}`);
    }
    return dayNum;
  });

  if (targetDays.length === 0) {
    throw new Error('No valid training days configured');
  }

  const sessions: Date[] = [];
  const current = new Date(start_date);
  const endDate = new Date(end_date);

  // Iterate through all dates in range and collect matching training days
  while (current <= endDate) {
    if (targetDays.includes(current.getDay())) {
      sessions.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return sessions;
}

/**
 * Get check-ins for a member during BMQ session hours on session dates.
 */
export async function getBMQCheckins(
  memberId: string,
  courseId: string,
  sessionDates: Date[]
): Promise<Date[]> {
  if (sessionDates.length === 0) return [];

  // Get course times
  const courseResult = await pool.query(
    'SELECT training_start_time, training_end_time FROM bmq_courses WHERE id = $1',
    [courseId]
  );

  if (courseResult.rows.length === 0) return [];

  const { training_start_time, training_end_time } = courseResult.rows[0];

  const dateConditions = sessionDates.map((date, i) => {
    const dateStr = date.toISOString().split('T')[0];
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
    training_start_time,
    training_end_time,
    ...sessionDates.map(d => d.toISOString().split('T')[0]),
  ];

  const result = await pool.query(query, params);
  return result.rows.map(row => new Date(row.checkin_date));
}

/**
 * Calculate BMQ attendance for a member in a specific course.
 */
export async function calculateBMQAttendance(
  params: BMQAttendanceParams
): Promise<AttendanceCalculation> {
  const { memberId, courseId, thresholds } = params;

  // Verify member is enrolled in course
  const enrollmentResult = await pool.query(
    'SELECT * FROM bmq_enrollments WHERE member_id = $1 AND bmq_course_id = $2',
    [memberId, courseId]
  );

  if (enrollmentResult.rows.length === 0) {
    throw new Error(`Member ${memberId} is not enrolled in course ${courseId}`);
  }

  const sessions = await getBMQSessions(courseId);

  if (sessions.length === 0) {
    return {
      status: 'insufficient_data',
      attended: 0,
      possible: 0,
      display: '0 of 0',
    };
  }

  const attendedSessions = await getBMQCheckins(memberId, courseId, sessions);

  const percentage = (attendedSessions.length / sessions.length) * 100;
  const flag = getThresholdFlag(percentage, thresholds.warningThreshold, thresholds.criticalThreshold);

  return {
    status: 'calculated',
    percentage: Math.round(percentage * 10) / 10,
    attended: attendedSessions.length,
    possible: sessions.length,
    flag,
  };
}
