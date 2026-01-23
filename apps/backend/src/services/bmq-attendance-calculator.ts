// TODO Phase 3: Implement BMQ attendance calculation with Kysely or raw SQL
// This service requires raw SQL queries for performance and was using PostgreSQL pool directly
// Current implementation is stubbed until database query layer is finalized

interface AttendanceCalculation {
  status: 'calculated' | 'insufficient_data'
  percentage?: number
  attended: number
  possible: number
  flag?: 'none' | 'warning' | 'critical'
  display?: string
}

interface BMQAttendanceParams {
  memberId: string
  courseId: string
  thresholds: {
    warningThreshold: number
    criticalThreshold: number
  }
}

/**
 * Get all session dates for a BMQ course
 * TODO Phase 3: Implement with raw SQL or Kysely queries
 */
export async function getBMQSessions(_courseId: string): Promise<Date[]> {
  throw new Error('BMQ sessions query not yet implemented (Phase 3)')
}

/**
 * Get check-ins for BMQ sessions
 * TODO Phase 3: Implement with raw SQL or Kysely queries
 */
export async function getBMQCheckins(
  _memberId: string,
  _courseId: string,
  _sessionDates: Date[]
): Promise<Date[]> {
  throw new Error('BMQ checkins query not yet implemented (Phase 3)')
}

/**
 * Calculate BMQ attendance for a member
 * TODO Phase 3: Implement with raw SQL or Kysely queries
 */
export async function calculateBMQAttendance(
  _params: BMQAttendanceParams
): Promise<AttendanceCalculation> {
  throw new Error('BMQ attendance calculation not yet implemented (Phase 3)')
}
