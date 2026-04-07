import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { QualificationService } from './qualification-service.js'
import { PresenceService } from './presence-service.js'
import {
  LiveDutyAssignmentRepository,
  type LiveDutyAssignmentEntity,
  type LiveDutyAssignmentEndedReason,
} from '../repositories/live-duty-assignment-repository.js'
import { ConflictError, NotFoundError, ValidationError } from '../middleware/error-handler.js'

const ALLOWED_LIVE_DUTY_POSITION_CODES = new Set(['SWK', 'DSWK', 'QM', 'BM', 'APS'])

export class LiveDutyAssignmentService {
  private prisma: PrismaClientInstance
  private repository: LiveDutyAssignmentRepository
  private qualificationService: QualificationService
  private presenceService: PresenceService

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
    this.repository = new LiveDutyAssignmentRepository(prisma)
    this.qualificationService = new QualificationService(prisma)
    this.presenceService = new PresenceService(prisma)
  }

  async listActiveAssignments(): Promise<LiveDutyAssignmentEntity[]> {
    return this.repository.findActive()
  }

  async listActiveAssignmentsByMemberIds(memberIds: string[]): Promise<LiveDutyAssignmentEntity[]> {
    return this.repository.findActiveByMemberIds(memberIds)
  }

  async getActiveAssignmentByMemberId(memberId: string): Promise<LiveDutyAssignmentEntity | null> {
    return this.repository.findActiveByMemberId(memberId)
  }

  async assignTemporaryDuty(input: {
    memberId: string
    dutyPositionId: string
    notes?: string | null
  }): Promise<LiveDutyAssignmentEntity> {
    const member = await this.prisma.member.findUnique({
      where: { id: input.memberId },
      select: { id: true },
    })

    if (!member) {
      throw new NotFoundError('Member', input.memberId)
    }

    const dutyPosition = await this.repository.findDutyPositionById(input.dutyPositionId)

    if (!dutyPosition) {
      throw new NotFoundError('Duty Position', input.dutyPositionId)
    }

    if (dutyPosition.dutyRole.code !== 'DUTY_WATCH') {
      throw new ValidationError('Live temporary duty assignments only support Duty Watch positions')
    }

    if (!ALLOWED_LIVE_DUTY_POSITION_CODES.has(dutyPosition.code)) {
      throw new ValidationError(
        `Temporary live assignment is not supported for duty position ${dutyPosition.code}`
      )
    }

    const isPresent = await this.presenceService.isMemberPresent(input.memberId)
    if (!isPresent) {
      throw new ValidationError('Member must be checked in to receive a temporary duty assignment')
    }

    const hasQualification = await this.qualificationService.memberHasActiveQualificationCode(
      input.memberId,
      dutyPosition.code
    )

    if (!hasQualification) {
      throw new ValidationError(
        `Member does not hold the active ${dutyPosition.code} qualification required for this assignment`
      )
    }

    const existingMemberAssignment = await this.repository.findActiveByMemberId(input.memberId)
    if (existingMemberAssignment?.dutyPositionId === input.dutyPositionId) {
      throw new ConflictError(
        `Member already has an active temporary ${dutyPosition.code} assignment`
      )
    }

    const activeAssignmentsForPosition = await this.repository.countActiveForPosition(
      input.dutyPositionId
    )

    if (activeAssignmentsForPosition >= dutyPosition.maxSlots) {
      throw new ConflictError(
        `Temporary ${dutyPosition.code} coverage is already at the maximum of ${dutyPosition.maxSlots}`
      )
    }

    if (existingMemberAssignment) {
      await this.repository.endAssignment(existingMemberAssignment.id, {
        endedAt: new Date(),
        endedReason: 'reassigned',
      })
    }

    return this.repository.createAssignment({
      memberId: input.memberId,
      dutyPositionId: input.dutyPositionId,
      notes: input.notes,
    })
  }

  async clearAssignment(
    assignmentId: string,
    endedReason: LiveDutyAssignmentEndedReason,
    endedAt: Date = new Date()
  ): Promise<LiveDutyAssignmentEntity> {
    const assignment = await this.repository.findById(assignmentId)
    if (!assignment) {
      throw new NotFoundError('Live Duty Assignment', assignmentId)
    }

    if (assignment.endedAt) {
      throw new ValidationError('Temporary duty assignment is already inactive')
    }

    return this.repository.endAssignment(assignmentId, {
      endedAt,
      endedReason,
    })
  }

  async clearAssignmentsForMembers(
    memberIds: string[],
    endedReason: Extract<
      LiveDutyAssignmentEndedReason,
      'member_checkout' | 'lockup_execution' | 'daily_reset' | 'reassigned'
    >,
    endedAt: Date = new Date()
  ): Promise<number> {
    return this.repository.endActiveAssignmentsForMembers(memberIds, {
      endedAt,
      endedReason,
    })
  }
}
