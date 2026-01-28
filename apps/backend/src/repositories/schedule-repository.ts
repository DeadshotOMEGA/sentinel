import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Duty role entity from database
 */
export interface DutyRoleEntity {
  id: string
  code: string
  name: string
  description: string | null
  roleType: string
  scheduleType: string
  activeDays: number[]
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Duty position entity from database
 */
export interface DutyPositionEntity {
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

/**
 * Duty role with positions
 */
export interface DutyRoleWithPositions extends DutyRoleEntity {
  positions: DutyPositionEntity[]
}

/**
 * Weekly schedule entity from database
 */
export interface WeeklyScheduleEntity {
  id: string
  dutyRoleId: string
  weekStartDate: Date
  status: string
  createdBy: string | null
  publishedAt: Date | null
  publishedBy: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  dutyRole: {
    id: string
    code: string
    name: string
  }
}

/**
 * Schedule assignment entity from database
 */
export interface ScheduleAssignmentEntity {
  id: string
  scheduleId: string
  dutyPositionId: string | null
  memberId: string
  status: string
  confirmedAt: Date | null
  releasedAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }
  dutyPosition: {
    id: string
    code: string
    name: string
  } | null
}

/**
 * Weekly schedule with full details
 */
export interface WeeklyScheduleWithDetails extends WeeklyScheduleEntity {
  assignments: ScheduleAssignmentEntity[]
  createdByAdmin: { id: string; displayName: string } | null
  publishedByAdmin: { id: string; displayName: string } | null
}

/**
 * Input for creating a schedule
 */
export interface CreateScheduleInput {
  dutyRoleId: string
  weekStartDate: Date
  createdBy?: string | null
  notes?: string | null
}

/**
 * Input for creating an assignment
 */
export interface CreateAssignmentInput {
  scheduleId: string
  dutyPositionId?: string | null
  memberId: string
  notes?: string | null
}

/**
 * Input for updating an assignment
 */
export interface UpdateAssignmentInput {
  dutyPositionId?: string | null
  status?: string
  notes?: string | null
}

/**
 * Schedule list filter options
 */
export interface ScheduleListFilter {
  dutyRoleId?: string
  status?: string
  weekStartDate?: Date
  limit?: number
  offset?: number
}

// ============================================================================
// Prisma Include/Select Definitions
// ============================================================================

const dutyRoleInclude = {
  positions: {
    orderBy: { displayOrder: 'asc' } as { displayOrder: 'asc' },
  },
}

const scheduleInclude = {
  dutyRole: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
}

const assignmentInclude = {
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rank: true,
      serviceNumber: true,
    },
  },
  dutyPosition: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
}

/**
 * Get full include object for schedule with all related data
 */
function getScheduleFullInclude() {
  return {
    dutyRole: {
      select: {
        id: true,
        code: true,
        name: true,
      },
    },
    createdByAdmin: {
      select: {
        id: true,
        displayName: true,
      },
    },
    publishedByAdmin: {
      select: {
        id: true,
        displayName: true,
      },
    },
    assignments: {
      include: assignmentInclude,
      orderBy: [
        { dutyPosition: { displayOrder: 'asc' as const } },
        { createdAt: 'asc' as const },
      ],
    },
  }
}

// ============================================================================
// Repository Class
// ============================================================================

/**
 * Repository for managing duty roles and weekly schedules
 */
