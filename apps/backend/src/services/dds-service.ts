import { Prisma } from '@sentinel/database'
import type { PrismaClient } from '@sentinel/database'
import { DateTime } from 'luxon'
import { getPrismaClient } from '../lib/database.js'
import { ConflictError, NotFoundError, ValidationError } from '../middleware/error-handler.js'
import type { LockupStatusEntity } from '../repositories/lockup-repository.js'
import { DEFAULT_TIMEZONE, getOperationalDayStartTime } from '../utils/operational-date.js'
import { LockupService } from './lockup-service.js'
import { PresenceService } from './presence-service.js'
import { QualificationService } from './qualification-service.js'
import { ScheduleService, type CurrentDdsFromSchedule } from './schedule-service.js'
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
  promptVariant:
    | 'expected_dds'
    | 'opener_only'
    | 'replacement_candidate'
    | 'building_open_dds_pending'
  isFirstMemberCheckin: boolean
  needsDds: boolean
  needsBuildingOpen: boolean
  buildingStatus: 'secured' | 'open' | 'locking_up'
  canAcceptDds: boolean
  canOpenBuilding: boolean
  member: MemberSummary
  expectedDds: {
    member: MemberSummary
    source: 'live' | 'scheduled'
    matchesScannedMember: boolean
  } | null
  scheduledDds: MemberSummary | null
  currentDds: {
    id: string
    firstName: string
    lastName: string
    rank: string
    status: 'pending' | 'active'
  } | null
  currentLockupHolder: MemberSummary | null
  currentOpenContext: {
    openedBy: MemberSummary | null
    openedAt: string | null
    currentLockupHolder: MemberSummary | null
    currentHolderAcquiredAt: string | null
  } | null
  presentMembers: Array<
    MemberSummary & {
      checkedInAt: string
    }
  >
  presentVisitorCount: number
  todayCycles: Array<{
    id: string
    openedBy: MemberSummary | null
    openedAt: string
    closedBy: MemberSummary | null
    closedAt: string | null
    isCurrent: boolean
  }>
}

type DdsActorType = 'member' | 'admin'

type MemberSummary = {
  id: string
  firstName: string
  lastName: string
  rank: string
}

interface WeeklyHandoverContext {
  firstOperationalDay: Date
  outgoingDds: CurrentDdsFromSchedule
  incomingDds: CurrentDdsFromSchedule
}

interface DdsHandoverStatus {
  isPending: boolean
  firstOperationalDay: Date | null
  outgoingDds: MemberSummary | null
  incomingDds: MemberSummary | null
}

interface LockupHistoryCycle {
  id: string
  openedBy: MemberSummary | null
  openedAt: string
  closedBy: MemberSummary | null
  closedAt: string | null
  isCurrent: boolean
}

