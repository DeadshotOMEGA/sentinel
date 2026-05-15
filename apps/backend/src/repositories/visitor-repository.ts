import type { Prisma, PrismaClientInstance, Visitor as PrismaVisitor } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type {
  Visitor,
  CreateVisitorInput,
  UpdateVisitorInput,
  CreateVisitorGroupInput,
  CreateVisitorGroupResult,
  CheckoutVisitorGroupInput,
  CheckoutVisitorGroupResult,
} from '@sentinel/types'
import {
  buildLegacyVisitorName,
  buildVisitorDisplayName,
  computeCollisionKey,
  getVisitorInitials,
  normalizeNamePart,
  splitLegacyVisitorName,
} from '../utils/display-name.js'
import { isSentinelBootstrapMember } from '../lib/system-bootstrap.js'

interface VisitorFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  visitType?: string
  hostMemberId?: string
}

interface VisitorGroupVehicleEntity {
  id: string
  visitorGroupId: string
  licensePlate: string
  normalizedLicensePlate: string
  createdAt: Date
}

type VisitorDbClient = PrismaClientInstance | Prisma.TransactionClient

interface VisitorEventAssociation {
  eventId: string | null
  unitEventId: string | null
}

export class VisitorEventAssociationError extends Error {
  constructor(message = 'Selected event is no longer available') {
    super(message)
    this.name = 'VisitorEventAssociationError'
  }
}

export class VisitorEventOptionError extends Error {
  constructor(message = 'Selected event option is no longer available') {
    super(message)
    this.name = 'VisitorEventOptionError'
  }
}

export class VisitorRepository {
  private prisma: PrismaClientInstance

  /**
   * @param prismaClient - Optional Prisma client (injected in tests)
   */
  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  private getDisplayKeyForVisitor(visitor: {
    firstName?: string | null
    lastName?: string | null
  }): string {
    const initials = getVisitorInitials(visitor.firstName)
    return computeCollisionKey(visitor.lastName, initials)
  }

  private async recomputeDisplayNamesByKeys(tx: VisitorDbClient, keys: Set<string>): Promise<void> {
    const normalizedKeys = Array.from(keys).filter(Boolean)
    if (normalizedKeys.length === 0) return

    const visitors = await tx.visitor.findMany({
      select: {
        id: true,
        name: true,
        rankPrefix: true,
        firstName: true,
        lastName: true,
      },
    })

    const collisionCounts = new Map<string, number>()
    for (const visitor of visitors) {
      const key = this.getDisplayKeyForVisitor(visitor)
      if (!key) continue
      collisionCounts.set(key, (collisionCounts.get(key) ?? 0) + 1)
    }

    const updates = visitors
      .filter((visitor) => normalizedKeys.includes(this.getDisplayKeyForVisitor(visitor)))
      .map((visitor) => {
        const key = this.getDisplayKeyForVisitor(visitor)
        const useLongForm = (collisionCounts.get(key) ?? 0) > 1
        const displayName = buildVisitorDisplayName({
          rankPrefix: visitor.rankPrefix,
          firstName: visitor.firstName,
          lastName: visitor.lastName,
          legacyName: visitor.name,
          useLongForm,
        })
        return tx.visitor.update({
          where: { id: visitor.id },
          data: { displayName },
        })
      })

    if (updates.length > 0) {
      await Promise.all(updates)
    }
  }

  private normalizeVehicleLicensePlate(licensePlate: string): string {
    return licensePlate.trim().toUpperCase()
  }

