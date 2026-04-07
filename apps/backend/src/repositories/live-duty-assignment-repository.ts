import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma, Prisma } from '@sentinel/database'

export type LiveDutyAssignmentEndedReason =
  | 'manual_clear'
  | 'member_checkout'
  | 'lockup_execution'
  | 'daily_reset'
  | 'reassigned'

export interface LiveDutyAssignmentEntity {
  id: string
  memberId: string
  dutyPositionId: string
  notes: string | null
  startedAt: Date
  endedAt: Date | null
  endedReason: LiveDutyAssignmentEndedReason | null
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
    maxSlots: number
    dutyRole: {
      id: string
      code: string
      name: string
    }
  }
}

export interface CreateLiveDutyAssignmentInput {
  memberId: string
  dutyPositionId: string
  notes?: string | null
  startedAt?: Date
}

const liveAssignmentInclude = {
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
      maxSlots: true,
      dutyRole: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
} as const

type LiveDutyAssignmentRecord = Prisma.LiveDutyAssignmentGetPayload<{
  include: typeof liveAssignmentInclude
}>

function toLiveDutyAssignmentEndedReason(
  endedReason: string | null
): LiveDutyAssignmentEndedReason | null {
  switch (endedReason) {
    case null:
    case 'manual_clear':
    case 'member_checkout':
    case 'lockup_execution':
    case 'daily_reset':
    case 'reassigned':
      return endedReason
    default:
      throw new Error(`Unexpected live duty assignment end reason: ${endedReason}`)
  }
}

function toLiveDutyAssignmentEntity(record: LiveDutyAssignmentRecord): LiveDutyAssignmentEntity {
  return {
    ...record,
    endedReason: toLiveDutyAssignmentEndedReason(record.endedReason),
  }
}

export class LiveDutyAssignmentRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient: PrismaClientInstance = defaultPrisma) {
    this.prisma = prismaClient
  }

  async findActive(): Promise<LiveDutyAssignmentEntity[]> {
    const assignments = await this.prisma.liveDutyAssignment.findMany({
      where: { endedAt: null },
      include: liveAssignmentInclude,
      orderBy: [{ dutyPosition: { displayOrder: 'asc' } }, { startedAt: 'asc' }],
    })

    return assignments.map(toLiveDutyAssignmentEntity)
  }

  async findActiveByMemberIds(memberIds: string[]): Promise<LiveDutyAssignmentEntity[]> {
    if (memberIds.length === 0) {
      return []
    }

    const assignments = await this.prisma.liveDutyAssignment.findMany({
      where: {
        memberId: { in: memberIds },
        endedAt: null,
      },
      include: liveAssignmentInclude,
      orderBy: [{ dutyPosition: { displayOrder: 'asc' } }, { startedAt: 'asc' }],
    })

    return assignments.map(toLiveDutyAssignmentEntity)
  }

  async findActiveByMemberId(memberId: string): Promise<LiveDutyAssignmentEntity | null> {
    const assignment = await this.prisma.liveDutyAssignment.findFirst({
      where: {
        memberId,
        endedAt: null,
      },
      include: liveAssignmentInclude,
      orderBy: { startedAt: 'desc' },
    })

    return assignment ? toLiveDutyAssignmentEntity(assignment) : null
  }

  async findById(id: string): Promise<LiveDutyAssignmentEntity | null> {
    const assignment = await this.prisma.liveDutyAssignment.findUnique({
      where: { id },
      include: liveAssignmentInclude,
    })

    return assignment ? toLiveDutyAssignmentEntity(assignment) : null
  }

  async countActiveForPosition(dutyPositionId: string): Promise<number> {
    return this.prisma.liveDutyAssignment.count({
      where: {
        dutyPositionId,
        endedAt: null,
      },
    })
  }

  async findDutyPositionById(id: string): Promise<{
    id: string
    code: string
    name: string
    maxSlots: number
    dutyRole: {
      id: string
      code: string
      name: string
    }
  } | null> {
    return this.prisma.dutyPosition.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        maxSlots: true,
        dutyRole: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    })
  }

  async createAssignment(input: CreateLiveDutyAssignmentInput): Promise<LiveDutyAssignmentEntity> {
    const data: Prisma.LiveDutyAssignmentCreateInput = {
      notes: input.notes,
      startedAt: input.startedAt,
      member: {
        connect: { id: input.memberId },
      },
      dutyPosition: {
        connect: { id: input.dutyPositionId },
      },
    }

    const assignment = await this.prisma.liveDutyAssignment.create({
      data,
      include: liveAssignmentInclude,
    })

    return toLiveDutyAssignmentEntity(assignment)
  }

  async endAssignment(
    id: string,
    input: {
      endedAt: Date
      endedReason: LiveDutyAssignmentEndedReason
    }
  ): Promise<LiveDutyAssignmentEntity> {
    const assignment = await this.prisma.liveDutyAssignment.update({
      where: { id },
      data: {
        endedAt: input.endedAt,
        endedReason: input.endedReason,
      },
      include: liveAssignmentInclude,
    })

    return toLiveDutyAssignmentEntity(assignment)
  }

  async endActiveAssignmentsForMembers(
    memberIds: string[],
    input: {
      endedAt: Date
      endedReason: LiveDutyAssignmentEndedReason
    }
  ): Promise<number> {
    if (memberIds.length === 0) {
      return 0
    }

    const result = await this.prisma.liveDutyAssignment.updateMany({
      where: {
        memberId: { in: memberIds },
        endedAt: null,
      },
      data: {
        endedAt: input.endedAt,
        endedReason: input.endedReason,
      },
    })

    return result.count
  }
}
