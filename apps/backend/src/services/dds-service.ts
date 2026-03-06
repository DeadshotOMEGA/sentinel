import { Prisma } from '@sentinel/database'
import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { ConflictError, NotFoundError, ValidationError } from '../middleware/error-handler.js'
import { LockupService } from './lockup-service.js'
import { PresenceService } from './presence-service.js'
import { QualificationService } from './qualification-service.js'
import { ScheduleService } from './schedule-service.js'
import { StatHolidayService } from './stat-holiday-service.js'
import { broadcastDdsUpdate } from '../websocket/broadcast.js'

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

interface DdsResponsibilityState {
  shouldPrompt: boolean
  isFirstMemberCheckin: boolean
  needsDds: boolean
  needsBuildingOpen: boolean
  buildingStatus: 'secured' | 'open' | 'locking_up'
  canAcceptDds: boolean
  canOpenBuilding: boolean
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
  }
  scheduledDds: {
    id: string
    firstName: string
    lastName: string
    rank: string
  } | null
  currentDds: {
    id: string
    firstName: string
    lastName: string
    rank: string
    status: 'pending' | 'active'
  } | null
  currentLockupHolder: {
    id: string
    firstName: string
    lastName: string
    rank: string
  } | null
}

type DdsActorType = 'member' | 'admin'

