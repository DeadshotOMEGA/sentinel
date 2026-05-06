import type { PrismaClientInstance } from '@sentinel/database'
import { Prisma, prisma as defaultPrisma } from '@sentinel/database'

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
      rank: true,
      firstName: true,
      lastName: true,
      displayName: true,
    },
  },
} satisfies Prisma.VisitorInclude

export type OperationalReportMemberRecord = Prisma.MemberGetPayload<{
  include: typeof reportMemberInclude
}>

export interface OperationalReportCheckinRecord {
  id: string
  memberId: string | null
  direction: string
  timestamp: Date
}

export type OperationalReportUnitEventRecord = Prisma.UnitEventGetPayload<{
  include: typeof unitEventInclude
}>

export type OperationalReportVisitorRecord = Prisma.VisitorGetPayload<{
  include: typeof visitorInclude
}>

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
      },
      orderBy: [{ memberId: 'asc' }, { timestamp: 'asc' }],
    })
  }

  async findUnitEvents(
    start: Date,
    end: Date,
    categories: Array<'training' | 'administrative'>
  ): Promise<OperationalReportUnitEventRecord[]> {
    return this.prisma.unitEvent.findMany({
      where: {
        eventDate: {
          gte: start,
          lt: end,
        },
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
