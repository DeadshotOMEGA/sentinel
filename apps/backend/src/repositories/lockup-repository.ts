import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

/**
 * Lockup holder info
 */
export interface LockupHolder {
  id: string
  firstName: string
  lastName: string
  rank: string
  serviceNumber: string
}

/**
 * Lockup status entity
 */
export interface LockupStatusEntity {
  id: string
  date: Date
  currentHolderId: string | null
  acquiredAt: Date | null
  buildingStatus: 'secured' | 'open' | 'locking_up'
  securedAt: Date | null
  securedBy: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  currentHolder: LockupHolder | null
  securedByMember: LockupHolder | null
}

/**
 * Lockup transfer entity
 */
export interface LockupTransferEntity {
  id: string
  lockupStatusId: string
  fromMemberId: string
  toMemberId: string
  transferredAt: Date
  reason: string
  notes: string | null
  fromMember: LockupHolder
  toMember: LockupHolder
}

/**
 * Lockup execution entity
 */
export interface LockupExecutionEntity {
  id: string
  lockupStatusId: string
  executedBy: string
  executedAt: Date
  membersCheckedOut: unknown
  visitorsCheckedOut: unknown
  totalCheckedOut: number
  notes: string | null
  executedByMember: LockupHolder
}

/**
 * Create lockup status input
 */
export interface CreateLockupStatusInput {
  date: Date
  currentHolderId?: string
  buildingStatus?: 'secured' | 'open' | 'locking_up'
}

/**
 * Create lockup transfer input
 */
export interface CreateLockupTransferInput {
  lockupStatusId: string
  fromMemberId: string
  toMemberId: string
  reason: string
  notes?: string | null
}

/**
 * Create lockup execution input
 */
export interface CreateLockupExecutionInput {
  lockupStatusId: string
  executedBy: string
  membersCheckedOut: Array<{ id: string; name: string }>
  visitorsCheckedOut: Array<{ id: string; name: string }>
  totalCheckedOut: number
  notes?: string | null
}

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  rank: true,
  serviceNumber: true,
}

/**
 * Repository for managing lockup status, transfers, and executions
 */