type MemberSummary = {
  id: string
  firstName: string
  lastName: string
  rank: string
}

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
  private presenceService: PresenceService
  private qualificationService: QualificationService
  private scheduleService: ScheduleService
  private statHolidayService: StatHolidayService

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient()
    this.lockupService = new LockupService(this.prisma)
    this.presenceService = new PresenceService(this.prisma)
    this.qualificationService = new QualificationService(this.prisma)
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

  private formatBroadcastMemberName(member: DdsAssignmentWithMember['member']): string {
    return `${member.rank} ${member.lastName} ${member.firstName.charAt(0)}.`
  }

  private async getPersistedCurrentAssignment(
    today: Date
  ): Promise<Prisma.DdsAssignmentGetPayload<{ include: typeof memberInclude }> | null> {
    return this.prisma.ddsAssignment.findFirst({
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
  }

  private async getRequiredMemberSummary(memberId: string): Promise<MemberSummary> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true, rank: true },
    })

    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    return member
  }

  private async ensureDdsCandidateIsPresentAndQualified(memberId: string): Promise<MemberSummary> {
    const [member, isPresent, hasDdsQualification] = await Promise.all([
      this.getRequiredMemberSummary(memberId),
      this.presenceService.isMemberPresent(memberId),
      this.qualificationService.memberHasActiveQualificationCode(memberId, 'DDS'),
    ])

    if (!isPresent) {
      throw new ValidationError('Member must be checked in to take DDS responsibility')
    }

    if (!hasDdsQualification) {
      throw new ValidationError('Member must hold an active DDS qualification')
    }

    return member
  }

  private async ensureLockupAlignedToDds(memberId: string, actionLabel: string): Promise<void> {
    const lockupStatus = await this.lockupService.getCurrentStatus()

    if (lockupStatus.currentHolderId && lockupStatus.currentHolderId !== memberId) {
      await this.lockupService.transferLockup(
        memberId,
        'dds_handoff',
        `Auto-transferred on ${actionLabel}`
      )
    } else if (!lockupStatus.currentHolderId) {
      await this.lockupService.acquireLockup(memberId, `Auto-acquired on ${actionLabel}`)
    }

    const updatedStatus = await this.lockupService.getCurrentStatus()
    if (updatedStatus.buildingStatus === 'secured') {
      await this.lockupService.openBuilding(memberId, `Auto-opened on ${actionLabel}`)
    }
  }

  private async broadcastAssignment(
    action: 'accepted' | 'assigned' | 'transferred' | 'released',
    assignment: DdsAssignmentWithMember | null
  ): Promise<void> {
    broadcastDdsUpdate({
      action,
      assignment: assignment
        ? {
            id: assignment.id,
            memberId: assignment.memberId,
            memberName: this.formatBroadcastMemberName(assignment.member),
            rank: assignment.member.rank,
            status: assignment.status,
          }
        : null,
      timestamp: new Date().toISOString(),
    })
  }

  private async createAuditLog(input: {
    memberId: string
    action: string
    performedBy: string | null
    performedByType: DdsActorType
    fromMemberId?: string | null
    toMemberId?: string | null
    notes?: string | null
  }): Promise<void> {
    await this.prisma.responsibilityAuditLog.create({
      data: {
        memberId: input.memberId,
        tagName: 'DDS',
        action: input.action,
        fromMemberId: input.fromMemberId ?? null,
        toMemberId: input.toMemberId ?? null,
        performedBy: input.performedBy,
        performedByType: input.performedByType,
        notes: input.notes ?? null,
      },
    })
  }

  /**
   * Get today's active or pending DDS assignment with member details.
   */
  async getCurrentDds(): Promise<DdsAssignmentWithMember | null> {
    const today = getTodayDate()
    const assignment = await this.getPersistedCurrentAssignment(today)

    if (assignment) {
      return this.transformAssignment(assignment)
    }

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

  async getKioskResponsibilityState(memberId: string): Promise<DdsResponsibilityState> {
    const [
      member,
      currentDds,
      scheduledDdsResult,
      lockupStatus,
      presentMembers,
      hasDdsQual,
      canOpen,
    ] = await Promise.all([
      this.getRequiredMemberSummary(memberId),
      this.getCurrentDds(),
      this.scheduleService.getCurrentDdsFromSchedule(),
      this.lockupService.getCurrentStatus(),
      this.presenceService.getPresentMembers(),
      this.qualificationService.memberHasActiveQualificationCode(memberId, 'DDS'),
      this.qualificationService.canMemberReceiveLockup(memberId),
    ])

    const isPresent = presentMembers.some((presentMember) => presentMember.id === memberId)
    const isFirstMemberCheckin = presentMembers.length === 1 && isPresent
    const needsDds = currentDds?.status !== 'active'
    const needsBuildingOpen = lockupStatus.buildingStatus === 'secured'
    const canAcceptDds =
      isPresent &&
      hasDdsQual &&
      (!currentDds || currentDds.status !== 'active' || currentDds.memberId === memberId)
    const canOpenBuilding = isPresent && canOpen && lockupStatus.buildingStatus === 'secured'

    return {
      shouldPrompt: needsDds || needsBuildingOpen,
      isFirstMemberCheckin,
      needsDds,
      needsBuildingOpen,
      buildingStatus: lockupStatus.buildingStatus as 'secured' | 'open' | 'locking_up',
      canAcceptDds,
      canOpenBuilding,
      member,
      scheduledDds: scheduledDdsResult.dds
        ? {
            id: scheduledDdsResult.dds.member.id,
            firstName: scheduledDdsResult.dds.member.firstName,
            lastName: scheduledDdsResult.dds.member.lastName,
            rank: scheduledDdsResult.dds.member.rank,
          }
        : null,
      currentDds: currentDds
        ? {
            id: currentDds.member.id,
            firstName: currentDds.member.firstName,
            lastName: currentDds.member.lastName,
            rank: currentDds.member.rank,
            status: currentDds.status === 'active' ? 'active' : 'pending',
          }
        : null,
      currentLockupHolder: lockupStatus.currentHolder
        ? {
            id: lockupStatus.currentHolder.id,
            firstName: lockupStatus.currentHolder.firstName,
            lastName: lockupStatus.currentHolder.lastName,
            rank: lockupStatus.currentHolder.rank,
          }
        : null,
    }
  }

  /**
   * Member explicitly accepts or takes DDS for today.
   */
  async acceptDds(memberId: string): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate()
    await this.ensureDdsCandidateIsPresentAndQualified(memberId)

    const existingDds = await this.getPersistedCurrentAssignment(today)

    if (existingDds?.status === 'active' && existingDds.memberId === memberId) {
      return this.transformAssignment(existingDds)
    }

    if (existingDds?.status === 'active' && existingDds.memberId !== memberId) {
      throw new ConflictError('A DDS has already been accepted for today')
    }

    let assignment: Prisma.DdsAssignmentGetPayload<{ include: typeof memberInclude }>
    let auditAction: 'self_accepted' | 'transferred' = 'self_accepted'
    let auditNotes: string | null = null

    if (existingDds && existingDds.memberId === memberId && existingDds.status === 'pending') {
      assignment = await this.prisma.ddsAssignment.update({
        where: { id: existingDds.id },
        data: {
          acceptedAt: new Date(),
          status: 'active',
        },
        include: memberInclude,
      })
    } else if (
      existingDds &&
      existingDds.memberId !== memberId &&
      existingDds.status === 'pending'
    ) {
      auditAction = 'transferred'
      auditNotes = 'Same-day kiosk DDS takeover from scheduled member'

      const [, newAssignment] = await this.prisma.$transaction([
        this.prisma.ddsAssignment.update({
          where: { id: existingDds.id },
          data: {
            status: 'transferred',
            transferredTo: memberId,
            releasedAt: new Date(),
          },
        }),
        this.prisma.ddsAssignment.create({
          data: {
            memberId,
            assignedDate: today,
            acceptedAt: new Date(),
            status: 'active',
            notes: auditNotes,
          },
          include: memberInclude,
        }),
      ])

      assignment = newAssignment
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

    const result = this.transformAssignment(assignment)

    await this.ensureLockupAlignedToDds(memberId, 'DDS acceptance')

    await this.createAuditLog({
      memberId,
      action: auditAction,
      fromMemberId: existingDds && existingDds.memberId !== memberId ? existingDds.memberId : null,
      toMemberId: auditAction === 'transferred' ? memberId : null,
      performedBy: memberId,
      performedByType: 'member',
      notes: auditNotes,
    })

    await this.broadcastAssignment(
      auditAction === 'transferred' ? 'transferred' : 'accepted',
      result
    )

    return result
  }

  /**
   * Admin sets or replaces today's live DDS.
   */
  async setTodayDds(
    memberId: string,
    adminId: string,
    notes?: string
  ): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate()
    await this.ensureDdsCandidateIsPresentAndQualified(memberId)

    const existingDds = await this.getPersistedCurrentAssignment(today)

    if (existingDds?.status === 'active' && existingDds.memberId === memberId) {
      return this.transformAssignment(existingDds)
    }

    let assignment: Prisma.DdsAssignmentGetPayload<{ include: typeof memberInclude }>
    let broadcastAction: 'assigned' | 'transferred' = 'assigned'
    let auditAction: 'assigned' | 'transferred' = 'assigned'
    let fromMemberId: string | null = null

    if (existingDds && existingDds.memberId === memberId && existingDds.status === 'pending') {
      assignment = await this.prisma.ddsAssignment.update({
        where: { id: existingDds.id },
        data: {
          acceptedAt: new Date(),
          status: 'active',
          assignedBy: adminId,
          notes: notes ?? existingDds.notes,
        },
        include: memberInclude,
      })
    } else if (existingDds && existingDds.memberId !== memberId) {
      broadcastAction = 'transferred'
      auditAction = 'transferred'
      fromMemberId = existingDds.memberId

      const [, newAssignment] = await this.prisma.$transaction([
        this.prisma.ddsAssignment.update({
          where: { id: existingDds.id },
          data: {
            status: 'transferred',
            transferredTo: memberId,
            releasedAt: new Date(),
          },
        }),
        this.prisma.ddsAssignment.create({
          data: {
            memberId,
            assignedDate: today,
            acceptedAt: new Date(),
            assignedBy: adminId,
            status: 'active',
            notes: notes ?? null,
          },
          include: memberInclude,
        }),
      ])

      assignment = newAssignment
    } else {
      assignment = await this.prisma.ddsAssignment.create({
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
    }

    const result = this.transformAssignment(assignment)

    await this.ensureLockupAlignedToDds(memberId, 'admin DDS assignment')

    await this.createAuditLog({
      memberId,
      action: auditAction,
      fromMemberId,
      toMemberId: auditAction === 'transferred' || auditAction === 'assigned' ? memberId : null,
      performedBy: adminId,
      performedByType: 'admin',
      notes: notes ?? null,
    })

    await this.broadcastAssignment(broadcastAction, result)

    return result
  }

  /**
   * Admin assigns DDS to a member.
   */
  async assignDds(
    memberId: string,
    adminId: string,
    notes?: string
  ): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate()
    const existingDds = await this.getPersistedCurrentAssignment(today)

    if (existingDds) {
      throw new ConflictError('A DDS has already been assigned for today')
    }

    return this.setTodayDds(memberId, adminId, notes)
  }

  /**
   * Admin transfers DDS from current holder to another member.
   */
  async transferDds(
    toMemberId: string,
    adminId: string,
    notes?: string
  ): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate()
    const currentDds = await this.getPersistedCurrentAssignment(today)

    if (!currentDds) {
      throw new NotFoundError('DDS Assignment', 'today')
    }

    if (currentDds.memberId === toMemberId) {
      throw new ValidationError('Cannot transfer DDS to the same member')
    }

    return this.setTodayDds(toMemberId, adminId, notes)
  }

  /**
   * Release DDS role (during checkout or by admin).
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

    await this.createAuditLog({
      memberId: currentDds.memberId,
      action: 'released',
      fromMemberId: currentDds.memberId,
      performedBy: adminId ?? currentDds.memberId,
      performedByType: adminId ? 'admin' : 'member',
      notes: notes ?? null,
    })

    await this.broadcastAssignment('released', null)
  }

  /**
   * Get next week's DDS from the schedule.
   */
  async getNextWeekDds(): Promise<{
    id: string
    firstName: string
    lastName: string
    rank: string
  } | null> {
    const today = new Date()
    const dayOfWeek = today.getDay()
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

  async isHandoverDay(): Promise<boolean> {
    const today = getTodayDate()
    return this.statHolidayService.isFirstOperationalDayOfWeek(today)
  }

  async getFirstOperationalDayOfCurrentWeek(): Promise<Date> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

    return this.statHolidayService.getFirstOperationalDay(monday)
  }

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

  async getAuditLog(memberId?: string, limit: number = 50): Promise<ResponsibilityAuditLogEntry[]> {
    const whereClause: Prisma.ResponsibilityAuditLogWhereInput = {
      tagName: 'DDS',
    }

    if (memberId) {
      whereClause.OR = [{ memberId }, { fromMemberId: memberId }, { toMemberId: memberId }]
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
