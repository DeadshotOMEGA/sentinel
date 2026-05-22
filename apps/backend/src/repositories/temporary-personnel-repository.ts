import type { Prisma, PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type {
  CreateTemporaryPersonnelAssignmentInput,
  CreateTemporaryPersonnelInput,
  ManualTemporaryPersonnelCheckinInput,
  TemporaryPersonnelAssignmentListQuery,
  TemporaryPersonnelAssignmentResponse,
  TemporaryPersonnelCheckinResponse,
  TemporaryPersonnelHistoryResponse,
  TemporaryPersonnelNfcAssignmentResponse,
  TemporaryPersonnelResponse,
  TemporaryPersonnelScanInput,
  TemporaryPersonnelScanResponse,
  UpdateTemporaryPersonnelAssignmentInput,
  UpdateTemporaryPersonnelInput,
} from '@sentinel/contracts'

type TemporaryPersonnelDbClient = PrismaClientInstance | Prisma.TransactionClient
type TemporaryPersonnelAssignmentStatus = 'draft' | 'active' | 'ended' | 'revoked'
type TemporaryPersonnelStatus = 'active' | 'ended' | 'revoked'
type TemporaryPersonnelNfcAssignmentStatus = 'assigned' | 'ended' | 'returned' | 'revoked'
type TemporaryPersonnelCheckinDirection = 'in' | 'out'

const TEMPORARY_PERSONNEL_INCLUDE = {
  nfcAssignments: {
    include: {
      badge: true,
    },
    orderBy: {
      assignedAt: 'desc',
    },
  },
  checkins: {
    orderBy: {
      timestamp: 'desc',
    },
    take: 1,
  },
} satisfies Prisma.TemporaryPersonnelInclude

const ASSIGNMENT_INCLUDE = {
  personnel: {
    include: TEMPORARY_PERSONNEL_INCLUDE,
    orderBy: {
      displayName: 'asc',
    },
  },
} satisfies Prisma.TemporaryPersonnelAssignmentInclude

const ASSIGNMENT_WITH_PERSONNEL_INCLUDE = {
  assignment: true,
  nfcAssignments: {
    include: {
      badge: true,
    },
    orderBy: {
      assignedAt: 'desc',
    },
  },
  checkins: {
    orderBy: {
      timestamp: 'desc',
    },
    take: 1,
  },
} satisfies Prisma.TemporaryPersonnelInclude

type PersonnelWithState = Prisma.TemporaryPersonnelGetPayload<{
  include: typeof ASSIGNMENT_WITH_PERSONNEL_INCLUDE
}>

type PersonnelForAssignment = Prisma.TemporaryPersonnelGetPayload<{
  include: typeof TEMPORARY_PERSONNEL_INCLUDE
}>

type AssignmentWithPersonnel = Prisma.TemporaryPersonnelAssignmentGetPayload<{
  include: typeof ASSIGNMENT_INCLUDE
}>

type NfcAssignmentWithBadge = Prisma.TemporaryPersonnelNfcAssignmentGetPayload<{
  include: { badge: true }
}>

type CheckinRecord = Prisma.TemporaryPersonnelCheckinGetPayload<object>

export class TemporaryPersonnelRepositoryError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 409 = 400,
    public readonly code: string = 'TEMPORARY_PERSONNEL_ERROR'
  ) {
    super(message)
    this.name = 'TemporaryPersonnelRepositoryError'
  }
}