export class LockupRepository {
  private prisma: PrismaClientInstance

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
  }

  // ============================================================================
  // Lockup Status
  // ============================================================================

  /**
   * Get lockup status for today's operational date
   */
  async findCurrentStatus(): Promise<LockupStatusEntity | null> {
    const status = await this.prisma.lockupStatus.findFirst({
      where: { isActive: true },
      orderBy: { date: 'desc' },
      include: {
        currentHolder: { select: memberSelect },
        securedByMember: { select: memberSelect },
      },
    })

    if (!status) return null

    return this.mapStatusEntity(status)
  }

  /**
   * Get lockup status by operational date
   */
  async findStatusByDate(date: Date): Promise<LockupStatusEntity | null> {
    // Normalize to start of day
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    const status = await this.prisma.lockupStatus.findUnique({
      where: { date: normalizedDate },
      include: {
        currentHolder: { select: memberSelect },
        securedByMember: { select: memberSelect },
      },
    })

    if (!status) return null

    return this.mapStatusEntity(status)
  }

  /**
   * Create a new lockup status for an operational date
   */
  async createStatus(input: CreateLockupStatusInput): Promise<LockupStatusEntity> {
    const status = await this.prisma.lockupStatus.create({
      data: {
        date: input.date,
        currentHolderId: input.currentHolderId,
        acquiredAt: input.currentHolderId ? new Date() : null,
        buildingStatus: input.buildingStatus ?? 'secured',
        isActive: true,
      },
      include: {
        currentHolder: { select: memberSelect },
        securedByMember: { select: memberSelect },
      },
    })

    return this.mapStatusEntity(status)
  }

  /**
   * Get or create lockup status for a date
   */
  async getOrCreateStatus(date: Date): Promise<LockupStatusEntity> {
    const existing = await this.findStatusByDate(date)
    if (existing) return existing

    return this.createStatus({ date, buildingStatus: 'secured' })
  }

  /**
   * Update lockup holder
   */
  async updateHolder(statusId: string, holderId: string | null): Promise<LockupStatusEntity> {
    const status = await this.prisma.lockupStatus.update({
      where: { id: statusId },
      data: {
        currentHolderId: holderId,
        acquiredAt: holderId ? new Date() : null,
      },
      include: {
        currentHolder: { select: memberSelect },
        securedByMember: { select: memberSelect },
      },
    })

    return this.mapStatusEntity(status)
  }

  /**
   * Mark building as secured
   */
  async markSecured(statusId: string, securedById: string): Promise<LockupStatusEntity> {
    const status = await this.prisma.lockupStatus.update({
      where: { id: statusId },
      data: {
        buildingStatus: 'secured',
        securedAt: new Date(),
        securedBy: securedById,
        currentHolderId: null,
        isActive: false,
      },
      include: {
        currentHolder: { select: memberSelect },
        securedByMember: { select: memberSelect },
      },
    })

    return this.mapStatusEntity(status)
  }

  /**
   * Mark building as open (transition from secured)
   */
  async markOpen(statusId: string, holderId: string): Promise<LockupStatusEntity> {
    const status = await this.prisma.lockupStatus.update({
      where: { id: statusId },
      data: {
        buildingStatus: 'open',
        currentHolderId: holderId,
        acquiredAt: new Date(),
        isActive: true,
      },
      include: {
        currentHolder: { select: memberSelect },
        securedByMember: { select: memberSelect },
      },
    })

    return this.mapStatusEntity(status)
  }

  /**
   * Mark building as locking up (in progress)
   */
  async markLockingUp(statusId: string): Promise<LockupStatusEntity> {
    const status = await this.prisma.lockupStatus.update({
      where: { id: statusId },
      data: {
        buildingStatus: 'locking_up',
      },
      include: {
        currentHolder: { select: memberSelect },
        securedByMember: { select: memberSelect },
      },
    })

    return this.mapStatusEntity(status)
  }

  // ============================================================================
  // Lockup Transfers
  // ============================================================================

  /**
   * Create a lockup transfer record
   */
  async createTransfer(input: CreateLockupTransferInput): Promise<LockupTransferEntity> {
    const transfer = await this.prisma.lockupTransfer.create({
      data: {
        lockupStatusId: input.lockupStatusId,
        fromMemberId: input.fromMemberId,
        toMemberId: input.toMemberId,
        reason: input.reason,
        notes: input.notes,
      },
      include: {
        fromMember: { select: memberSelect },
        toMember: { select: memberSelect },
      },
    })

    return this.mapTransferEntity(transfer)
  }

  /**
   * Get transfers for a lockup status
   */
  async findTransfersByStatusId(statusId: string): Promise<LockupTransferEntity[]> {
    const transfers = await this.prisma.lockupTransfer.findMany({
      where: { lockupStatusId: statusId },
      orderBy: { transferredAt: 'desc' },
      include: {
        fromMember: { select: memberSelect },
        toMember: { select: memberSelect },
      },
    })

    return transfers.map((t) => this.mapTransferEntity(t))
  }

  /**
   * Get recent transfers (across all dates)
   */
  async findRecentTransfers(limit = 50, offset = 0): Promise<LockupTransferEntity[]> {
    const transfers = await this.prisma.lockupTransfer.findMany({
      orderBy: { transferredAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        fromMember: { select: memberSelect },
        toMember: { select: memberSelect },
      },
    })

    return transfers.map((t) => this.mapTransferEntity(t))
  }

  /**
   * Get transfers within a date range
   */
  async findTransfersByDateRange(
    startDate: Date,
    endDate: Date,
    limit = 50,
    offset = 0
  ): Promise<LockupTransferEntity[]> {
    const transfers = await this.prisma.lockupTransfer.findMany({
      where: {
        transferredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { transferredAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        fromMember: { select: memberSelect },
        toMember: { select: memberSelect },
      },
    })

    return transfers.map((t) => this.mapTransferEntity(t))
  }

  /**
   * Count transfers
   */
  async countTransfers(startDate?: Date, endDate?: Date): Promise<number> {
    return this.prisma.lockupTransfer.count({
      where: {
        ...(startDate && endDate && {
          transferredAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
    })
  }

  // ============================================================================
  // Lockup Executions
  // ============================================================================

  /**
   * Create a lockup execution record
   */
  async createExecution(input: CreateLockupExecutionInput): Promise<LockupExecutionEntity> {
    const execution = await this.prisma.lockupExecution.create({
      data: {
        lockupStatusId: input.lockupStatusId,
        executedBy: input.executedBy,
        membersCheckedOut: input.membersCheckedOut,
        visitorsCheckedOut: input.visitorsCheckedOut,
        totalCheckedOut: input.totalCheckedOut,
        notes: input.notes,
      },
      include: {
        executedByMember: { select: memberSelect },
      },
    })

    return this.mapExecutionEntity(execution)
  }

  /**
   * Get execution for a lockup status
   */
  async findExecutionByStatusId(statusId: string): Promise<LockupExecutionEntity | null> {
    const execution = await this.prisma.lockupExecution.findUnique({
      where: { lockupStatusId: statusId },
      include: {
        executedByMember: { select: memberSelect },
      },
    })

    if (!execution) return null

    return this.mapExecutionEntity(execution)
  }

  /**
   * Get recent executions
   */
  async findRecentExecutions(limit = 50, offset = 0): Promise<LockupExecutionEntity[]> {
    const executions = await this.prisma.lockupExecution.findMany({
      orderBy: { executedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        executedByMember: { select: memberSelect },
      },
    })

    return executions.map((e) => this.mapExecutionEntity(e))
  }

  /**
   * Get executions within a date range
   */
  async findExecutionsByDateRange(
    startDate: Date,
    endDate: Date,
    limit = 50,
    offset = 0
  ): Promise<LockupExecutionEntity[]> {
    const executions = await this.prisma.lockupExecution.findMany({
      where: {
        executedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { executedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        executedByMember: { select: memberSelect },
      },
    })

    return executions.map((e) => this.mapExecutionEntity(e))
  }

  /**
   * Count executions
   */
  async countExecutions(startDate?: Date, endDate?: Date): Promise<number> {
    return this.prisma.lockupExecution.count({
      where: {
        ...(startDate && endDate && {
          executedAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
    })
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapStatusEntity(status: {
    id: string
    date: Date
    currentHolderId: string | null
    acquiredAt: Date | null
    buildingStatus: string
    securedAt: Date | null
    securedBy: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    currentHolder: {
      id: string
      firstName: string
      lastName: string
      rank: string
      serviceNumber: string
    } | null
    securedByMember: {
      id: string
      firstName: string
      lastName: string
      rank: string
      serviceNumber: string
    } | null
  }): LockupStatusEntity {
    return {
      id: status.id,
      date: status.date,
      currentHolderId: status.currentHolderId,
      acquiredAt: status.acquiredAt,
      buildingStatus: status.buildingStatus as 'secured' | 'open' | 'locking_up',
      securedAt: status.securedAt,
      securedBy: status.securedBy,
      isActive: status.isActive,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
      currentHolder: status.currentHolder,
      securedByMember: status.securedByMember,
    }
  }

  private mapTransferEntity(transfer: {
    id: string
    lockupStatusId: string
    fromMemberId: string
    toMemberId: string
    transferredAt: Date
    reason: string
    notes: string | null
    fromMember: {
      id: string
      firstName: string
      lastName: string
      rank: string
      serviceNumber: string
    }
    toMember: {
      id: string
      firstName: string
      lastName: string
      rank: string
      serviceNumber: string
    }
  }): LockupTransferEntity {
    return {
      id: transfer.id,
      lockupStatusId: transfer.lockupStatusId,
      fromMemberId: transfer.fromMemberId,
      toMemberId: transfer.toMemberId,
      transferredAt: transfer.transferredAt,
      reason: transfer.reason,
      notes: transfer.notes,
      fromMember: transfer.fromMember,
      toMember: transfer.toMember,
    }
  }

  private mapExecutionEntity(execution: {
    id: string
    lockupStatusId: string
    executedBy: string
    executedAt: Date
    membersCheckedOut: unknown
    visitorsCheckedOut: unknown
    totalCheckedOut: number
    notes: string | null
    executedByMember: {
      id: string
      firstName: string
      lastName: string
      rank: string
      serviceNumber: string
    }
  }): LockupExecutionEntity {
    return {
      id: execution.id,
      lockupStatusId: execution.lockupStatusId,
      executedBy: execution.executedBy,
      executedAt: execution.executedAt,
      membersCheckedOut: execution.membersCheckedOut,
      visitorsCheckedOut: execution.visitorsCheckedOut,
      totalCheckedOut: execution.totalCheckedOut,
      notes: execution.notes,
      executedByMember: execution.executedByMember,
    }
  }
}
