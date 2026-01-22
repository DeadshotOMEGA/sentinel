// TODO Phase 3: Implement attendance calculation with Kysely or raw SQL
// This service requires raw SQL queries for performance and was using PostgreSQL pool directly
// Current implementation is stubbed until database query layer is finalized

interface AttendanceCalculation {
  status: 'calculated' | 'new' | 'insufficient_data'
  percentage?: number
  attended?: number
  possible?: number
  flag?: 'none' | 'warning' | 'critical'
  badge?: string
  display?: string
}

interface TrendIndicator {
  trend: 'up' | 'down' | 'stable' | 'none'
  delta?: number
}

interface ThresholdFlag {
  type: 'none' | 'warning' | 'critical'
}

interface HolidayExclusion {
  start: Date
  end: Date
  name: string
}

interface AttendanceParams {
  memberId: string
  periodStart: Date
  periodEnd: Date
  trainingDay: string
  trainingStartTime: string
  trainingEndTime: string
  holidayExclusions: HolidayExclusion[]
  thresholds: {
    warningThreshold: number
    criticalThreshold: number
  }
  memberHandling: {
    newMemberGracePeriod: number
    minimumTrainingNights: number
  }
}

/**
 * Get threshold flag based on percentage
 */
export function getThresholdFlag(
  percentage: number,
  warningThreshold: number,
  criticalThreshold: number
): 'none' | 'warning' | 'critical' {
  if (percentage >= warningThreshold) return 'none'
  if (percentage >= criticalThreshold) return 'warning'
  return 'critical'
}

/**
 * Get all training nights within a date range, excluding holidays
 */
export function getTrainingNights(
  startDate: Date,
  endDate: Date,
  trainingDay: string,
  holidayExclusions: HolidayExclusion[]
): Date[] {
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  const targetDay = dayMap[trainingDay.toLowerCase()]
  if (targetDay === undefined) {
    throw new Error(`Invalid training day: ${trainingDay}`)
  }

  const nights: Date[] = []
  const current = new Date(startDate)

  while (current.getUTCDay() !== targetDay && current <= endDate) {
    current.setUTCDate(current.getUTCDate() + 1)
  }

  while (current <= endDate) {
    const isHoliday = holidayExclusions.some((exclusion) => {
      const exStart = new Date(exclusion.start)
      const exEnd = new Date(exclusion.end)
      return current >= exStart && current <= exEnd
    })

    if (!isHoliday) {
      nights.push(new Date(current))
    }

    current.setUTCDate(current.getUTCDate() + 7)
  }

  return nights
}

/**
 * Calculate training night attendance for a member
 * TODO Phase 3: Implement with raw SQL or Kysely queries
 */
export async function calculateTrainingNightAttendance(
  params: AttendanceParams
): Promise<AttendanceCalculation> {
  throw new Error('Training night attendance calculation not yet implemented (Phase 3)')
}

/**
 * Calculate attendance trend
 * TODO Phase 3: Implement with raw SQL or Kysely queries
 */
export async function calculateTrend(
  memberId: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  params: Omit<AttendanceParams, 'memberId' | 'periodStart' | 'periodEnd'>
): Promise<TrendIndicator> {
  throw new Error('Attendance trend calculation not yet implemented (Phase 3)')
}

/**
 * Get check-ins for training nights
 * TODO Phase 3: Implement with raw SQL or Kysely queries
 */
export async function getTrainingNightCheckins(
  memberId: string,
  trainingNights: Date[],
  trainingStartTime: string,
  trainingEndTime: string
): Promise<Date[]> {
  throw new Error('Training night checkins query not yet implemented (Phase 3)')
}