export class TemporaryPersonnelRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  private toIso(value: Date | null | undefined): string | null {
    return value ? value.toISOString() : null
  }

  private toNfcAssignmentResponse(
    assignment: NfcAssignmentWithBadge
  ): TemporaryPersonnelNfcAssignmentResponse {
    return {
      id: assignment.id,
      temporaryPersonnelId: assignment.temporaryPersonnelId,
      badgeId: assignment.badgeId,
      badgeSerialNumber: assignment.badge.serialNumber,
      status: assignment.status as TemporaryPersonnelNfcAssignmentStatus,
      assignedAt: assignment.assignedAt.toISOString(),
      endedAt: this.toIso(assignment.endedAt),
      returnedAt: this.toIso(assignment.returnedAt),
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    }
  }

  private toCheckinResponse(checkin: CheckinRecord): TemporaryPersonnelCheckinResponse {
    return {
      id: checkin.id,
      temporaryPersonnelId: checkin.temporaryPersonnelId,
      badgeId: checkin.badgeId,
      nfcAssignmentId: checkin.nfcAssignmentId,
      direction: checkin.direction as TemporaryPersonnelCheckinDirection,
      timestamp: checkin.timestamp.toISOString(),
      kioskId: checkin.kioskId,
      method: checkin.method,
      reason: checkin.reason,
      createdByAdmin: checkin.createdByAdmin,
      createdAt: checkin.createdAt.toISOString(),
    }
  }

  private toPersonnelResponse(person: PersonnelForAssignment): TemporaryPersonnelResponse {
    const currentNfcAssignment =
      person.nfcAssignments.find(
        (assignment) =>
          assignment.status === 'assigned' && !assignment.endedAt && !assignment.returnedAt
      ) ?? null
    const lastCheckin = person.checkins[0] ?? null

    return {
      id: person.id,
      assignmentId: person.assignmentId,
      displayName: person.displayName,
      rankPrefix: person.rankPrefix,
      firstName: person.firstName,
      lastName: person.lastName,
      organization: person.organization,
      role: person.role,
      mobilePhone: person.mobilePhone,
      notes: person.notes,
      status: person.status as TemporaryPersonnelStatus,
      endedAt: this.toIso(person.endedAt),
      revokedAt: this.toIso(person.revokedAt),
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
      currentNfcAssignment: currentNfcAssignment
        ? this.toNfcAssignmentResponse(currentNfcAssignment)
        : null,
      lastCheckin: lastCheckin ? this.toCheckinResponse(lastCheckin) : null,
    }
  }

  private toPersonnelResponseWithAssignment(
    person: PersonnelWithState
  ): TemporaryPersonnelResponse {
    return this.toPersonnelResponse({
      ...person,
      nfcAssignments: person.nfcAssignments,
      checkins: person.checkins,
    })
  }

  private isPresent(person: PersonnelForAssignment): boolean {
    return person.checkins[0]?.direction === 'in'
  }

  private toAssignmentResponse(
    assignment: AssignmentWithPersonnel
  ): TemporaryPersonnelAssignmentResponse {
    const personnel = assignment.personnel.map((person) => this.toPersonnelResponse(person))

    return {
      id: assignment.id,
      name: assignment.name,
      sponsorName: assignment.sponsorName,
      sponsorMemberId: assignment.sponsorMemberId,
      unitEventId: assignment.unitEventId,
      startsAt: assignment.startsAt.toISOString(),
      endsAt: assignment.endsAt.toISOString(),
      status: assignment.status as TemporaryPersonnelAssignmentStatus,
      notes: assignment.notes,
      endedAt: this.toIso(assignment.endedAt),
      revokedAt: this.toIso(assignment.revokedAt),
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
      personnelCount: personnel.length,
      activePersonnelCount: assignment.personnel.filter((person) => person.status === 'active')
        .length,
      presentPersonnelCount: assignment.personnel.filter((person) => this.isPresent(person)).length,
      personnel,
    }
  }

  private async getAssignmentOrThrow(
    client: TemporaryPersonnelDbClient,
    id: string
  ): Promise<AssignmentWithPersonnel> {
    const assignment = await client.temporaryPersonnelAssignment.findUnique({
      where: { id },
      include: ASSIGNMENT_INCLUDE,
    })

    if (!assignment) {
      throw new TemporaryPersonnelRepositoryError('Temporary personnel assignment not found', 404)
    }

    return assignment
  }

  private async getPersonnelOrThrow(
    client: TemporaryPersonnelDbClient,
    id: string
  ): Promise<PersonnelWithState> {
    const person = await client.temporaryPersonnel.findUnique({
      where: { id },
      include: ASSIGNMENT_WITH_PERSONNEL_INCLUDE,
    })

    if (!person) {
      throw new TemporaryPersonnelRepositoryError('Temporary personnel record not found', 404)
    }

    return person
  }

  private async checkoutIfPresent(
    client: TemporaryPersonnelDbClient,
    personId: string,
    timestamp: Date,
    reason: string
  ): Promise<void> {
    const lastCheckin = await client.temporaryPersonnelCheckin.findFirst({
      where: { temporaryPersonnelId: personId },
      orderBy: { timestamp: 'desc' },
    })

    if (lastCheckin?.direction !== 'in') return

    await client.temporaryPersonnelCheckin.create({
      data: {
        temporaryPersonnelId: personId,
        badgeId: lastCheckin.badgeId,
        nfcAssignmentId: lastCheckin.nfcAssignmentId,
        direction: 'out',
        timestamp,
        kioskId: lastCheckin.kioskId,
        method: 'admin_auto',
        reason,
      },
    })
  }

  private async closeActiveNfcAssignments(
    client: TemporaryPersonnelDbClient,
    personId: string,
    status: Exclude<TemporaryPersonnelNfcAssignmentStatus, 'assigned'>,
    timestamp: Date
  ): Promise<void> {
    const assignments = await client.temporaryPersonnelNfcAssignment.findMany({
      where: {
        temporaryPersonnelId: personId,
        status: 'assigned',
        endedAt: null,
        returnedAt: null,
      },
    })

    for (const assignment of assignments) {
      await client.temporaryPersonnelNfcAssignment.update({
        where: { id: assignment.id },
        data: {
          status,
          endedAt: timestamp,
          returnedAt: status === 'returned' ? timestamp : null,
          updatedAt: timestamp,
        },
      })

      await client.badge.updateMany({
        where: {
          id: assignment.badgeId,
          assignmentType: 'temporary_personnel',
          assignedToId: personId,
        },
        data: {
          assignmentType: 'unassigned',
          assignedToId: null,
          updatedAt: timestamp,
        },
      })
    }
  }

  async listAssignments(
    query: TemporaryPersonnelAssignmentListQuery = {}
  ): Promise<{ assignments: TemporaryPersonnelAssignmentResponse[]; total: number }> {
    const includeHistory = query.includeHistory ?? false
    const assignments = await this.prisma.temporaryPersonnelAssignment.findMany({
      where: includeHistory ? undefined : { status: { in: ['draft', 'active'] } },
      include: ASSIGNMENT_INCLUDE,
      orderBy: [{ startsAt: 'desc' }, { name: 'asc' }],
    })

    return {
      assignments: assignments.map((assignment) => this.toAssignmentResponse(assignment)),
      total: assignments.length,
    }
  }

  async getAssignment(id: string): Promise<TemporaryPersonnelAssignmentResponse> {
    return this.toAssignmentResponse(await this.getAssignmentOrThrow(this.prisma, id))
  }

  async createAssignment(
    data: CreateTemporaryPersonnelAssignmentInput
  ): Promise<TemporaryPersonnelAssignmentResponse> {
    const startsAt = new Date(data.startsAt)
    const endsAt = new Date(data.endsAt)

    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new TemporaryPersonnelRepositoryError('Assignment end must be after start')
    }

    if (data.sponsorMemberId) {
      const sponsor = await this.prisma.member.findUnique({
        where: { id: data.sponsorMemberId },
        select: { id: true },
      })
      if (!sponsor) {
        throw new TemporaryPersonnelRepositoryError('Sponsor member not found', 404)
      }
    }

    if (data.unitEventId) {
      const unitEvent = await this.prisma.unitEvent.findUnique({
        where: { id: data.unitEventId },
        select: { id: true },
      })
      if (!unitEvent) {
        throw new TemporaryPersonnelRepositoryError('Unit event not found', 404)
      }
    }

    const assignment = await this.prisma.temporaryPersonnelAssignment.create({
      data: {
        name: data.name,
        sponsorName: data.sponsorName,
        sponsorMemberId: data.sponsorMemberId,
        unitEventId: data.unitEventId,
        startsAt,
        endsAt,
        status: data.status ?? 'draft',
        notes: data.notes,
      },
      include: ASSIGNMENT_INCLUDE,
    })

    return this.toAssignmentResponse(assignment)
  }

  async updateAssignment(
    id: string,
    data: UpdateTemporaryPersonnelAssignmentInput
  ): Promise<TemporaryPersonnelAssignmentResponse> {
    const existing = await this.getAssignmentOrThrow(this.prisma, id)
    if (existing.status === 'ended' || existing.status === 'revoked') {
      throw new TemporaryPersonnelRepositoryError(
        'Ended or revoked temporary personnel assignments cannot be edited',
        409,
        'ASSIGNMENT_CLOSED'
      )
    }

    const startsAt = data.startsAt ? new Date(data.startsAt) : existing.startsAt
    const endsAt = data.endsAt ? new Date(data.endsAt) : existing.endsAt
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new TemporaryPersonnelRepositoryError('Assignment end must be after start')
    }

    const assignment = await this.prisma.temporaryPersonnelAssignment.update({
      where: { id },
      data: {
        name: data.name,
        sponsorName: data.sponsorName,
        sponsorMemberId: data.sponsorMemberId,
        unitEventId: data.unitEventId,
        startsAt: data.startsAt ? startsAt : undefined,
        endsAt: data.endsAt ? endsAt : undefined,
        status: data.status,
        notes: data.notes,
        updatedAt: new Date(),
      },
      include: ASSIGNMENT_INCLUDE,
    })

    return this.toAssignmentResponse(assignment)
  }

  async addPersonnel(
    assignmentId: string,
    data: CreateTemporaryPersonnelInput
  ): Promise<TemporaryPersonnelResponse> {
    const assignment = await this.getAssignmentOrThrow(this.prisma, assignmentId)
    if (assignment.status === 'ended' || assignment.status === 'revoked') {
      throw new TemporaryPersonnelRepositoryError(
        'Cannot add temporary personnel to an ended or revoked assignment',
        409,
        'ASSIGNMENT_CLOSED'
      )
    }

    const person = await this.prisma.temporaryPersonnel.create({
      data: {
        assignmentId,
        displayName: data.displayName,
        rankPrefix: data.rankPrefix,
        firstName: data.firstName,
        lastName: data.lastName,
        organization: data.organization,
        role: data.role,
        mobilePhone: data.mobilePhone,
        notes: data.notes,
      },
      include: ASSIGNMENT_WITH_PERSONNEL_INCLUDE,
    })

    return this.toPersonnelResponseWithAssignment(person)
  }

  async updatePersonnel(
    id: string,
    data: UpdateTemporaryPersonnelInput
  ): Promise<TemporaryPersonnelResponse> {
    const existing = await this.getPersonnelOrThrow(this.prisma, id)
    if (existing.status !== 'active') {
      throw new TemporaryPersonnelRepositoryError(
        'Ended or revoked temporary personnel records cannot be edited',
        409,
        'PERSONNEL_CLOSED'
      )
    }

    const person = await this.prisma.temporaryPersonnel.update({
      where: { id },
      data: {
        displayName: data.displayName,
        rankPrefix: data.rankPrefix,
        firstName: data.firstName,
        lastName: data.lastName,
        organization: data.organization,
        role: data.role,
        mobilePhone: data.mobilePhone,
        notes: data.notes,
        updatedAt: new Date(),
      },
      include: ASSIGNMENT_WITH_PERSONNEL_INCLUDE,
    })

    return this.toPersonnelResponseWithAssignment(person)
  }

  async assignNfcTag(personId: string, badgeId: string): Promise<TemporaryPersonnelResponse> {
    const person = await this.prisma.$transaction(async (tx) => {
      const target = await this.getPersonnelOrThrow(tx, personId)
      if (target.status !== 'active') {
        throw new TemporaryPersonnelRepositoryError(
          'Only active temporary personnel can receive NFC tags',
          409,
          'PERSONNEL_CLOSED'
        )
      }
      if (target.assignment.status !== 'draft' && target.assignment.status !== 'active') {
        throw new TemporaryPersonnelRepositoryError(
          'Temporary personnel assignment is not open for tag assignment',
          409,
          'ASSIGNMENT_CLOSED'
        )
      }

      const existingAssignment = await tx.temporaryPersonnelNfcAssignment.findFirst({
        where: {
          temporaryPersonnelId: personId,
          status: 'assigned',
          endedAt: null,
          returnedAt: null,
        },
      })
      if (existingAssignment) {
        throw new TemporaryPersonnelRepositoryError(
          'Temporary personnel already has an assigned NFC tag',
          409,
          'TAG_ALREADY_ASSIGNED'
        )
      }

      const badge = await tx.badge.findUnique({
        where: { id: badgeId },
      })
      if (!badge) {
        throw new TemporaryPersonnelRepositoryError('Badge not found', 404)
      }
      if (
        badge.status !== 'active' ||
        badge.assignmentType !== 'unassigned' ||
        badge.assignedToId !== null
      ) {
        throw new TemporaryPersonnelRepositoryError(
          'Badge must be active and unassigned before it can be issued to temporary personnel',
          409,
          'BADGE_NOT_AVAILABLE'
        )
      }

      const timestamp = new Date()
      await tx.temporaryPersonnelNfcAssignment.create({
        data: {
          temporaryPersonnelId: personId,
          badgeId,
          status: 'assigned',
          assignedAt: timestamp,
        },
      })
      await tx.badge.update({
        where: { id: badgeId },
        data: {
          assignmentType: 'temporary_personnel',
          assignedToId: personId,
          updatedAt: timestamp,
        },
      })

      return this.getPersonnelOrThrow(tx, personId)
    })

    return this.toPersonnelResponseWithAssignment(person)
  }

  async returnNfcTag(assignmentId: string): Promise<void> {
    const timestamp = new Date()

    await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.temporaryPersonnelNfcAssignment.findUnique({
        where: { id: assignmentId },
      })

      if (!assignment) {
        throw new TemporaryPersonnelRepositoryError(
          'Temporary personnel NFC assignment not found',
          404
        )
      }

      if (assignment.status !== 'assigned' || assignment.returnedAt || assignment.endedAt) {
        throw new TemporaryPersonnelRepositoryError(
          'Temporary personnel NFC assignment is already closed',
          409,
          'TAG_ASSIGNMENT_CLOSED'
        )
      }

      await tx.temporaryPersonnelNfcAssignment.update({
        where: { id: assignment.id },
        data: {
          status: 'returned',
          endedAt: timestamp,
          returnedAt: timestamp,
          updatedAt: timestamp,
        },
      })

      await tx.badge.updateMany({
        where: {
          id: assignment.badgeId,
          assignmentType: 'temporary_personnel',
          assignedToId: assignment.temporaryPersonnelId,
        },
        data: {
          assignmentType: 'unassigned',
          assignedToId: null,
          updatedAt: timestamp,
        },
      })
    })
  }

  async scan(data: TemporaryPersonnelScanInput): Promise<TemporaryPersonnelScanResponse> {
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date()

    const result = await this.prisma.$transaction(async (tx) => {
      const badge = await tx.badge.findUnique({
        where: { serialNumber: data.serialNumber },
      })

      if (!badge) {
        throw new TemporaryPersonnelRepositoryError('NFC tag not found', 404)
      }
      if (badge.status !== 'active' || badge.assignmentType !== 'temporary_personnel') {
        throw new TemporaryPersonnelRepositoryError(
          'NFC tag is not assigned to temporary personnel',
          403,
          'TAG_NOT_TEMPORARY_PERSONNEL'
        )
      }
      if (!badge.assignedToId) {
        throw new TemporaryPersonnelRepositoryError(
          'NFC tag is missing a temporary personnel assignment',
          409,
          'TAG_ASSIGNMENT_INVALID'
        )
      }

      const person = await this.getPersonnelOrThrow(tx, badge.assignedToId)
      if (person.status !== 'active') {
        throw new TemporaryPersonnelRepositoryError(
          'Temporary personnel access is not active',
          403,
          'PERSONNEL_NOT_ACTIVE'
        )
      }
      if (person.assignment.status !== 'active') {
        throw new TemporaryPersonnelRepositoryError(
          'Temporary personnel assignment is not active',
          403,
          'ASSIGNMENT_NOT_ACTIVE'
        )
      }
      if (timestamp < person.assignment.startsAt || timestamp > person.assignment.endsAt) {
        throw new TemporaryPersonnelRepositoryError(
          'Temporary personnel assignment is outside its approved access window',
          403,
          'ASSIGNMENT_WINDOW_CLOSED'
        )
      }

      const nfcAssignment = await tx.temporaryPersonnelNfcAssignment.findFirst({
        where: {
          temporaryPersonnelId: person.id,
          badgeId: badge.id,
          status: 'assigned',
          endedAt: null,
          returnedAt: null,
        },
        include: { badge: true },
        orderBy: { assignedAt: 'desc' },
      })

      if (!nfcAssignment) {
        throw new TemporaryPersonnelRepositoryError(
          'Temporary personnel NFC assignment is not active',
          403,
          'TAG_ASSIGNMENT_CLOSED'
        )
      }

      const latestCheckin = await tx.temporaryPersonnelCheckin.findFirst({
        where: { temporaryPersonnelId: person.id },
        orderBy: { timestamp: 'desc' },
      })
      const direction: TemporaryPersonnelCheckinDirection =
        latestCheckin?.direction === 'in' ? 'out' : 'in'

      const checkin = await tx.temporaryPersonnelCheckin.create({
        data: {
          temporaryPersonnelId: person.id,
          badgeId: badge.id,
          nfcAssignmentId: nfcAssignment.id,
          direction,
          timestamp,
          kioskId: data.kioskId,
          method: 'badge',
        },
      })

      await tx.badge.update({
        where: { id: badge.id },
        data: {
          lastUsed: timestamp,
          updatedAt: timestamp,
        },
      })

      const refreshedPerson = await this.getPersonnelOrThrow(tx, person.id)
      const assignment = await this.getAssignmentOrThrow(tx, person.assignmentId)

      return {
        direction,
        person: refreshedPerson,
        assignment,
        checkin,
      }
    })

    const name = result.person.displayName
    return {
      success: true,
      direction: result.direction,
      temporaryPersonnel: this.toPersonnelResponseWithAssignment(result.person),
      assignment: this.toAssignmentResponse(result.assignment),
      checkin: this.toCheckinResponse(result.checkin),
      message: `${name} checked ${result.direction}`,
    }
  }

  async manualCheckin(
    personId: string,
    data: ManualTemporaryPersonnelCheckinInput
  ): Promise<TemporaryPersonnelCheckinResponse> {
    const person = await this.getPersonnelOrThrow(this.prisma, personId)
    if (person.status !== 'active') {
      throw new TemporaryPersonnelRepositoryError(
        'Temporary personnel access is not active',
        409,
        'PERSONNEL_NOT_ACTIVE'
      )
    }

    const currentNfcAssignment =
      person.nfcAssignments.find(
        (assignment) =>
          assignment.status === 'assigned' && !assignment.endedAt && !assignment.returnedAt
      ) ?? null

    const checkin = await this.prisma.temporaryPersonnelCheckin.create({
      data: {
        temporaryPersonnelId: person.id,
        badgeId: currentNfcAssignment?.badgeId,
        nfcAssignmentId: currentNfcAssignment?.id,
        direction: data.direction,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        kioskId: data.kioskId ?? 'admin',
        method: 'admin_manual',
        reason: data.reason,
      },
    })

    return this.toCheckinResponse(checkin)
  }

  async endPersonnel(personId: string, reason?: string): Promise<TemporaryPersonnelResponse> {
    return this.closePersonnel(personId, 'ended', reason)
  }

  async revokePersonnel(personId: string, reason?: string): Promise<TemporaryPersonnelResponse> {
    return this.closePersonnel(personId, 'revoked', reason)
  }

  private async closePersonnel(
    personId: string,
    status: Exclude<TemporaryPersonnelStatus, 'active'>,
    reason?: string
  ): Promise<TemporaryPersonnelResponse> {
    const timestamp = new Date()
    const person = await this.prisma.$transaction(async (tx) => {
      const existing = await this.getPersonnelOrThrow(tx, personId)
      if (existing.status !== 'active') {
        throw new TemporaryPersonnelRepositoryError(
          'Temporary personnel access is already closed',
          409,
          'PERSONNEL_CLOSED'
        )
      }

      await this.checkoutIfPresent(
        tx,
        personId,
        timestamp,
        reason ?? `Temporary personnel access ${status}`
      )
      await this.closeActiveNfcAssignments(
        tx,
        personId,
        status === 'ended' ? 'ended' : 'revoked',
        timestamp
      )
      await tx.temporaryPersonnel.update({
        where: { id: personId },
        data: {
          status,
          endedAt: status === 'ended' ? timestamp : null,
          revokedAt: status === 'revoked' ? timestamp : null,
          updatedAt: timestamp,
        },
      })

      return this.getPersonnelOrThrow(tx, personId)
    })

    return this.toPersonnelResponseWithAssignment(person)
  }

  async endAssignment(id: string, reason?: string): Promise<TemporaryPersonnelAssignmentResponse> {
    return this.closeAssignment(id, 'ended', reason)
  }

  async revokeAssignment(
    id: string,
    reason?: string
  ): Promise<TemporaryPersonnelAssignmentResponse> {
    return this.closeAssignment(id, 'revoked', reason)
  }

  private async closeAssignment(
    id: string,
    status: Exclude<TemporaryPersonnelAssignmentStatus, 'draft' | 'active'>,
    reason?: string
  ): Promise<TemporaryPersonnelAssignmentResponse> {
    const timestamp = new Date()

    const assignment = await this.prisma.$transaction(async (tx) => {
      const existing = await this.getAssignmentOrThrow(tx, id)
      if (existing.status === 'ended' || existing.status === 'revoked') {
        throw new TemporaryPersonnelRepositoryError(
          'Temporary personnel assignment is already closed',
          409,
          'ASSIGNMENT_CLOSED'
        )
      }

      for (const person of existing.personnel.filter((item) => item.status === 'active')) {
        await this.checkoutIfPresent(
          tx,
          person.id,
          timestamp,
          reason ?? `Temporary personnel assignment ${status}`
        )
        await this.closeActiveNfcAssignments(
          tx,
          person.id,
          status === 'ended' ? 'ended' : 'revoked',
          timestamp
        )
        await tx.temporaryPersonnel.update({
          where: { id: person.id },
          data: {
            status,
            endedAt: status === 'ended' ? timestamp : null,
            revokedAt: status === 'revoked' ? timestamp : null,
            updatedAt: timestamp,
          },
        })
      }

      await tx.temporaryPersonnelAssignment.update({
        where: { id },
        data: {
          status,
          endedAt: status === 'ended' ? timestamp : null,
          revokedAt: status === 'revoked' ? timestamp : null,
          updatedAt: timestamp,
        },
      })

      return this.getAssignmentOrThrow(tx, id)
    })

    return this.toAssignmentResponse(assignment)
  }

  async getHistory(id: string): Promise<TemporaryPersonnelHistoryResponse> {
    const assignment = await this.getAssignmentOrThrow(this.prisma, id)
    const personnelIds = assignment.personnel.map((person) => person.id)

    const [checkins, nfcAssignments] = await Promise.all([
      this.prisma.temporaryPersonnelCheckin.findMany({
        where: { temporaryPersonnelId: { in: personnelIds } },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.temporaryPersonnelNfcAssignment.findMany({
        where: { temporaryPersonnelId: { in: personnelIds } },
        include: { badge: true },
        orderBy: { assignedAt: 'desc' },
      }),
    ])

    return {
      assignment: this.toAssignmentResponse(assignment),
      checkins: checkins.map((checkin) => this.toCheckinResponse(checkin)),
      nfcAssignments: nfcAssignments.map((nfcAssignment) =>
        this.toNfcAssignmentResponse(nfcAssignment)
      ),
    }
  }

  async getPresentPersonnel(): Promise<
    Array<TemporaryPersonnelResponse & { assignmentName: string; assignmentId: string }>
  > {
    const activePeople = await this.prisma.temporaryPersonnel.findMany({
      where: {
        status: 'active',
        assignment: {
          status: 'active',
        },
      },
      include: ASSIGNMENT_WITH_PERSONNEL_INCLUDE,
      orderBy: { displayName: 'asc' },
    })

    return activePeople
      .filter((person) => person.checkins[0]?.direction === 'in')
      .map((person) => ({
        ...this.toPersonnelResponseWithAssignment(person),
        assignmentName: person.assignment.name,
        assignmentId: person.assignmentId,
      }))
  }

  async getActivePersonnelCount(): Promise<number> {
    return this.prisma.temporaryPersonnel.count({
      where: {
        status: 'active',
        assignment: {
          status: 'active',
        },
      },
    })
  }

  async getRecentActivity(limit: number): Promise<
    Array<{
      type: 'temporary_personnel'
      id: string
      timestamp: string
      direction: TemporaryPersonnelCheckinDirection
      name: string
      displayName: string
      organization: string
      role?: string
      kioskId: string
      temporaryPersonnelAssignmentId: string
      temporaryPersonnelAssignmentName: string
    }>
  > {
    const checkins = await this.prisma.temporaryPersonnelCheckin.findMany({
      include: {
        temporaryPersonnel: {
          include: {
            assignment: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    return checkins.map((checkin) => ({
      type: 'temporary_personnel',
      id: checkin.id,
      timestamp: checkin.timestamp.toISOString(),
      direction: checkin.direction as TemporaryPersonnelCheckinDirection,
      name: checkin.temporaryPersonnel.displayName,
      displayName: checkin.temporaryPersonnel.displayName,
      organization: checkin.temporaryPersonnel.organization,
      role: checkin.temporaryPersonnel.role ?? undefined,
      kioskId: checkin.kioskId,
      temporaryPersonnelAssignmentId: checkin.temporaryPersonnel.assignmentId,
      temporaryPersonnelAssignmentName: checkin.temporaryPersonnel.assignment.name,
    }))
  }
}
