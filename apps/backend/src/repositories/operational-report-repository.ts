import type { PrismaClientInstance } from '@sentinel/database'
import { Prisma, prisma as defaultPrisma } from '@sentinel/database'
import { SENTINEL_BOOTSTRAP_SERVICE_NUMBER } from '../lib/system-bootstrap.js'

const reportMemberInclude = {
  division: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  memberTypeRef: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  memberStatusRef: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  memberTags: {
    include: {
      tag: true,
    },
  },
  qualifications: {
    where: {
      status: 'active',
    },
    include: {
      qualificationType: {
        include: {
          tag: true,
        },
      },
    },
  },
} satisfies Prisma.MemberInclude

const unitEventInclude = {
  eventType: {
    select: {
      id: true,
      name: true,
      category: true,
      defaultDurationMinutes: true,
    },
  },
} satisfies Prisma.UnitEventInclude

const visitorInclude = {
  event: {
    select: {
      id: true,
      name: true,
    },
  },
  hostMember: {
    select: {
      id: true,
      serviceNumber: true,
      rank: true,
      firstName: true,
      lastName: true,
      displayName: true,
    },
  },
} satisfies Prisma.VisitorInclude

const reportDutyMemberSelect = {
  id: true,
  rank: true,
  firstName: true,
  lastName: true,
  displayName: true,
} satisfies Prisma.MemberSelect

const missedCheckoutInclude = {
  member: {
    select: reportDutyMemberSelect,
  },
  resolvedByAdmin: {
    select: {
      id: true,
      displayName: true,
      username: true,
    },
  },
} satisfies Prisma.MissedCheckoutInclude

const lockupExceptionStatusInclude = {
  currentHolder: {
    select: reportDutyMemberSelect,
  },
  securedByMember: {
    select: reportDutyMemberSelect,
  },
  execution: {
    select: {
      id: true,
      executedAt: true,
      executedBy: true,
      membersCheckedOut: true,
      executedByMember: {
        select: reportDutyMemberSelect,
      },
    },
  },
} satisfies Prisma.LockupStatusInclude

const scheduledDutyInclude = {
  dutyRole: {
    select: {
      code: true,
    },
  },
  assignments: {
    where: {
      status: {
        not: 'released',
      },
    },
    select: {
      memberId: true,
      member: {
        select: reportDutyMemberSelect,
      },
      dutyPosition: {
        select: {
          code: true,
        },
      },
    },
  },
} satisfies Prisma.WeeklyScheduleInclude

export type OperationalReportMemberRecord = Prisma.MemberGetPayload<{
  include: typeof reportMemberInclude
}>

export interface OperationalReportCheckinRecord {
  id: string
  memberId: string | null
  direction: string
  timestamp: Date
  kioskId: string
}

export type OperationalReportUnitEventRecord = Prisma.UnitEventGetPayload<{
  include: typeof unitEventInclude
}>

export type OperationalReportVisitorRecord = Prisma.VisitorGetPayload<{
  include: typeof visitorInclude
}>

export type OperationalReportMissedCheckoutRecord = Prisma.MissedCheckoutGetPayload<{
  include: typeof missedCheckoutInclude
}>

export type OperationalReportLockupStatusRecord = Prisma.LockupStatusGetPayload<{
  include: typeof lockupExceptionStatusInclude
}>

export type OperationalReportScheduledDutyRecord = Prisma.WeeklyScheduleGetPayload<{
  include: typeof scheduledDutyInclude
}>

export type OperationalReportScheduledDutyRoleCode =
  | 'DDS'
  | 'DUTY_WATCH'
  | 'SWK'
  | 'DSWK'
  | 'QM'
  | 'BM'
  | 'APS'

export interface OperationalReportScheduledDutyAssignmentRecord {
  memberId: string
  dutyRoleCode: OperationalReportScheduledDutyRoleCode
}

export interface OperationalReportMemberFilters {
  divisionId?: string
  tagId?: string
}

export interface OperationalReportVisitorFilters {
  start: Date
  end: Date
  visitType?: string
  visitorPurpose?: string
  eventLinked?: boolean
  hostMemberId?: string
  organization?: string
}