function getTodayDate(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function getWeekStart(date: Date): Date {
  const normalized = startOfDay(date)
  const dayOfWeek = normalized.getDay()
  normalized.setDate(normalized.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  return normalized
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
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

  private toMemberSummary(
    member:
      | {
          id: string
          firstName: string
          lastName: string
          rank: string
        }
      | null
      | undefined
  ): MemberSummary | null {
    if (!member) {
      return null
    }

    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      rank: member.rank,
    }
  }

  private async getMemberSummariesById(memberIds: string[]): Promise<Map<string, MemberSummary>> {
    if (memberIds.length === 0) {
      return new Map()
    }

    const members = await this.prisma.member.findMany({
      where: {
        id: {
          in: memberIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rank: true,
      },
    })

    return new Map(
      members.map((member) => [
        member.id,
        {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          rank: member.rank,
        },
      ])
    )
  }

  private resolveExpectedDds(
    scannedMemberId: string,
    currentDds: DdsAssignmentWithMember | null,
    scheduledDds: CurrentDdsFromSchedule | null
  ): {
    member: MemberSummary
    source: 'live' | 'scheduled'
    matchesScannedMember: boolean
  } | null {
    if (currentDds) {
      return {
        member: {
          id: currentDds.member.id,
          firstName: currentDds.member.firstName,
          lastName: currentDds.member.lastName,
          rank: currentDds.member.rank,
        },
        source: 'live',
        matchesScannedMember: currentDds.memberId === scannedMemberId,
      }
    }

    if (!scheduledDds) {
      return null
    }

    return {
      member: {
        id: scheduledDds.member.id,
        firstName: scheduledDds.member.firstName,
        lastName: scheduledDds.member.lastName,
        rank: scheduledDds.member.rank,
      },
      source: 'scheduled',
      matchesScannedMember: scheduledDds.member.id === scannedMemberId,
    }
  }

  private resolvePromptVariant(input: {
    needsDds: boolean
    needsBuildingOpen: boolean
    canAcceptDds: boolean
    expectedDdsMatches: boolean
  }): DdsResponsibilityState['promptVariant'] {
    if (input.needsDds && input.expectedDdsMatches) {
      return 'expected_dds'
    }

    if (input.needsDds && !input.needsBuildingOpen) {
      return 'building_open_dds_pending'
    }

    if (input.needsDds && input.needsBuildingOpen && input.canAcceptDds) {
      return 'replacement_candidate'
    }

    return 'opener_only'
  }

  private async getTodayLockupCycles(
    lockupStatus: LockupStatusEntity
  ): Promise<LockupHistoryCycle[]> {
    const rollover = getOperationalDayStartTime()
    const windowStart = DateTime.fromObject(
      {
        year: lockupStatus.date.getUTCFullYear(),
        month: lockupStatus.date.getUTCMonth() + 1,
        day: lockupStatus.date.getUTCDate(),
      },
      {
        zone: DEFAULT_TIMEZONE,
      }
    ).set({
      hour: rollover.hour,
      minute: rollover.minute,
      second: 0,
      millisecond: 0,
    })
    const windowEnd = windowStart.plus({ days: 1 })

    const logs = await this.prisma.responsibilityAuditLog.findMany({
      where: {
        tagName: 'Lockup',
        action: {
          in: ['building_opened', 'building_lockup'],
        },
        timestamp: {
          gte: windowStart.toJSDate(),
          lt: windowEnd.toJSDate(),
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    const memberSummaries = await this.getMemberSummariesById([
      ...new Set(logs.map((log) => log.memberId)),
    ])

    const cycles: LockupHistoryCycle[] = []
    let activeCycle: LockupHistoryCycle | null = null

    for (const log of logs) {
      const actor = memberSummaries.get(log.memberId) ?? null

      if (log.action === 'building_opened') {
        if (activeCycle) {
          cycles.push(activeCycle)
        }

        activeCycle = {
          id: log.id,
          openedBy: actor,
          openedAt: log.timestamp.toISOString(),
          closedBy: null,
          closedAt: null,
          isCurrent: false,
        }
        continue
      }

      if (log.action === 'building_lockup' && activeCycle) {
        activeCycle = {
          ...activeCycle,
          closedBy: actor,
          closedAt: log.timestamp.toISOString(),
          isCurrent: false,
        }
        cycles.push(activeCycle)
        activeCycle = null
      }
    }

    if (activeCycle) {
      cycles.push({
        ...activeCycle,
        isCurrent: lockupStatus.buildingStatus !== 'secured',
      })
    }

    return cycles
  }

  private buildCurrentOpenContext(
    lockupStatus: LockupStatusEntity,
    todayCycles: LockupHistoryCycle[]
  ): DdsResponsibilityState['currentOpenContext'] {
    if (lockupStatus.buildingStatus === 'secured') {
      return null
    }

    const currentCycle = [...todayCycles].reverse().find((cycle) => cycle.isCurrent) ?? null

    return {
      openedBy: currentCycle?.openedBy ?? null,
      openedAt: currentCycle?.openedAt ?? null,
      currentLockupHolder: this.toMemberSummary(lockupStatus.currentHolder),
      currentHolderAcquiredAt: lockupStatus.acquiredAt?.toISOString() ?? null,
    }
  }

  private async resolveAssignedByAdminId(actorId: string): Promise<string | null> {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: actorId },
      select: { id: true },
    })

    return adminUser?.id ?? null
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

  private buildSyntheticAssignmentFromSchedule(
    scheduledDds: CurrentDdsFromSchedule,
    assignedDate: Date,
    notes: string
  ): DdsAssignmentWithMember {
    return {
      id: `synthetic-${scheduledDds.assignmentId}-${assignedDate.toISOString().substring(0, 10)}`,
      memberId: scheduledDds.member.id,
      assignedDate,
      acceptedAt: assignedDate,
      releasedAt: null,
      transferredTo: null,
      assignedBy: null,
      status: 'active',
      notes,
      createdAt: assignedDate,
      updatedAt: assignedDate,
      member: {
        id: scheduledDds.member.id,
        firstName: scheduledDds.member.firstName,
        lastName: scheduledDds.member.lastName,
        rank: scheduledDds.member.rank,
        division: null,
      },
      assignedByAdminName: null,
    }
  }

  private async getWeeklyHandoverContext(date: Date): Promise<WeeklyHandoverContext | null> {
    const today = startOfDay(date)
    const weekStart = getWeekStart(today)
    const firstOperationalDay = await this.statHolidayService.getFirstOperationalDay(weekStart)

    if (today < firstOperationalDay) {
      return null
    }

    const [{ dds: incomingDds }, { dds: outgoingDds }] = await Promise.all([
      this.scheduleService.getDdsByWeek(weekStart),
      this.scheduleService.getDdsByWeek(addDays(weekStart, -7)),
    ])

    if (
      !incomingDds ||
      !outgoingDds ||
      incomingDds.status === 'released' ||
      outgoingDds.status === 'released' ||
      incomingDds.member.id === outgoingDds.member.id
    ) {
      return null
    }

    const nextWeekStart = addDays(weekStart, 7)
    const completedHandover = await this.prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: {
          gte: firstOperationalDay,
          lt: nextWeekStart,
        },
        memberId: {
          not: outgoingDds.member.id,
        },
      },
      select: { id: true },
    })

    if (completedHandover) {
      return null
    }

    return {
      firstOperationalDay,
      outgoingDds,
      incomingDds,
    }
  }

  async getAutomaticPendingAssignmentMemberId(date: Date): Promise<string | null> {
    const normalizedDate = startOfDay(date)
    const handoverContext = await this.getWeeklyHandoverContext(normalizedDate)

    if (handoverContext) {
      return null
    }

    const { dds } = await this.scheduleService.getDdsByWeek(normalizedDate)

    if (!dds || dds.status === 'released') {
      return null
    }

    return dds.member.id
  }

  async getCurrentHandoverStatus(date: Date = getTodayDate()): Promise<DdsHandoverStatus> {
    const handoverContext = await this.getWeeklyHandoverContext(date)

    if (!handoverContext) {
      return {
        isPending: false,
        firstOperationalDay: null,
        outgoingDds: null,
        incomingDds: null,
      }
    }

    return {
      isPending: true,
      firstOperationalDay: handoverContext.firstOperationalDay,
      outgoingDds: {
        id: handoverContext.outgoingDds.member.id,
        firstName: handoverContext.outgoingDds.member.firstName,
        lastName: handoverContext.outgoingDds.member.lastName,
        rank: handoverContext.outgoingDds.member.rank,
      },
      incomingDds: {
        id: handoverContext.incomingDds.member.id,
        firstName: handoverContext.incomingDds.member.firstName,
        lastName: handoverContext.incomingDds.member.lastName,
        rank: handoverContext.incomingDds.member.rank,
      },
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

    const handoverContext = await this.getWeeklyHandoverContext(today)

    if (handoverContext) {
      return this.buildSyntheticAssignmentFromSchedule(
        handoverContext.outgoingDds,
        today,
        'Weekly DDS handover is still pending transfer'
      )
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
      presentVisitorCount,
      hasDdsQual,
      hasLockupAuthority,
    ] = await Promise.all([
      this.getRequiredMemberSummary(memberId),
      this.getCurrentDds(),
      this.scheduleService.getCurrentDdsFromSchedule(),
      this.lockupService.getCurrentStatus(),
      this.presenceService.getPresentMembers(),
      this.presenceService.getActiveVisitorCount(),
      this.qualificationService.memberHasActiveQualificationCode(memberId, 'DDS'),
      this.lockupService.canMemberExerciseLockupAuthority(memberId),
    ])

    const isPresent = presentMembers.some((presentMember) => presentMember.id === memberId)
    const isFirstMemberCheckin = presentMembers.length === 1 && isPresent
    const needsDds = currentDds?.status !== 'active'
    const needsBuildingOpen = lockupStatus.buildingStatus === 'secured'
    const canAcceptDds =
      isPresent &&
      hasDdsQual &&
      hasLockupAuthority &&
      (!currentDds || currentDds.status !== 'active' || currentDds.memberId === memberId)
    const canOpenBuilding =
      isPresent && hasLockupAuthority && lockupStatus.buildingStatus === 'secured'
    const expectedDds = this.resolveExpectedDds(
      memberId,
      currentDds,
      scheduledDdsResult.dds ?? null
    )
    const promptVariant = this.resolvePromptVariant({
      needsDds,
      needsBuildingOpen,
      canAcceptDds,
      expectedDdsMatches: expectedDds?.matchesScannedMember ?? false,
    })
    const todayCycles = await this.getTodayLockupCycles(lockupStatus)
    const currentOpenContext = this.buildCurrentOpenContext(lockupStatus, todayCycles)

    return {
      shouldPrompt: needsDds || needsBuildingOpen,
      promptVariant,
      isFirstMemberCheckin,
      needsDds,
      needsBuildingOpen,
      buildingStatus: lockupStatus.buildingStatus as 'secured' | 'open' | 'locking_up',
      canAcceptDds,
      canOpenBuilding,
      member,
      expectedDds,
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
      currentLockupHolder: this.toMemberSummary(lockupStatus.currentHolder),
      currentOpenContext,
      presentMembers: presentMembers.map((presentMember) => ({
        id: presentMember.id,
        firstName: presentMember.firstName,
        lastName: presentMember.lastName,
        rank: presentMember.rank,
        checkedInAt: presentMember.checkedInAt,
      })),
      presentVisitorCount,
      todayCycles,
    }
  }

  /**
   * Member explicitly accepts or takes DDS for today.
   */
  async acceptDds(memberId: string): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate()
    await this.ensureDdsCandidateIsPresentAndQualified(memberId)

    const existingDds = await this.getPersistedCurrentAssignment(today)
    const handoverContext = existingDds ? null : await this.getWeeklyHandoverContext(today)

    if (existingDds?.status === 'active' && existingDds.memberId === memberId) {
      return this.transformAssignment(existingDds)
    }

    if (existingDds?.status === 'active' && existingDds.memberId !== memberId) {
      throw new ConflictError('A DDS has already been accepted for today')
    }

    if (handoverContext && handoverContext.outgoingDds.member.id !== memberId) {
      throw new ConflictError(
        'DDS handover is still pending; the outgoing DDS must transfer responsibility before another member can accept today'
      )
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
    const handoverContext = existingDds ? null : await this.getWeeklyHandoverContext(today)
    const assignedByAdminId = await this.resolveAssignedByAdminId(adminId)

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
          assignedBy: assignedByAdminId,
          notes: notes ?? existingDds.notes,
        },
        include: memberInclude,
      })
    } else if (handoverContext && handoverContext.outgoingDds.member.id !== memberId) {
      broadcastAction = 'transferred'
      auditAction = 'transferred'
      fromMemberId = handoverContext.outgoingDds.member.id

      assignment = await this.prisma.ddsAssignment.create({
        data: {
          memberId,
          assignedDate: today,
          acceptedAt: new Date(),
          assignedBy: assignedByAdminId,
          status: 'active',
          notes: notes ?? null,
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
            assignedBy: assignedByAdminId,
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
          assignedBy: assignedByAdminId,
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
    const handoverContext = currentDds ? null : await this.getWeeklyHandoverContext(today)

    if (!currentDds && !handoverContext) {
      throw new NotFoundError('DDS Assignment', 'today')
    }

    const currentMemberId = currentDds?.memberId ?? handoverContext?.outgoingDds.member.id

    if (currentMemberId === toMemberId) {
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
    return (await this.getCurrentDds()) !== null
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
