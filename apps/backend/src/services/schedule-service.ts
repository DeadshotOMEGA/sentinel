import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import {
  ScheduleRepository,
  type DutyRoleEntity,
  type DutyRoleWithPositions,
  type DutyPositionEntity,
  type WeeklyScheduleEntity,
  type WeeklyScheduleWithDetails,
  type ScheduleAssignmentEntity,
  type ScheduleListFilter,
} from '../repositories/schedule-repository.js'
import { PresenceService } from './presence-service.js'
import {
  getOperationalWeek,
  getOperationalDateISO,
  isDutyWatchNight,
} from '../utils/operational-date.js'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js'
import {
  broadcastScheduleUpdate,
  broadcastScheduleAssignmentUpdate,
} from '../websocket/broadcast.js'

// ============================================================================
// Service Types
// ============================================================================

/**
 * Current DDS from schedule
 */
export interface CurrentDdsFromSchedule {
  scheduleId: string
  assignmentId: string
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }
  weekStartDate: string
  status: 'assigned' | 'confirmed' | 'released'
}

/**
 * Duty Watch team member with presence info
 */
export interface DutyWatchTeamMember {
  assignmentId: string
  position: {
    id: string
    code: string
    name: string
  } | null
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }
  status: 'assigned' | 'confirmed' | 'released'
  isCheckedIn: boolean
}

/**
 * Duty Watch team result
 */
export interface DutyWatchTeamResult {
  scheduleId: string | null
  weekStartDate: string | null
  operationalDate: string
  isDutyWatchNight: boolean
  team: DutyWatchTeamMember[]
}

// ============================================================================
// Service Class
// ============================================================================

/**
 * Service for managing duty schedules
 */