export class ScheduleRepository {
  private prisma: PrismaClientInstance

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
  }

  // ==========================================================================
  // Duty Roles
  // ==========================================================================

  /**
   * Get all duty roles
   */
  async findAllDutyRoles(): Promise<DutyRoleEntity[]> {
    const roles = await this.prisma.dutyRole.findMany({
      orderBy: { displayOrder: 'asc' },
    })
    return roles
  }

  /**
   * Get a duty role by ID with positions
   */
  async findDutyRoleById(id: string): Promise<DutyRoleWithPositions | null> {
    const role = await this.prisma.dutyRole.findUnique({
      where: { id },
      include: dutyRoleInclude,
    })
    return role
  }

  /**
   * Get a duty role by code
   */
  async findDutyRoleByCode(code: string): Promise<DutyRoleWithPositions | null> {
    const role = await this.prisma.dutyRole.findUnique({
      where: { code },
      include: dutyRoleInclude,
    })
    return role
  }

  /**
   * Get positions for a duty role
   */
  async findPositionsByRoleId(dutyRoleId: string): Promise<DutyPositionEntity[]> {
    const positions = await this.prisma.dutyPosition.findMany({
      where: { dutyRoleId },
      orderBy: { displayOrder: 'asc' },
    })
    return positions
  }

  // ==========================================================================
  // Weekly Schedules
  // ==========================================================================

  /**
   * List schedules with filters
   */
  async findSchedules(filter: ScheduleListFilter = {}): Promise<WeeklyScheduleEntity[]> {
    const where: Record<string, unknown> = {}

    if (filter.dutyRoleId) {
      where.dutyRoleId = filter.dutyRoleId
    }
    if (filter.status) {
      where.status = filter.status
    }
    if (filter.weekStartDate) {
      where.weekStartDate = filter.weekStartDate
    }

    const schedules = await this.prisma.weeklySchedule.findMany({
      where,
      include: scheduleInclude,
      orderBy: { weekStartDate: 'desc' },
      take: filter.limit,
      skip: filter.offset,
    })
    return schedules
  }

  /**
   * Get schedules for a specific week
   */
  async findSchedulesByWeekStart(weekStartDate: Date): Promise<WeeklyScheduleEntity[]> {
    const schedules = await this.prisma.weeklySchedule.findMany({
      where: { weekStartDate },
      include: scheduleInclude,
      orderBy: { dutyRole: { displayOrder: 'asc' } },
    })
    return schedules
  }

  /**
   * Get a schedule by ID with full details
   */
  async findScheduleById(id: string): Promise<WeeklyScheduleWithDetails | null> {
    const schedule = await this.prisma.weeklySchedule.findUnique({
      where: { id },
      include: getScheduleFullInclude(),
    })
    return schedule
  }

  /**
   * Get schedule by duty role and week
   */
  async findScheduleByRoleAndWeek(
    dutyRoleId: string,
    weekStartDate: Date
  ): Promise<WeeklyScheduleWithDetails | null> {
    const schedule = await this.prisma.weeklySchedule.findUnique({
      where: {
        dutyRoleId_weekStartDate: {
          dutyRoleId,
          weekStartDate,
        },
      },
      include: getScheduleFullInclude(),
    })
    return schedule
  }

  /**
   * Create a new schedule
   */
  async createSchedule(input: CreateScheduleInput): Promise<WeeklyScheduleWithDetails> {
    const schedule = await this.prisma.weeklySchedule.create({
      data: {
        dutyRoleId: input.dutyRoleId,
        weekStartDate: input.weekStartDate,
        createdBy: input.createdBy,
        notes: input.notes,
        status: 'draft',
      },
      include: getScheduleFullInclude(),
    })
    return schedule
  }

  /**
   * Update schedule metadata
   */
  async updateSchedule(
    id: string,
    data: { notes?: string | null }
  ): Promise<WeeklyScheduleWithDetails> {
    const schedule = await this.prisma.weeklySchedule.update({
      where: { id },
      data,
      include: getScheduleFullInclude(),
    })
    return schedule
  }

  /**
   * Publish a schedule
   */
  async publishSchedule(id: string, publishedBy?: string): Promise<WeeklyScheduleWithDetails> {
    const schedule = await this.prisma.weeklySchedule.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedBy,
      },
      include: getScheduleFullInclude(),
    })
    return schedule
  }

  /**
   * Archive a schedule
   */
  async archiveSchedule(id: string): Promise<WeeklyScheduleWithDetails> {
    const schedule = await this.prisma.weeklySchedule.update({
      where: { id },
      data: {
        status: 'archived',
      },
      include: getScheduleFullInclude(),
    })
    return schedule
  }

  /**
   * Delete a schedule (only draft schedules)
   */
  async deleteSchedule(id: string): Promise<void> {
    await this.prisma.weeklySchedule.delete({
      where: { id },
    })
  }

  // ==========================================================================
  // Schedule Assignments
  // ==========================================================================

  /**
   * Get an assignment by ID
   */
  async findAssignmentById(id: string): Promise<ScheduleAssignmentEntity | null> {
    const assignment = await this.prisma.scheduleAssignment.findUnique({
      where: { id },
      include: assignmentInclude,
    })
    return assignment
  }

  /**
   * Get assignments for a schedule
   */
  async findAssignmentsByScheduleId(scheduleId: string): Promise<ScheduleAssignmentEntity[]> {
    const assignments = await this.prisma.scheduleAssignment.findMany({
      where: { scheduleId },
      include: assignmentInclude,
      orderBy: [
        { dutyPosition: { displayOrder: 'asc' } },
        { createdAt: 'asc' },
      ],
    })
    return assignments
  }

  /**
   * Create an assignment
   */
  async createAssignment(input: CreateAssignmentInput): Promise<ScheduleAssignmentEntity> {
    const assignment = await this.prisma.scheduleAssignment.create({
      data: {
        scheduleId: input.scheduleId,
        dutyPositionId: input.dutyPositionId,
        memberId: input.memberId,
        notes: input.notes,
        status: 'assigned',
      },
      include: assignmentInclude,
    })
    return assignment
  }

  /**
   * Update an assignment
   */
  async updateAssignment(
    id: string,
    data: UpdateAssignmentInput
  ): Promise<ScheduleAssignmentEntity> {
    const updateData: Record<string, unknown> = {}

    if (data.dutyPositionId !== undefined) {
      updateData.dutyPositionId = data.dutyPositionId
    }
    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === 'confirmed') {
        updateData.confirmedAt = new Date()
      } else if (data.status === 'released') {
        updateData.releasedAt = new Date()
      }
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes
    }

    const assignment = await this.prisma.scheduleAssignment.update({
      where: { id },
      data: updateData,
      include: assignmentInclude,
    })
    return assignment
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(id: string): Promise<void> {
    await this.prisma.scheduleAssignment.delete({
      where: { id },
    })
  }

  /**
   * Check if a member already has an assignment in a schedule
   */
  async memberHasAssignmentInSchedule(scheduleId: string, memberId: string): Promise<boolean> {
    const count = await this.prisma.scheduleAssignment.count({
      where: {
        scheduleId,
        memberId,
      },
    })
    return count > 0
  }

  /**
   * Count active assignments for a position in a schedule
   */
  async countAssignmentsForPosition(scheduleId: string, dutyPositionId: string): Promise<number> {
    return this.prisma.scheduleAssignment.count({
      where: {
        scheduleId,
        dutyPositionId,
        status: { not: 'released' },
      },
    })
  }

  // ==========================================================================
  // DDS Convenience Methods
  // ==========================================================================

  /**
   * Get the DDS assignment for a specific week
   */
  async findDdsAssignmentForWeek(weekStartDate: Date): Promise<{
    schedule: WeeklyScheduleEntity
    assignment: ScheduleAssignmentEntity
  } | null> {
    // Find the DDS role
    const ddsRole = await this.prisma.dutyRole.findUnique({
      where: { code: 'DDS' },
    })

    if (!ddsRole) {
      return null
    }

    // Find the schedule for this week
    const schedule = await this.prisma.weeklySchedule.findUnique({
      where: {
        dutyRoleId_weekStartDate: {
          dutyRoleId: ddsRole.id,
          weekStartDate,
        },
      },
      include: {
        ...scheduleInclude,
        assignments: {
          include: assignmentInclude,
          where: {
            status: { not: 'released' },
          },
          take: 1,
        },
      },
    })

    if (!schedule || schedule.assignments.length === 0) {
      return null
    }

    const assignment = schedule.assignments[0]
    if (!assignment) {
      return null
    }

    return {
      schedule,
      assignment,
    }
  }

  // ==========================================================================
  // Duty Watch Convenience Methods
  // ==========================================================================

  /**
   * Get the Duty Watch team for a specific week
   */
  async findDutyWatchForWeek(weekStartDate: Date): Promise<{
    schedule: WeeklyScheduleEntity
    assignments: ScheduleAssignmentEntity[]
  } | null> {
    // Find the Duty Watch role
    const dutyWatchRole = await this.prisma.dutyRole.findUnique({
      where: { code: 'DUTY_WATCH' },
    })

    if (!dutyWatchRole) {
      return null
    }

    // Find the schedule for this week
    const schedule = await this.prisma.weeklySchedule.findUnique({
      where: {
        dutyRoleId_weekStartDate: {
          dutyRoleId: dutyWatchRole.id,
          weekStartDate,
        },
      },
      include: {
        ...scheduleInclude,
        assignments: {
          include: assignmentInclude,
          where: {
            status: { not: 'released' },
          },
          orderBy: [
            { dutyPosition: { displayOrder: 'asc' } },
            { createdAt: 'asc' },
          ],
        },
      },
    })

    if (!schedule) {
      return null
    }

    return {
      schedule,
      assignments: schedule.assignments,
    }
  }
}
