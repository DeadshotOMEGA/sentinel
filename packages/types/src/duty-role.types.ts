/**
 * Duty Role & Schedule Types
 *
 * Types for managing duty roles (DDS, Duty Watch) and their weekly schedules.
 */

// ============================================================================
// Duty Role (Reference Table)
// ============================================================================

export type DutyRoleType = 'single' | 'team'
export type ScheduleType = 'weekly'
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7 // 1=Mon, 7=Sun

export interface DutyRole {
  id: string
  code: string
  name: string
  description: string | null
  roleType: DutyRoleType
  scheduleType: ScheduleType
  activeDays: number[] // 1-7 representing Mon-Sun
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export type DutyRoleCode = 'DDS' | 'DUTY_WATCH'

export interface DutyRoleWithPositions extends DutyRole {
  positions: DutyPosition[]
}

// ============================================================================
// Duty Position (Team Roles)
// ============================================================================

export interface DutyPosition {
  id: string
  dutyRoleId: string
  code: string
  name: string
  description: string | null
  maxSlots: number
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export type DutyPositionCode = 'SWK' | 'DSWK' | 'QM' | 'BM' | 'APS'

export interface DutyPositionWithRole extends DutyPosition {
  dutyRole: DutyRole
}

// ============================================================================
// Weekly Schedule
// ============================================================================

export type ScheduleStatus = 'draft' | 'published' | 'active' | 'archived'

export interface WeeklySchedule {
  id: string
  dutyRoleId: string
  weekStartDate: Date // Always a Monday
  status: ScheduleStatus
  createdBy: string | null
  publishedAt: Date | null
  publishedBy: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WeeklyScheduleWithRole extends WeeklySchedule {
  dutyRole: DutyRole
}

export interface WeeklyScheduleWithAssignments extends WeeklyScheduleWithRole {
  assignments: ScheduleAssignmentWithDetails[]
}

export interface CreateWeeklyScheduleInput {
  dutyRoleId: string
  weekStartDate: Date
  createdBy?: string | null
  notes?: string | null
}

export interface UpdateWeeklyScheduleInput {
  notes?: string | null
}

// ============================================================================
// Schedule Assignment
// ============================================================================

export type AssignmentStatus = 'assigned' | 'confirmed' | 'released'

export interface ScheduleAssignment {
  id: string
  scheduleId: string
  dutyPositionId: string | null // null for single-person roles like DDS
  memberId: string
  status: AssignmentStatus
  confirmedAt: Date | null
  releasedAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ScheduleAssignmentWithMember extends ScheduleAssignment {
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }
}

export interface ScheduleAssignmentWithDetails extends ScheduleAssignmentWithMember {
  dutyPosition: DutyPosition | null
  schedule?: WeeklySchedule
}

export interface CreateScheduleAssignmentInput {
  scheduleId: string
  dutyPositionId?: string | null
  memberId: string
  notes?: string | null
}

export interface UpdateScheduleAssignmentInput {
  status?: AssignmentStatus
  notes?: string | null
}

// ============================================================================
// Convenience Types for DDS and Duty Watch
// ============================================================================

export interface CurrentDds {
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }
  schedule: WeeklySchedule
  holdsLockup: boolean
}

export interface DutyWatchTeam {
  schedule: WeeklySchedule
  positions: Array<{
    position: DutyPosition
    assignments: ScheduleAssignmentWithMember[]
  }>
  isActiveTonight: boolean // true if today is Tue or Thu
}

export interface DutyWatchMemberStatus {
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
  }
  position: DutyPosition
  isCheckedIn: boolean
  hasLockup: boolean
}