  private async resolveVisitorEventAssociation(
    tx: VisitorDbClient,
    input: { eventId?: string; unitEventId?: string }
  ): Promise<VisitorEventAssociation> {
    const eventId = input.eventId?.trim()
    const unitEventId = input.unitEventId?.trim()

    if (!eventId && !unitEventId) {
      return { eventId: null, unitEventId: null }
    }

    if (unitEventId) {
      const unitEvent = await tx.unitEvent.findUnique({
        where: { id: unitEventId },
        select: { id: true },
      })

      if (!unitEvent) {
        throw new VisitorEventAssociationError(
          'Selected event is no longer available. Refresh the visitor sign-in and select the event again.'
        )
      }

      if (!eventId || eventId === unitEventId) {
        return { eventId: null, unitEventId }
      }

      const legacyEvent = await tx.event.findUnique({
        where: { id: eventId },
        select: { id: true },
      })

      if (!legacyEvent) {
        throw new VisitorEventAssociationError(
          'Selected event is no longer available. Refresh the visitor sign-in and select the event again.'
        )
      }

      return { eventId, unitEventId }
    }

    if (!eventId) {
      return { eventId: null, unitEventId: null }
    }

    const legacyEvent = await tx.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    })

    if (legacyEvent) {
      return { eventId, unitEventId: null }
    }

    const unitEvent = await tx.unitEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    })

    if (unitEvent) {
      return { eventId: null, unitEventId: eventId }
    }

    throw new VisitorEventAssociationError(
      'Selected event is no longer available. Refresh the visitor sign-in and select the event again.'
    )
  }

  private async resolveVisitorEventOption(
    tx: VisitorDbClient,
    input: { unitEventVisitorOptionId?: string },
    eventAssociation: VisitorEventAssociation,
    visitorCount: number
  ): Promise<string | null> {
    const optionId = input.unitEventVisitorOptionId?.trim()
    if (!optionId) return null

    if (!eventAssociation.unitEventId) {
      throw new VisitorEventOptionError('Select an event before choosing an event option.')
    }

    const option = await tx.unitEventVisitorOption.findUnique({
      where: { id: optionId },
      select: {
        id: true,
        eventId: true,
        title: true,
        maxSelections: true,
      },
    })

    if (!option || option.eventId !== eventAssociation.unitEventId) {
      throw new VisitorEventOptionError(
        'Selected event option is no longer available. Refresh the visitor sign-in and choose again.'
      )
    }

    if (option.maxSelections !== null) {
      const selectedCount = await tx.visitor.count({
        where: { unitEventVisitorOptionId: option.id },
      })
      if (selectedCount + visitorCount > option.maxSelections) {
        throw new VisitorEventOptionError(
          `${option.title} is full. Choose another option or ask staff for assistance.`
        )
      }
    }

    return option.id
  }

  private buildVisitorCreateRecord(
    data: CreateVisitorInput,
    eventAssociation: VisitorEventAssociation,
    unitEventVisitorOptionId: string | null
  ) {
    const fallbackSplit = splitLegacyVisitorName(data.name ?? '')
    const rankPrefix = normalizeNamePart(data.rankPrefix ?? fallbackSplit.rankPrefix)
    const firstName = normalizeNamePart(data.firstName ?? fallbackSplit.firstName)
    const lastName = normalizeNamePart(data.lastName ?? fallbackSplit.lastName)
    const legacyName = buildLegacyVisitorName({
      rankPrefix,
      firstName,
      lastName,
      legacyName: data.name,
    })

    return {
      rankPrefix,
      firstName,
      lastName,
      data: {
        name: legacyName,
        rankPrefix: rankPrefix || null,
        firstName: firstName || null,
        lastName: lastName || null,
        organization: data.organization,
        unit: data.unit ?? null,
        mobilePhone: data.mobilePhone ?? null,
        licensePlate: data.licensePlate ?? null,
        visitType: data.visitType,
        visitTypeId: data.visitTypeId ?? null,
        hostMemberId: data.hostMemberId ?? null,
        eventId: eventAssociation.eventId,
        unitEventId: eventAssociation.unitEventId,
        unitEventVisitorOptionId,
        visitReason: data.visitReason ?? null,
        visitPurpose: data.visitPurpose ?? null,
        purposeDetails: data.purposeDetails ?? null,
        recruitmentStep: data.recruitmentStep ?? null,
        checkInTime: data.checkInTime ?? new Date(),
        checkOutTime: data.checkOutTime ?? null,
        temporaryBadgeId: data.temporaryBadgeId ?? null,
        kioskId: data.kioskId,
        adminNotes: data.adminNotes ?? null,
        checkInMethod: data.checkInMethod ?? null,
        createdByAdmin: data.createdByAdmin ?? null,
        visitorGroupId: data.visitorGroupId ?? null,
      },
    }
  }

  private async createVisitorInTransaction(
    tx: VisitorDbClient,
    data: CreateVisitorInput,
    keysToRecompute?: Set<string>,
    resolvedEventAssociation?: VisitorEventAssociation,
    resolvedEventOptionId?: string | null
  ): Promise<PrismaVisitor> {
    const eventAssociation =
      resolvedEventAssociation ?? (await this.resolveVisitorEventAssociation(tx, data))
    const unitEventVisitorOptionId =
      resolvedEventOptionId !== undefined
        ? resolvedEventOptionId
        : await this.resolveVisitorEventOption(tx, data, eventAssociation, 1)
    const record = this.buildVisitorCreateRecord(data, eventAssociation, unitEventVisitorOptionId)
    const created = await tx.visitor.create({
      data: record.data,
    })

    const key = this.getDisplayKeyForVisitor({
      firstName: record.firstName || null,
      lastName: record.lastName || null,
    })

    if (key && keysToRecompute) {
      keysToRecompute.add(key)
    } else if (key) {
      await this.recomputeDisplayNamesByKeys(tx, new Set([key]))
    } else {
      await tx.visitor.update({
        where: { id: created.id },
        data: {
          displayName: buildVisitorDisplayName({
            rankPrefix: created.rankPrefix,
            firstName: created.firstName,
            lastName: created.lastName,
            legacyName: created.name,
          }),
        },
      })
    }

    return tx.visitor.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        event: true,
        unitEvent: true,
        unitEventVisitorOption: true,
        hostMember: true,
        badge: true,
      },
    })
  }
  /**
   * Find all visitors with optional filters
   */
  async findAll(filters?: VisitorFilters): Promise<Visitor[]> {
    const where: {
      checkInTime?: { gte: Date; lte: Date }
      visitType?: string
      hostMemberId?: string
    } = {}

    if (filters?.dateRange) {
      where.checkInTime = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      }
    }

    if (filters?.visitType) {
      where.visitType = filters.visitType
    }

    if (filters?.hostMemberId) {
      where.hostMemberId = filters.hostMemberId
    }

    const visitors = await this.prisma.visitor.findMany({
      where,
      orderBy: {
        checkInTime: 'desc',
      },
      include: {
        event: true,
        unitEvent: true,
        unitEventVisitorOption: true,
        hostMember: true,
        badge: true,
      },
    })

    return visitors.map(this.toVisitorType)
  }

  /**
   * Find visitor by ID
   */
  async findById(id: string): Promise<Visitor | null> {
    const visitor = await this.prisma.visitor.findUnique({
      where: { id },
      include: {
        event: true,
        unitEvent: true,
        unitEventVisitorOption: true,
        hostMember: true,
        badge: true,
      },
    })

    if (!visitor) {
      return null
    }

    return this.toVisitorType(visitor)
  }

  /**
   * Find active visitors (not checked out)
   */
  async findActive(): Promise<Visitor[]> {
    const visitors = await this.prisma.visitor.findMany({
      where: {
        checkOutTime: null,
      },
      orderBy: {
        checkInTime: 'desc',
      },
      include: {
        event: true,
        unitEvent: true,
        unitEventVisitorOption: true,
        hostMember: true,
        badge: true,
      },
    })

    return visitors.map(this.toVisitorType)
  }

  /**
   * Find active visitors with relations (host member, event)
   */
  async findActiveWithRelations(): Promise<
    Array<
      Visitor & {
        hostName?: string
        eventName?: string
        visitTypeInfo?: { id: string; name: string; chipVariant?: string; chipColor?: string }
      }
    >
  > {
    const visitors = await this.prisma.visitor.findMany({
      where: {
        checkOutTime: null,
      },
      orderBy: {
        checkInTime: 'desc',
      },
      include: {
        event: true,
        unitEvent: true,
        unitEventVisitorOption: true,
        hostMember: true,
        badge: true,
        visitTypeRef: true,
      },
    })

    return visitors.map((v) => this.toVisitorWithRelations(v))
  }

  /**
   * Create a new visitor
   */
  async create(data: CreateVisitorInput): Promise<Visitor> {
    const visitor = await this.prisma.$transaction(async (tx) => {
      return this.createVisitorInTransaction(tx, data)
    })

    return this.toVisitorType(visitor as PrismaVisitor)
  }

  async createGroup(data: CreateVisitorGroupInput): Promise<CreateVisitorGroupResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const eventAssociation = await this.resolveVisitorEventAssociation(tx, data)
      const unitEventVisitorOptionId = await this.resolveVisitorEventOption(
        tx,
        data,
        eventAssociation,
        data.members.length
      )
      const group = await tx.visitorGroup.create({
        data: {
          kioskId: data.kioskId,
          visitReason: data.visitReason ?? null,
          visitPurpose: data.visitPurpose ?? null,
          purposeDetails: data.purposeDetails ?? null,
          eventId: eventAssociation.eventId,
          unitEventId: eventAssociation.unitEventId,
          unitEventVisitorOptionId,
          hostMemberId: data.hostMemberId ?? null,
          checkInMethod: data.checkInMethod ?? 'kiosk_self_service',
        },
      })

      const vehiclesInput = data.vehicles ?? []
      const seenPlates = new Set<string>()
      const createdVehicles: VisitorGroupVehicleEntity[] = []
      for (const vehicle of vehiclesInput) {
        const normalizedPlate = this.normalizeVehicleLicensePlate(vehicle.licensePlate)
        if (!normalizedPlate || seenPlates.has(normalizedPlate)) {
          continue
        }
        seenPlates.add(normalizedPlate)

        const createdVehicle = await tx.visitorGroupVehicle.create({
          data: {
            visitorGroupId: group.id,
            licensePlate: vehicle.licensePlate.trim(),
            normalizedLicensePlate: normalizedPlate,
          },
        })
        createdVehicles.push(createdVehicle)
      }

      const keysToRecompute = new Set<string>()
      const createdMembers: PrismaVisitor[] = []
      for (const member of data.members) {
        const created = await this.createVisitorInTransaction(
          tx,
          {
            ...member,
            visitReason: data.visitReason,
            visitPurpose: data.visitPurpose,
            purposeDetails: data.purposeDetails,
            eventId: eventAssociation.eventId ?? undefined,
            unitEventId: eventAssociation.unitEventId ?? undefined,
            unitEventVisitorOptionId: unitEventVisitorOptionId ?? undefined,
            hostMemberId: data.hostMemberId,
            kioskId: data.kioskId,
            adminNotes: data.adminNotes,
            checkInMethod: data.checkInMethod ?? 'kiosk_self_service',
            createdByAdmin: data.createdByAdmin,
            visitorGroupId: group.id,
          },
          keysToRecompute,
          eventAssociation,
          unitEventVisitorOptionId
        )
        createdMembers.push(created)
      }

      if (keysToRecompute.size > 0) {
        await this.recomputeDisplayNamesByKeys(tx, keysToRecompute)
      }

      return {
        groupId: group.id,
        members: createdMembers.map((member) => this.toVisitorType(member)),
        vehicles: createdVehicles.map((vehicle) => ({
          id: vehicle.id,
          visitorGroupId: vehicle.visitorGroupId,
          licensePlate: vehicle.licensePlate,
          normalizedLicensePlate: vehicle.normalizedLicensePlate,
          createdAt: vehicle.createdAt,
        })),
      }
    })

    return result
  }

  async checkoutGroup(data: CheckoutVisitorGroupInput): Promise<CheckoutVisitorGroupResult> {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.visitorGroup.findUnique({
        where: { id: data.groupId },
        select: { id: true },
      })

      if (!group) {
        throw new Error('Visitor group not found')
      }

      const groupMembers = await tx.visitor.findMany({
        where: { visitorGroupId: data.groupId },
        select: {
          id: true,
          checkOutTime: true,
        },
      })

      if (groupMembers.length === 0) {
        throw new Error('Visitor group not found')
      }

      const groupMemberIds = new Set(groupMembers.map((member) => member.id))
      const selectedMemberIds = data.memberIds?.length ? data.memberIds : undefined

      if (selectedMemberIds) {
        const invalidMemberIds = selectedMemberIds.filter(
          (memberId) => !groupMemberIds.has(memberId)
        )
        if (invalidMemberIds.length > 0) {
          throw new Error('Selected visitors are not members of this group')
        }
      }

      const activeMemberIds = groupMembers
        .filter((member) => member.checkOutTime === null)
        .map((member) => member.id)
      const activeMemberSet = new Set(activeMemberIds)
      const membersToCheckout = selectedMemberIds
        ? selectedMemberIds.filter((memberId) => activeMemberSet.has(memberId))
        : activeMemberIds

      if (selectedMemberIds && membersToCheckout.length === 0) {
        throw new Error('No selected active group members found')
      }

      const checkedOutAt = new Date()
      if (membersToCheckout.length > 0) {
        await tx.visitor.updateMany({
          where: {
            id: { in: membersToCheckout },
            checkOutTime: null,
          },
          data: {
            checkOutTime: checkedOutAt,
          },
        })
      }

      const checkedOutVisitors =
        membersToCheckout.length > 0
          ? await tx.visitor.findMany({
              where: {
                id: { in: membersToCheckout },
              },
              include: {
                event: true,
                unitEvent: true,
                unitEventVisitorOption: true,
                hostMember: true,
                badge: true,
              },
            })
          : []

      return {
        groupId: data.groupId,
        visitors: checkedOutVisitors.map((visitor) => this.toVisitorType(visitor)),
        checkedOutCount: membersToCheckout.length,
        activeGroupMemberCount: activeMemberIds.length,
        alreadyCheckedOutCount: groupMembers.length - activeMemberIds.length,
      }
    })
  }

  /**
   * Update visitor details (event, host, purpose)
   */
  async update(id: string, data: UpdateVisitorInput): Promise<Visitor> {
    const visitor = await this.prisma.$transaction(async (tx) => {
      const eventAssociation =
        data.eventId !== undefined || data.unitEventId !== undefined
          ? await this.resolveVisitorEventAssociation(tx, data)
          : undefined
      const existing = await tx.visitor.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          name: true,
          rankPrefix: true,
          firstName: true,
          lastName: true,
          eventId: true,
          unitEventId: true,
        },
      })
      const optionEventAssociation = eventAssociation ?? {
        eventId: existing.eventId,
        unitEventId: existing.unitEventId,
      }
      const unitEventVisitorOptionId =
        data.unitEventVisitorOptionId !== undefined
          ? await this.resolveVisitorEventOption(tx, data, optionEventAssociation, 1)
          : undefined
      const keysToRecompute = new Set<string>()
      const oldKey = this.getDisplayKeyForVisitor(existing)
      if (oldKey) keysToRecompute.add(oldKey)

      const splitFromLegacy =
        data.name !== undefined ? splitLegacyVisitorName(data.name ?? '') : undefined

      const rankPrefix =
        data.rankPrefix !== undefined
          ? normalizeNamePart(data.rankPrefix)
          : splitFromLegacy?.rankPrefix !== undefined
            ? normalizeNamePart(splitFromLegacy.rankPrefix)
            : normalizeNamePart(existing.rankPrefix)
      const firstName =
        data.firstName !== undefined
          ? normalizeNamePart(data.firstName)
          : splitFromLegacy?.firstName !== undefined
            ? normalizeNamePart(splitFromLegacy.firstName)
            : normalizeNamePart(existing.firstName)
      const lastName =
        data.lastName !== undefined
          ? normalizeNamePart(data.lastName)
          : splitFromLegacy?.lastName !== undefined
            ? normalizeNamePart(splitFromLegacy.lastName)
            : normalizeNamePart(existing.lastName)
      const legacyName = buildLegacyVisitorName({
        rankPrefix,
        firstName,
        lastName,
        legacyName: data.name ?? existing.name,
      })

      await tx.visitor.update({
        where: { id },
        data: {
          name: legacyName,
          rankPrefix: rankPrefix || null,
          firstName: firstName || null,
          lastName: lastName || null,
          organization: data.organization !== undefined ? data.organization : undefined,
          unit: data.unit !== undefined ? data.unit : undefined,
          mobilePhone: data.mobilePhone !== undefined ? data.mobilePhone : undefined,
          licensePlate: data.licensePlate !== undefined ? data.licensePlate : undefined,
          visitType: data.visitType !== undefined ? data.visitType : undefined,
          visitTypeId: data.visitTypeId !== undefined ? data.visitTypeId : undefined,
          eventId:
            eventAssociation !== undefined
              ? eventAssociation.eventId
              : data.eventId !== undefined
                ? data.eventId
                : undefined,
          unitEventId:
            eventAssociation !== undefined
              ? eventAssociation.unitEventId
              : data.unitEventId !== undefined
                ? data.unitEventId
                : undefined,
          unitEventVisitorOptionId,
          hostMemberId: data.hostMemberId !== undefined ? data.hostMemberId : undefined,
          visitReason: data.visitReason !== undefined ? data.visitReason : undefined,
          visitPurpose: data.visitPurpose !== undefined ? data.visitPurpose : undefined,
          purposeDetails: data.purposeDetails !== undefined ? data.purposeDetails : undefined,
          recruitmentStep: data.recruitmentStep !== undefined ? data.recruitmentStep : undefined,
          checkInTime: data.checkInTime !== undefined ? data.checkInTime : undefined,
          checkOutTime: data.checkOutTime !== undefined ? data.checkOutTime : undefined,
          temporaryBadgeId: data.temporaryBadgeId !== undefined ? data.temporaryBadgeId : undefined,
          kioskId: data.kioskId !== undefined ? data.kioskId : undefined,
          adminNotes: data.adminNotes !== undefined ? data.adminNotes : undefined,
          checkInMethod: data.checkInMethod !== undefined ? data.checkInMethod : undefined,
        },
      })

      const newKey = computeCollisionKey(lastName, getVisitorInitials(firstName))
      if (newKey) keysToRecompute.add(newKey)

      if (keysToRecompute.size > 0) {
        await this.recomputeDisplayNamesByKeys(tx, keysToRecompute)
      }

      return tx.visitor.findUniqueOrThrow({
        where: { id },
        include: {
          event: true,
          unitEvent: true,
          unitEventVisitorOption: true,
          hostMember: true,
          badge: true,
        },
      })
    })

    return this.toVisitorType(visitor as PrismaVisitor)
  }

  /**
   * Checkout a visitor (set checkout time to now)
   */
  async checkout(id: string): Promise<Visitor> {
    const visitor = await this.prisma.visitor.update({
      where: { id },
      data: {
        checkOutTime: new Date(),
      },
      include: {
        event: true,
        unitEvent: true,
        unitEventVisitorOption: true,
        hostMember: true,
        badge: true,
      },
    })

    return this.toVisitorType(visitor)
  }

  /**
   * Get count of active visitors (currently signed in)
   */
  async getActiveCount(): Promise<number> {
    return await this.prisma.visitor.count({
      where: {
        checkOutTime: null,
      },
    })
  }

  /**
   * Find visitor history with pagination and filters
   */
  async findHistory(
    filters: {
      startDate?: Date
      endDate?: Date
      visitType?: string
      organization?: string
    },
    pagination: {
      page: number
      limit: number
    }
  ): Promise<{
    visitors: Array<{
      id: string
      name: string
      organization: string
      visitType: string
      purpose?: string
      hostName?: string
      eventName?: string
      checkInTime: Date
      checkOutTime?: Date
      duration?: number
      checkInMethod: string
      adminNotes?: string
      createdAt: Date
    }>
    total: number
  }> {
    const where: {
      checkInTime?: { gte: Date; lte: Date }
      visitType?: string
      organization?: { contains: string; mode: 'insensitive' }
    } = {}

    if (filters.startDate && filters.endDate) {
      where.checkInTime = {
        gte: filters.startDate,
        lte: filters.endDate,
      }
    }

    if (filters.visitType) {
      where.visitType = filters.visitType
    }

    if (filters.organization) {
      where.organization = {
        contains: filters.organization,
        mode: 'insensitive',
      }
    }

    const skip = (pagination.page - 1) * pagination.limit

    const [total, visitors] = await Promise.all([
      this.prisma.visitor.count({ where }),
      this.prisma.visitor.findMany({
        where,
        orderBy: {
          checkInTime: 'desc',
        },
        skip,
        take: pagination.limit,
        include: {
          hostMember: {
            select: {
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
          event: {
            select: {
              name: true,
            },
          },
          unitEvent: {
            select: {
              title: true,
            },
          },
        },
      }),
    ])

    return {
      visitors: visitors.map((v) => {
        const duration = v.checkOutTime
          ? Math.round((v.checkOutTime.getTime() - v.checkInTime.getTime()) / (1000 * 60))
          : undefined

        return {
          id: v.id,
          name: v.name,
          organization: v.organization || '',
          visitType: v.visitType,
          purpose: v.visitReason ? v.visitReason : undefined,
          hostName: v.hostMember
            ? (v.hostMember.displayName ?? `${v.hostMember.firstName} ${v.hostMember.lastName}`)
            : undefined,
          eventName: v.unitEvent?.title ?? v.event?.name ?? undefined,
          checkInTime: v.checkInTime,
          checkOutTime: v.checkOutTime ? v.checkOutTime : undefined,
          duration,
          checkInMethod: v.checkInMethod ? v.checkInMethod : 'kiosk',
          adminNotes: v.adminNotes ? v.adminNotes : undefined,
          createdAt: v.createdAt ? v.createdAt : v.checkInTime,
        }
      }),
      total,
    }
  }

  /**
   * Convert Prisma visitor to shared Visitor type
   */
  private toVisitorType(visitor: PrismaVisitor): Visitor {
    const checkInMethod = visitor.checkInMethod
      ? (visitor.checkInMethod as Visitor['checkInMethod'])
      : 'kiosk'

    return {
      id: visitor.id,
      name: visitor.name,
      rankPrefix: visitor.rankPrefix ? visitor.rankPrefix : undefined,
      firstName: visitor.firstName ? visitor.firstName : undefined,
      lastName: visitor.lastName ? visitor.lastName : undefined,
      displayName:
        visitor.displayName ??
        buildVisitorDisplayName({
          rankPrefix: visitor.rankPrefix,
          firstName: visitor.firstName,
          lastName: visitor.lastName,
          legacyName: visitor.name,
        }),
      organization: visitor.organization || undefined,
      unit: visitor.unit || undefined,
      mobilePhone: visitor.mobilePhone || undefined,
      licensePlate: visitor.licensePlate || undefined,
      visitType: visitor.visitType as Visitor['visitType'],
      visitTypeId: visitor.visitTypeId ? visitor.visitTypeId : undefined,
      hostMemberId: visitor.hostMemberId ? visitor.hostMemberId : undefined,
      eventId: visitor.eventId ? visitor.eventId : undefined,
      unitEventId: visitor.unitEventId ? visitor.unitEventId : undefined,
      unitEventVisitorOptionId: visitor.unitEventVisitorOptionId
        ? visitor.unitEventVisitorOptionId
        : undefined,
      visitReason: visitor.visitReason ? visitor.visitReason : undefined,
      visitPurpose: visitor.visitPurpose
        ? (visitor.visitPurpose as Visitor['visitPurpose'])
        : undefined,
      purposeDetails: visitor.purposeDetails ? visitor.purposeDetails : undefined,
      recruitmentStep: visitor.recruitmentStep
        ? (visitor.recruitmentStep as Visitor['recruitmentStep'])
        : undefined,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime ? visitor.checkOutTime : undefined,
      temporaryBadgeId: visitor.temporaryBadgeId ? visitor.temporaryBadgeId : undefined,
      kioskId: visitor.kioskId,
      adminNotes: visitor.adminNotes ? visitor.adminNotes : undefined,
      checkInMethod,
      createdByAdmin: visitor.createdByAdmin ? visitor.createdByAdmin : undefined,
      visitorGroupId: visitor.visitorGroupId ? visitor.visitorGroupId : undefined,
      createdAt: visitor.createdAt ? visitor.createdAt : new Date(),
    }
  }

  /**
   * Convert Prisma visitor with relations to extended type for activity feed
   */
  toVisitorWithRelations(
    visitor: PrismaVisitor & {
      hostMember?: {
        serviceNumber: string
        firstName: string
        lastName: string
        displayName?: string | null
      } | null
      event?: { name: string } | null
      unitEvent?: { title: string } | null
      visitTypeRef?: {
        id: string
        name: string
        chipVariant?: string | null
        chipColor?: string | null
      } | null
    }
  ): Visitor & {
    hostName?: string
    eventName?: string
    visitTypeInfo?: { id: string; name: string; chipVariant?: string; chipColor?: string }
  } {
    const base = this.toVisitorType(visitor)
    const hostMember =
      visitor.hostMember && !isSentinelBootstrapMember(visitor.hostMember)
        ? visitor.hostMember
        : null
    return {
      ...base,
      hostName: hostMember
        ? (hostMember.displayName ?? `${hostMember.firstName} ${hostMember.lastName}`)
        : undefined,
      eventName: visitor.unitEvent?.title ?? visitor.event?.name ?? undefined,
      visitTypeInfo: visitor.visitTypeRef
        ? {
            id: visitor.visitTypeRef.id,
            name: visitor.visitTypeRef.name,
            chipVariant: visitor.visitTypeRef.chipVariant ?? undefined,
            chipColor: visitor.visitTypeRef.chipColor ?? undefined,
          }
        : undefined,
    }
  }
}

export const visitorRepository = new VisitorRepository()