export class ScheduleService {
  private repository: ScheduleRepository
  private presenceService: PresenceService

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.repository = new ScheduleRepository(prisma)
    this.presenceService = new PresenceService(prisma)
  }

  // ==========================================================================
  // Duty Roles
  // ==========================================================================

  /**
   * Get all duty roles
   */
  async getAllDutyRoles(): Promise<DutyRoleEntity[]> {
    return this.repository.findAllDutyRoles()
  }

  /**
   * Get a duty role with positions
   */
  async getDutyRole(id: string): Promise<DutyRoleWithPositions> {
    const role = await this.repository.findDutyRoleById(id)
    if (!role) {
      throw new NotFoundError('Duty Role', id)
    }
    return role
  }

  /**
   * Get positions for a duty role
   */
  async getDutyRolePositions(dutyRoleId: string): Promise<DutyPositionEntity[]> {
    const role = await this.repository.findDutyRoleById(dutyRoleId)
    if (!role) {
      throw new NotFoundError('Duty Role', dutyRoleId)
    }
    return this.repository.findPositionsByRoleId(dutyRoleId)
  }

  // ==========================================================================
  // Weekly Schedules
  // ==========================================================================

  /**
   * List schedules with filters
   */
  async listSchedules(filter: ScheduleListFilter = {}): Promise<WeeklyScheduleEntity[]> {
    return this.repository.findSchedules(filter)
  }

  /**
   * Get schedules for the current operational week
   */
  async getCurrentSchedules(): Promise<WeeklyScheduleEntity[]> {
    const { start } = getOperationalWeek()
    return this.repository.findSchedulesByWeekStart(start)
  }

  /**
   * Get schedules for a specific week
   */
  async getSchedulesByWeek(date: Date): Promise<WeeklyScheduleEntity[]> {
    // Use ensureMonday instead of getOperationalWeek to avoid the 3 AM
    // day-shift logic. The input is an explicit date (e.g. "2026-01-26"),
    // not a live timestamp, so the operational-date adjustment would
    // incorrectly shift midnight dates back one day.
    const weekStart = this.ensureMonday(date)
    return this.repository.findSchedulesByWeekStart(weekStart)
  }

  /**
   * Get a schedule with full details
   */
  async getSchedule(id: string): Promise<WeeklyScheduleWithDetails> {
    const schedule = await this.repository.findScheduleById(id)
    if (!schedule) {
      throw new NotFoundError('Schedule', id)
    }
    return schedule
  }

  /**
   * Create a new schedule
   */
  async createSchedule(
    dutyRoleId: string,
    weekStartDate: Date,
    createdBy?: string,
    notes?: string
  ): Promise<WeeklyScheduleWithDetails> {
    // Verify duty role exists
    const role = await this.repository.findDutyRoleById(dutyRoleId)
    if (!role) {
      throw new NotFoundError('Duty Role', dutyRoleId)
    }

    // Ensure weekStartDate is a Monday
    const adjustedDate = this.ensureMonday(weekStartDate)

    // Check if schedule already exists
    const existing = await this.repository.findScheduleByRoleAndWeek(dutyRoleId, adjustedDate)
    if (existing) {
      throw new ConflictError(
        `Schedule already exists for ${role.name} on week starting ${adjustedDate.toISOString().substring(0, 10)}`
      )
    }

    const schedule = await this.repository.createSchedule({
      dutyRoleId,
      weekStartDate: adjustedDate,
      createdBy,
      notes,
    })

    // Broadcast schedule creation
    broadcastScheduleUpdate({
      action: 'created',
      scheduleId: schedule.id,
      dutyRoleCode: schedule.dutyRole.code,
      weekStartDate: schedule.weekStartDate.toISOString().substring(0, 10),
      status: schedule.status,
      timestamp: new Date().toISOString(),
    })

    return schedule
  }

  /**
   * Update schedule metadata
   */
  async updateSchedule(id: string, notes?: string | null): Promise<WeeklyScheduleWithDetails> {
    const schedule = await this.repository.findScheduleById(id)
    if (!schedule) {
      throw new NotFoundError('Schedule', id)
    }

    const updated = await this.repository.updateSchedule(id, { notes })

    broadcastScheduleUpdate({
      action: 'updated',
      scheduleId: updated.id,
      dutyRoleCode: updated.dutyRole.code,
      weekStartDate: updated.weekStartDate.toISOString().substring(0, 10),
      status: updated.status,
      timestamp: new Date().toISOString(),
    })

    return updated
  }

  /**
   * Publish a draft schedule
   */
  async publishSchedule(id: string, publishedBy?: string): Promise<WeeklyScheduleWithDetails> {
    const schedule = await this.repository.findScheduleById(id)
    if (!schedule) {
      throw new NotFoundError('Schedule', id)
    }

    if (schedule.status !== 'draft') {
      throw new ValidationError(`Cannot publish schedule with status '${schedule.status}'`)
    }

    const published = await this.repository.publishSchedule(id, publishedBy)

    broadcastScheduleUpdate({
      action: 'published',
      scheduleId: published.id,
      dutyRoleCode: published.dutyRole.code,
      weekStartDate: published.weekStartDate.toISOString().substring(0, 10),
      status: published.status,
      timestamp: new Date().toISOString(),
    })

    return published
  }

  /**
   * Delete a draft schedule
   */
  async deleteSchedule(id: string): Promise<void> {
    const schedule = await this.repository.findScheduleById(id)
    if (!schedule) {
      throw new NotFoundError('Schedule', id)
    }

    if (schedule.status !== 'draft') {
      throw new ValidationError(`Cannot delete schedule with status '${schedule.status}'`)
    }

    await this.repository.deleteSchedule(id)

    broadcastScheduleUpdate({
      action: 'deleted',
      scheduleId: id,
      dutyRoleCode: schedule.dutyRole.code,
      weekStartDate: schedule.weekStartDate.toISOString().substring(0, 10),
      status: 'deleted',
      timestamp: new Date().toISOString(),
    })
  }

  // ==========================================================================
  // Schedule Assignments
  // ==========================================================================

  /**
   * Create an assignment
   */
  async createAssignment(
    scheduleId: string,
    memberId: string,
    dutyPositionId?: string | null,
    notes?: string | null
  ): Promise<ScheduleAssignmentEntity> {
    const schedule = await this.repository.findScheduleById(scheduleId)
    if (!schedule) {
      throw new NotFoundError('Schedule', scheduleId)
    }

    // Check if schedule is still editable
    if (schedule.status !== 'draft' && schedule.status !== 'published') {
      throw new ValidationError(`Cannot add assignments to schedule with status '${schedule.status}'`)
    }

    // Check if member already assigned
    const alreadyAssigned = await this.repository.memberHasAssignmentInSchedule(scheduleId, memberId)
    if (alreadyAssigned) {
      throw new ConflictError('Member is already assigned to this schedule')
    }

    // If position specified, validate max slots
    if (dutyPositionId) {
      const role = await this.repository.findDutyRoleById(schedule.dutyRoleId)
      const position = role?.positions.find((p) => p.id === dutyPositionId)
      if (!position) {
        throw new NotFoundError('Duty Position', dutyPositionId)
      }

      const currentCount = await this.repository.countAssignmentsForPosition(
        scheduleId,
        dutyPositionId
      )
      if (currentCount >= position.maxSlots) {
        throw new ConflictError(
          `Position '${position.name}' is full (max ${position.maxSlots} slots)`
        )
      }
    }

    const assignment = await this.repository.createAssignment({
      scheduleId,
      dutyPositionId,
      memberId,
      notes,
    })

    broadcastScheduleAssignmentUpdate({
      action: 'created',
      scheduleId,
      assignmentId: assignment.id,
      memberId: assignment.memberId,
      memberName: `${assignment.member.firstName} ${assignment.member.lastName}`,
      positionCode: assignment.dutyPosition?.code ?? null,
      timestamp: new Date().toISOString(),
    })

    return assignment
  }

  /**
   * Update an assignment
   */
  async updateAssignment(
    scheduleId: string,
    assignmentId: string,
    data: { dutyPositionId?: string | null; status?: string; notes?: string | null }
  ): Promise<ScheduleAssignmentEntity> {
    const schedule = await this.repository.findScheduleById(scheduleId)
    if (!schedule) {
      throw new NotFoundError('Schedule', scheduleId)
    }

    const assignment = await this.repository.findAssignmentById(assignmentId)
    if (!assignment || assignment.scheduleId !== scheduleId) {
      throw new NotFoundError('Assignment', assignmentId)
    }

    const updated = await this.repository.updateAssignment(assignmentId, data)

    broadcastScheduleAssignmentUpdate({
      action: 'updated',
      scheduleId,
      assignmentId: updated.id,
      memberId: updated.memberId,
      memberName: `${updated.member.firstName} ${updated.member.lastName}`,
      positionCode: updated.dutyPosition?.code ?? null,
      timestamp: new Date().toISOString(),
    })

    return updated
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(scheduleId: string, assignmentId: string): Promise<void> {
    const schedule = await this.repository.findScheduleById(scheduleId)
    if (!schedule) {
      throw new NotFoundError('Schedule', scheduleId)
    }

    const assignment = await this.repository.findAssignmentById(assignmentId)
    if (!assignment || assignment.scheduleId !== scheduleId) {
      throw new NotFoundError('Assignment', assignmentId)
    }

    // Only allow deletion from draft schedules
    if (schedule.status !== 'draft') {
      throw new ValidationError(
        `Cannot delete assignments from schedule with status '${schedule.status}'`
      )
    }

    await this.repository.deleteAssignment(assignmentId)

    broadcastScheduleAssignmentUpdate({
      action: 'deleted',
      scheduleId,
      assignmentId,
      memberId: assignment.memberId,
      memberName: `${assignment.member.firstName} ${assignment.member.lastName}`,
      positionCode: assignment.dutyPosition?.code ?? null,
      timestamp: new Date().toISOString(),
    })
  }

  // ==========================================================================
  // DDS Convenience Methods
  // ==========================================================================

  /**
   * Get current DDS from the weekly schedule
   */
  async getCurrentDdsFromSchedule(): Promise<{
    dds: CurrentDdsFromSchedule | null
    operationalDate: string
  }> {
    const operationalDate = getOperationalDateISO()
    const { start } = getOperationalWeek()

    const result = await this.repository.findDdsAssignmentForWeek(start)

    if (!result) {
      return { dds: null, operationalDate }
    }

    return {
      dds: {
        scheduleId: result.schedule.id,
        assignmentId: result.assignment.id,
        member: result.assignment.member,
        weekStartDate: result.schedule.weekStartDate.toISOString().substring(0, 10),
        status: result.assignment.status as 'assigned' | 'confirmed' | 'released',
      },
      operationalDate,
    }
  }

  /**
   * Get DDS for a specific week
   */
  async getDdsByWeek(date: Date): Promise<{
    dds: CurrentDdsFromSchedule | null
    operationalDate: string
  }> {
    const start = this.ensureMonday(date)
    const operationalDate = getOperationalDateISO(date)

    const result = await this.repository.findDdsAssignmentForWeek(start)

    if (!result) {
      return { dds: null, operationalDate }
    }

    return {
      dds: {
        scheduleId: result.schedule.id,
        assignmentId: result.assignment.id,
        member: result.assignment.member,
        weekStartDate: result.schedule.weekStartDate.toISOString().substring(0, 10),
        status: result.assignment.status as 'assigned' | 'confirmed' | 'released',
      },
      operationalDate,
    }
  }

  // ==========================================================================
  // Duty Watch Convenience Methods
  // ==========================================================================

  /**
   * Get the current Duty Watch team
   */
  async getCurrentDutyWatch(): Promise<DutyWatchTeamResult> {
    const operationalDate = getOperationalDateISO()
    const { start } = getOperationalWeek()
    const isDWNight = isDutyWatchNight()

    const result = await this.repository.findDutyWatchForWeek(start)

    if (!result) {
      return {
        scheduleId: null,
        weekStartDate: null,
        operationalDate,
        isDutyWatchNight: isDWNight,
        team: [],
      }
    }

    // Get presence info for team members
    const presentMembers = await this.presenceService.getPresentMembers()
    const presentMemberIds = new Set(presentMembers.map((m) => m.id))

    const team: DutyWatchTeamMember[] = result.assignments.map((a) => ({
      assignmentId: a.id,
      position: a.dutyPosition,
      member: a.member,
      status: a.status as 'assigned' | 'confirmed' | 'released',
      isCheckedIn: presentMemberIds.has(a.memberId),
    }))

    return {
      scheduleId: result.schedule.id,
      weekStartDate: result.schedule.weekStartDate.toISOString().substring(0, 10),
      operationalDate,
      isDutyWatchNight: isDWNight,
      team,
    }
  }

  /**
   * Get tonight's Duty Watch team (only meaningful on Tue/Thu)
   */
  async getTonightDutyWatch(): Promise<DutyWatchTeamResult> {
    return this.getCurrentDutyWatch()
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Ensure a date is a Monday (adjusts to the Monday of that week)
   */
  private ensureMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    // Sunday = 0, Monday = 1, ..., Saturday = 6
    // If not Monday, adjust to previous Monday
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }
}
