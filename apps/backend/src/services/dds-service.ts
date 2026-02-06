import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { Prisma } from '@sentinel/database'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js'
import { LockupService } from './lockup-service.js'
import { ScheduleService } from './schedule-service.js'
import { StatHolidayService } from './stat-holiday-service.js'

import { broadcastDdsUpdate } from '../websocket/broadcast.js'
import { serviceLogger } from '../lib/logger.js'

interface DdsAssignmentWithMember {
  id: string
  memberId: string
  assignedDate: Date
  acceptedAt: Date | null
  releasedAt: Date | null
  transferredTo: string | null
  assignedBy: string | null
  status: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    division: string | null
  }
  assignedByAdminName: string | null
}

interface ResponsibilityAuditLogEntry {
  id: string
  memberId: string
  tagName: string
  action: string
  fromMemberId: string | null
  toMemberId: string | null
  performedBy: string | null
  performedByType: string
  timestamp: Date
  notes: string | null
}

/**
 * Get today's date at midnight in local timezone
 */
function getTodayDate(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const memberInclude = {
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rank: true,
      division: {
        select: {
          name: true,
        },
      },
    },
  },
  assignedByAdmin: {
    select: {
      fullName: true,
    },
  },
} as const

export class DdsService {
  private prisma: PrismaClient
  private lockupService: LockupService
  private scheduleService: ScheduleService
  private statHolidayService: StatHolidayService

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient()
    this.lockupService = new LockupService(this.prisma)
    this.scheduleService = new ScheduleService(this.prisma)
    this.statHolidayService = new StatHolidayService(this.prisma)
  }

  private transformAssignment(
    dbResult: Prisma.DdsAssignmentGetPayload<{ include: typeof memberInclude }>
  ): DdsAssignmentWithMember {
    return {
      id: dbResult.id,
      memberId: dbResult.memberId,
      assignedDate: dbResult.assignedDate,
      acceptedAt: dbResult.acceptedAt,
      releasedAt: dbResult.releasedAt,
      transferredTo: dbResult.transferredTo,
      assignedBy: dbResult.assignedBy,
      status: dbResult.status,
      notes: dbResult.notes,
      createdAt: dbResult.createdAt,
      updatedAt: dbResult.updatedAt,
      member: {
        id: dbResult.member.id,
        firstName: dbResult.member.firstName,
        lastName: dbResult.member.lastName,
        rank: dbResult.member.rank,
        division: dbResult.member.division?.name ?? null,
      },
      assignedByAdminName: dbResult.assignedByAdmin?.fullName ?? null,
    }
  }

  /**
   * Get today's active DDS assignment with member details
   */
  async getCurrentDds(): Promise<DdsAssignmentWithMember | null> {
    const today = getTodayDate()

    const assignment = await this.prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
      include: memberInclude,
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (assignment) {
      return this.transformAssignment(assignment)
    }

    // Fall back to published weekly schedule
    const { dds } = await this.scheduleService.getCurrentDdsFromSchedule()

    if (!dds || dds.status === 'released') {
      return null
    }

    return {
      id: dds.assignmentId,
      memberId: dds.member.id,
      assignedDate: today,
      acceptedAt: null,
      releasedAt: null,
      transferredTo: null,
      assignedBy: null,
      status: dds.status === 'confirmed' ? 'active' : 'pending',
      notes: null,
      createdAt: today,
      updatedAt: today,
      member: {
        id: dds.member.id,
        firstName: dds.member.firstName,
        lastName: dds.member.lastName,
        rank: dds.member.rank,
        division: null,
      },
      assignedByAdminName: null,
    }
  }

  /**
   * Member self-accepts DDS at kiosk (first check-in of day)
   */
  async acceptDds(memberId: string): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate()

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    const existingDds = await this.prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
    })

    if (existingDds && existingDds.status === 'active') {
      throw new ConflictError('A DDS has already been accepted for today')
    }

    // If a pending assignment exists for this member, activate it instead of creating a new one
    let assignment
    if (existingDds && existingDds.memberId === memberId && existingDds.status === 'pending') {
      assignment = await this.prisma.ddsAssignment.update({
        where: { id: existingDds.id },
        data: {
          acceptedAt: new Date(),
          status: 'active',
        },
        include: memberInclude,
      })
    } else if (existingDds) {
      // Pending assignment for a different member
      throw new ConflictError('A DDS has already been assigned for today')
    } else {
      assignment = await this.prisma.ddsAssignment.create({
        data: {
          memberId,
          assignedDate: today,
          acceptedAt: new Date(),
          status: 'active',
        },
        include: memberInclude,
      })
    }

    await this.prisma.responsibilityAuditLog.create({
      data: {
        memberId,
        tagName: 'DDS',
        action: 'self_accepted',
        performedBy: memberId,
        performedByType: 'member',
      },
    })

    // Auto-assign lockup responsibility to new DDS holder
    try {
      const lockupStatus = await this.lockupService.getCurrentStatus()
      if (lockupStatus.currentHolderId) {
        // Transfer from current holder to DDS
        await this.lockupService.transferLockup(
          memberId,
          'dds_handoff',
          'Auto-transferred on DDS acceptance'
        )
      } else {
        // No one holds lockup — DDS acquires it directly
        await this.lockupService.acquireLockup(
          memberId,
          'Auto-acquired on DDS acceptance'
        )
      }
    } catch (error) {
      serviceLogger.error('Failed to auto-assign lockup on DDS acceptance', { memberId, error: error instanceof Error ? error.message : String(error) })
    }

    const result = this.transformAssignment(assignment)

    // Broadcast DDS update
    broadcastDdsUpdate({
      action: 'accepted',
      assignment: {
        id: result.id,
        memberId: result.memberId,
        memberName: `${result.member.rank} ${result.member.lastName} ${result.member.firstName.charAt(0)}.`,
        rank: result.member.rank,
        status: result.status,
      },
      timestamp: new Date().toISOString(),
    })

    return result
  }

  /**
   * Admin assigns DDS to a member
   */
  async assignDds(
    memberId: string,
    adminId: string,
    notes?: string
  ): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate()

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    const existingDds = await this.prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
    })

    if (existingDds) {
      throw new ConflictError('A DDS has already been assigned for today')
    }

    const assignment = await this.prisma.ddsAssignment.create({
      data: {
        memberId,
        assignedDate: today,
        acceptedAt: new Date(),
        assignedBy: adminId,
        status: 'active',
        notes: notes ?? null,
      },
      include: memberInclude,
    })

    await this.prisma.responsibilityAuditLog.create({
      data: {
        memberId,
        tagName: 'DDS',
        action: 'assigned',
        toMemberId: memberId,
        performedBy: adminId,
        performedByType: 'admin',
        notes: notes ?? null,
      },
    })

    const result = this.transformAssignment(assignment)

    // Broadcast DDS update
    broadcastDdsUpdate({
      action: 'assigned',
      assignment: {
        id: result.id,
        memberId: result.memberId,
        memberName: `${result.member.rank} ${result.member.lastName} ${result.member.firstName.charAt(0)}.`,
        rank: result.member.rank,
        status: result.status,
      },
      timestamp: new Date().toISOString(),
    })

    return result
  }

  /**
   * Admin transfers DDS from current holder to another member
   */
  async transferDds(
    toMemberId: string,
    adminId: string,
    notes?: string
  ): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate()

    const targetMember = await this.prisma.member.findUnique({
      where: { id: toMemberId },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!targetMember) {
      throw new NotFoundError('Member', toMemberId)
    }

    const currentDds = await this.prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
    })

    if (!currentDds) {
      throw new NotFoundError('DDS Assignment', 'today')
    }

    if (currentDds.memberId === toMemberId) {
      throw new ValidationError('Cannot transfer DDS to the same member')
    }

    const [, newAssignment] = await this.prisma.$transaction([
      this.prisma.ddsAssignment.update({
        where: { id: currentDds.id },
        data: {
          status: 'transferred',
          transferredTo: toMemberId,
          releasedAt: new Date(),
        },
      }),
      this.prisma.ddsAssignment.create({
        data: {
          memberId: toMemberId,
          assignedDate: today,
          acceptedAt: new Date(),
          assignedBy: adminId,
          status: 'active',
          notes: notes ?? null,
        },
        include: memberInclude,
      }),
    ])

    await this.prisma.responsibilityAuditLog.create({
      data: {
        memberId: toMemberId,
        tagName: 'DDS',
        action: 'transferred',
        fromMemberId: currentDds.memberId,
        toMemberId: toMemberId,
        performedBy: adminId,
        performedByType: 'admin',
        notes: notes ?? null,
      },
    })

    const result = this.transformAssignment(newAssignment)

    // Broadcast DDS update
    broadcastDdsUpdate({
      action: 'transferred',
      assignment: {
        id: result.id,
        memberId: result.memberId,
        memberName: `${result.member.rank} ${result.member.lastName} ${result.member.firstName.charAt(0)}.`,
        rank: result.member.rank,
        status: result.status,
      },
      timestamp: new Date().toISOString(),
    })

    return result
  }

  /**
   * Release DDS role (during checkout or by admin)
   */
  async releaseDds(adminId?: string, notes?: string): Promise<void> {
    const today = getTodayDate()

    const currentDds = await this.prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
      include: memberInclude,
    })

    if (!currentDds) {
      throw new NotFoundError('DDS Assignment', 'today')
    }

    await this.prisma.ddsAssignment.update({
      where: { id: currentDds.id },
      data: {
        status: 'released',
        releasedAt: new Date(),
      },
    })

    await this.prisma.responsibilityAuditLog.create({
      data: {
        memberId: currentDds.memberId,
        tagName: 'DDS',
        action: 'released',
        fromMemberId: currentDds.memberId,
        performedBy: adminId ?? currentDds.memberId,
        performedByType: adminId ? 'admin' : 'member',
        notes: notes ?? null,
      },
    })

    // Broadcast DDS update
    broadcastDdsUpdate({
      action: 'released',
      assignment: null,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Get next week's DDS from the schedule
   */
  async getNextWeekDds(): Promise<{
    id: string
    firstName: string
    lastName: string
    rank: string
  } | null> {
    // Get next Monday (start of next week)
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ...
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilNextMonday)
    nextMonday.setHours(0, 0, 0, 0)

    const result = await this.scheduleService.getDdsByWeek(nextMonday)

    if (!result.dds) {
      return null
    }

    return {
      id: result.dds.member.id,
      firstName: result.dds.member.firstName,
      lastName: result.dds.member.lastName,
      rank: result.dds.member.rank,
    }
  }

  /**
   * Check if today is the first operational day of the week (handover day)
   *
   * This accounts for statutory holidays - if Monday is a holiday,
   * handover happens on Tuesday instead.
   */
  async isHandoverDay(): Promise<boolean> {
    const today = getTodayDate()
    return this.statHolidayService.isFirstOperationalDayOfWeek(today)
  }

  /**
   * Get the first operational day of the current week
   *
   * This is the day when DDS handover should occur, accounting for holidays.
   */
  async getFirstOperationalDayOfCurrentWeek(): Promise<Date> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ...
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

    return this.statHolidayService.getFirstOperationalDay(monday)
  }

  /**
   * Check if DDS exists for today
   */
  async hasDdsForToday(): Promise<boolean> {
    const today = getTodayDate()

    const assignment = await this.prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
      select: { id: true },
    })

    return assignment !== null
  }

  /**
   * Get audit log entries for DDS responsibility
   */
  async getAuditLog(
    memberId?: string,
    limit: number = 50
  ): Promise<ResponsibilityAuditLogEntry[]> {
    const whereClause: Prisma.ResponsibilityAuditLogWhereInput = {
      tagName: 'DDS',
    }

    if (memberId) {
      whereClause.OR = [
        { memberId },
        { fromMemberId: memberId },
        { toMemberId: memberId },
      ]
    }

    const logs = await this.prisma.responsibilityAuditLog.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    })

    return logs.map((log) => ({
      id: log.id,
      memberId: log.memberId,
      tagName: log.tagName,
      action: log.action,
      fromMemberId: log.fromMemberId,
      toMemberId: log.toMemberId,
      performedBy: log.performedBy,
      performedByType: log.performedByType,
      timestamp: log.timestamp,
      notes: log.notes,
    }))
  }
}

export const ddsService = new DdsService()