export class OperationalReportRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  async findDivisionById(
    divisionId: string
  ): Promise<{ id: string; code: string; name: string } | null> {
    return this.prisma.division.findUnique({
      where: { id: divisionId },
      select: {
        id: true,
        code: true,
        name: true,
      },
    })
  }

  async findTagById(
    tagId: string
  ): Promise<{ id: string; name: string; chipVariant: string; chipColor: string } | null> {
    return this.prisma.tag.findUnique({
      where: { id: tagId },
      select: {
        id: true,
        name: true,
        chipVariant: true,
        chipColor: true,
      },
    })
  }

  async findTagShortcut(
    shortcut: 'fts' | 'geo'
  ): Promise<{ id: string; name: string; chipVariant: string; chipColor: string } | null> {
    return this.prisma.tag.findFirst({
      where: {
        name: {
          equals: shortcut.toUpperCase(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        chipVariant: true,
        chipColor: true,
      },
    })
  }

  async findActiveMembers(
    filters: OperationalReportMemberFilters = {}
  ): Promise<OperationalReportMemberRecord[]> {
    const where: Prisma.MemberWhereInput = {
      status: 'active',
      serviceNumber: {
        not: SENTINEL_BOOTSTRAP_SERVICE_NUMBER,
      },
    }

    if (filters.divisionId) {
      where.divisionId = filters.divisionId
    }

    if (filters.tagId) {
      where.OR = [
        {
          memberTags: {
            some: {
              tagId: filters.tagId,
            },
          },
        },
        {
          qualifications: {
            some: {
              status: 'active',
              qualificationType: {
                tagId: filters.tagId,
              },
            },
          },
        },
      ]
    }

    return this.prisma.member.findMany({
      where,
      include: reportMemberInclude,
      orderBy: [
        { division: { name: 'asc' } },
        { rank: 'asc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })
  }

  async findCheckinsForMembers(
    memberIds: string[],
    start: Date,
    end: Date
  ): Promise<OperationalReportCheckinRecord[]> {
    if (memberIds.length === 0) {
      return []
    }

    return this.prisma.checkin.findMany({
      where: {
        memberId: {
          in: memberIds,
        },
        timestamp: {
          gte: start,
          lt: end,
        },
      },
      select: {
        id: true,
        memberId: true,
        direction: true,
        timestamp: true,
        kioskId: true,
      },
      orderBy: [{ memberId: 'asc' }, { timestamp: 'asc' }],
    })
  }

  async findScheduledDutyAssignmentsForMembers(
    memberIds: string[],
    weekStartDate: Date,
    weekEndDate: Date
  ): Promise<OperationalReportScheduledDutyAssignmentRecord[]> {
    if (memberIds.length === 0) {
      return []
    }

    const assignments = await this.prisma.scheduleAssignment.findMany({
      where: {
        memberId: {
          in: memberIds,
        },
        status: {
          not: 'released',
        },
        schedule: {
          weekStartDate: {
            gte: weekStartDate,
            lte: weekEndDate,
          },
          dutyRole: {
            code: {
              in: ['DDS', 'DUTY_WATCH'],
            },
          },
        },
      },
      select: {
        memberId: true,
        dutyPosition: {
          select: {
            code: true,
          },
        },
        schedule: {
          select: {
            dutyRole: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    })

    return assignments.map((assignment) => ({
      memberId: assignment.memberId,
      dutyRoleCode: this.toScheduledDutyRoleCode(
        assignment.schedule.dutyRole.code,
        assignment.dutyPosition?.code ?? null
      ),
    }))
  }

  async findDdsAssignmentsForMembers(
    memberIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<OperationalReportScheduledDutyAssignmentRecord[]> {
    if (memberIds.length === 0) {
      return []
    }

    const assignments = await this.prisma.ddsAssignment.findMany({
      where: {
        memberId: {
          in: memberIds,
        },
        assignedDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        memberId: true,
      },
    })

    return assignments.map((assignment) => ({
      memberId: assignment.memberId,
      dutyRoleCode: 'DDS',
    }))
  }

  async findLiveDutyAssignmentsForMembers(
    memberIds: string[],
    start: Date,
    end: Date
  ): Promise<OperationalReportScheduledDutyAssignmentRecord[]> {
    if (memberIds.length === 0) {
      return []
    }

    const assignments = await this.prisma.liveDutyAssignment.findMany({
      where: {
        memberId: {
          in: memberIds,
        },
        startedAt: {
          lt: end,
        },
        OR: [{ endedAt: null }, { endedAt: { gte: start } }],
      },
      select: {
        memberId: true,
        dutyPosition: {
          select: {
            code: true,
          },
        },
      },
    })

    return assignments.map((assignment) => ({
      memberId: assignment.memberId,
      dutyRoleCode: this.toScheduledDutyRoleCode('DUTY_WATCH', assignment.dutyPosition.code),
    }))
  }

  private toScheduledDutyRoleCode(
    dutyRoleCode: string,
    dutyPositionCode: string | null
  ): OperationalReportScheduledDutyRoleCode {
    if (dutyRoleCode === 'DDS') {
      return 'DDS'
    }

    if (
      dutyPositionCode === 'SWK' ||
      dutyPositionCode === 'DSWK' ||
      dutyPositionCode === 'QM' ||
      dutyPositionCode === 'BM' ||
      dutyPositionCode === 'APS'
    ) {
      return dutyPositionCode
    }

    return 'DUTY_WATCH'
  }

  async findMissedCheckouts(
    startDate: Date,
    endDate: Date
  ): Promise<OperationalReportMissedCheckoutRecord[]> {
    return this.prisma.missedCheckout.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: missedCheckoutInclude,
      orderBy: [{ date: 'desc' }, { forcedCheckoutAt: 'desc' }],
    })
  }

  async findLockupStatuses(
    startDate: Date,
    endDate: Date
  ): Promise<OperationalReportLockupStatusRecord[]> {
    return this.prisma.lockupStatus.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: lockupExceptionStatusInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })
  }

  async findScheduledDutySchedules(
    weekStartDate: Date,
    weekEndDate: Date
  ): Promise<OperationalReportScheduledDutyRecord[]> {
    return this.prisma.weeklySchedule.findMany({
      where: {
        weekStartDate: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
        dutyRole: {
          code: {
            in: ['DDS', 'DUTY_WATCH'],
          },
        },
      },
      include: scheduledDutyInclude,
      orderBy: [{ weekStartDate: 'asc' }],
    })
  }

  async findUnitEvents(
    start: Date,
    end: Date,
    categories: Array<'training' | 'administrative'>
  ): Promise<OperationalReportUnitEventRecord[]> {
    return this.prisma.unitEvent.findMany({
      where: {
        AND: [
          { eventDate: { lt: end } },
          {
            OR: [{ endDate: { gte: start } }, { endDate: null, eventDate: { gte: start } }],
          },
        ],
        status: {
          notIn: ['cancelled', 'postponed'],
        },
        eventType: {
          is: {
            category: {
              in: categories,
            },
          },
        },
      },
      include: unitEventInclude,
      orderBy: [{ eventDate: 'asc' }, { startTime: 'asc' }, { title: 'asc' }],
    })
  }

  async findReportSettingValue(key: string): Promise<unknown | null> {
    const setting = await this.prisma.reportSetting.findUnique({
      where: { key },
      select: { value: true },
    })

    return setting?.value ?? null
  }

  async findAppSettingValue(key: string): Promise<unknown | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    })

    return setting?.value ?? null
  }

  async findVisitors(
    filters: OperationalReportVisitorFilters
  ): Promise<OperationalReportVisitorRecord[]> {
    const where: Prisma.VisitorWhereInput = {
      checkInTime: {
        gte: filters.start,
        lt: filters.end,
      },
    }

    if (filters.visitType) {
      where.visitType = filters.visitType
    }

    if (filters.visitorPurpose) {
      where.OR = [
        {
          visitPurpose: {
            contains: filters.visitorPurpose,
            mode: 'insensitive',
          },
        },
        {
          visitReason: {
            contains: filters.visitorPurpose,
            mode: 'insensitive',
          },
        },
        {
          purposeDetails: {
            contains: filters.visitorPurpose,
            mode: 'insensitive',
          },
        },
      ]
    }

    if (filters.eventLinked !== undefined) {
      where.eventId = filters.eventLinked ? { not: null } : null
    }

    if (filters.hostMemberId) {
      where.hostMemberId = filters.hostMemberId
    }

    if (filters.organization) {
      where.organization = {
        contains: filters.organization,
        mode: 'insensitive',
      }
    }

    return this.prisma.visitor.findMany({
      where,
      include: visitorInclude,
      orderBy: [{ checkInTime: 'asc' }, { name: 'asc' }],
    })
  }
}
