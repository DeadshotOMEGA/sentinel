import crypto from 'node:crypto'
import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { SENTINEL_BOOTSTRAP_SERVICE_NUMBER } from '../lib/system-bootstrap.js'

export interface SessionMetadata {
  sessionId: string
  remoteSystemId: string | null
  remoteSystemName: string
  lastSeenAt: Date
  expiresAt: Date
}

export interface SessionWithMember {
  id: string
  token: string
  expiresAt: Date
  remoteSystemId: string | null
  remoteSystemName: string
  lastSeenAt: Date
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
    accountLevel: number
    mustChangePin: boolean
    status: string
    pinHash: string | null
  }
}

export interface SessionCreateInput {
  memberId: string
  remoteSystemId?: string | null
  remoteSystemName: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface ActiveRemoteSessionRecord {
  sessionId: string
  memberId: string
  memberName: string
  memberRank: string
  remoteSystemId: string | null
  remoteSystemName: string
  lastSeenAt: Date
  ipAddress: string | null
}

export interface ActiveRemoteSessionList {
  activeCount: number
  overflowCount: number
  sessions: ActiveRemoteSessionRecord[]
}

export class SessionRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find a valid (non-expired) session by token, including member data.
   * Returns null if token doesn't exist, has ended, is expired, or member is not active.
   */
  async findByToken(token: string): Promise<SessionWithMember | null> {
    const session = await this.prisma.memberSession.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        remoteSystemId: true,
        remoteSystemNameSnapshot: true,
        lastSeenAt: true,
        endedAt: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rank: true,
            serviceNumber: true,
            accountLevel: true,
            mustChangePin: true,
            status: true,
            pinHash: true,
          },
        },
      },
    })

    if (!session) return null
    if (session.endedAt) return null

    const now = new Date()
    if (session.expiresAt < now) {
      await this.endById(session.id, 'expired')
      return null
    }

    if (session.member.status !== 'active') {
      await this.endById(session.id, 'member_inactive')
      return null
    }

    return {
      ...session,
      remoteSystemName: session.remoteSystemNameSnapshot,
    }
  }

  async findActiveSessions(filters?: { memberId?: string; activeWithinSeconds?: number }): Promise<
    Array<{
      id: string
      memberId: string
      expiresAt: Date
      ipAddress: string | null
      createdAt: Date
      lastSeenAt: Date
      remoteSystemName: string
      member: {
        firstName: string
        lastName: string
        rank: string
      }
    }>
  > {
    const now = new Date()
    const activeThreshold = new Date(now.getTime() - (filters?.activeWithinSeconds ?? 120) * 1000)

    return this.prisma.memberSession
      .findMany({
        where: {
          endedAt: null,
          expiresAt: { gt: now },
          lastSeenAt: { gte: activeThreshold },
          ...(filters?.memberId ? { memberId: filters.memberId } : {}),
        },
        select: {
          id: true,
          memberId: true,
          expiresAt: true,
          ipAddress: true,
          createdAt: true,
          lastSeenAt: true,
          remoteSystemNameSnapshot: true,
          member: {
            select: {
              firstName: true,
              lastName: true,
              rank: true,
            },
          },
        },
        orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
      })
      .then((sessions) =>
        sessions.map((session) => ({
          id: session.id,
          memberId: session.memberId,
          expiresAt: session.expiresAt,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          lastSeenAt: session.lastSeenAt,
          remoteSystemName: session.remoteSystemNameSnapshot,
          member: session.member,
        }))
      )
  }

  async findActiveRemoteSessions(options?: {
    limit?: number
    activeWithinSeconds?: number
  }): Promise<ActiveRemoteSessionList> {
    const now = new Date()
    const limit = options?.limit ?? 5
    const activeThreshold = new Date(now.getTime() - (options?.activeWithinSeconds ?? 120) * 1000)
    const activeRemoteSessionWhere = {
      endedAt: null,
      expiresAt: { gt: now },
      lastSeenAt: { gte: activeThreshold },
      remoteSystemId: { not: null as string | null },
      member: {
        serviceNumber: { not: SENTINEL_BOOTSTRAP_SERVICE_NUMBER },
      },
    }

    const [activeCount, sessions] = await Promise.all([
      this.prisma.memberSession.count({
        where: activeRemoteSessionWhere,
      }),
      this.prisma.memberSession.findMany({
        where: activeRemoteSessionWhere,
        select: {
          id: true,
          memberId: true,
          remoteSystemId: true,
          remoteSystemNameSnapshot: true,
          lastSeenAt: true,
          ipAddress: true,
          member: {
            select: {
              firstName: true,
              lastName: true,
              rank: true,
            },
          },
        },
        orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      }),
    ])

    return {
      activeCount,
      overflowCount: Math.max(activeCount - sessions.length, 0),
      sessions: sessions.map((session) => ({
        sessionId: session.id,
        memberId: session.memberId,
        memberName: `${session.member.firstName} ${session.member.lastName}`.trim(),
        memberRank: session.member.rank,
        remoteSystemId: session.remoteSystemId,
        remoteSystemName: session.remoteSystemNameSnapshot,
        lastSeenAt: session.lastSeenAt,
        ipAddress: session.ipAddress,
      })),
    }
  }

  /**
   * Create a new session for a member.
   * Generates a 256-bit random token with 7-day expiry.
   */
  async create(input: SessionCreateInput): Promise<{
    id: string
    token: string
    expiresAt: Date
    remoteSystemId: string | null
    remoteSystemName: string
    lastSeenAt: Date
  }> {
    const token = crypto.randomBytes(32).toString('hex')
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + 7)

    const session = await this.prisma.memberSession.create({
      data: {
        memberId: input.memberId,
        remoteSystemId: input.remoteSystemId ?? null,
        remoteSystemNameSnapshot: input.remoteSystemName,
        token,
        expiresAt,
        lastSeenAt: now,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        remoteSystemId: true,
        remoteSystemNameSnapshot: true,
        lastSeenAt: true,
      },
    })

    return {
      id: session.id,
      token: session.token,
      expiresAt: session.expiresAt,
      remoteSystemId: session.remoteSystemId,
      remoteSystemName: session.remoteSystemNameSnapshot,
      lastSeenAt: session.lastSeenAt,
    }
  }

  async touchByToken(token: string): Promise<SessionMetadata | null> {
    const session = await this.findByToken(token)
    if (!session) {
      return null
    }

    const now = new Date()
    const updated = await this.prisma.memberSession.update({
      where: { id: session.id },
      data: {
        lastSeenAt: now,
        updatedAt: now,
      },
      select: {
        id: true,
        remoteSystemId: true,
        remoteSystemNameSnapshot: true,
        lastSeenAt: true,
        expiresAt: true,
      },
    })

    return {
      sessionId: updated.id,
      remoteSystemId: updated.remoteSystemId,
      remoteSystemName: updated.remoteSystemNameSnapshot,
      lastSeenAt: updated.lastSeenAt,
      expiresAt: updated.expiresAt,
    }
  }

  /**
   * End a session by token (logout/revoke/expiry).
   */
  async endByToken(token: string, endReason: string): Promise<number> {
    const now = new Date()
    const result = await this.prisma.memberSession.updateMany({
      where: {
        token,
        endedAt: null,
      },
      data: {
        endedAt: now,
        endReason,
        updatedAt: now,
      },
    })

    return result.count
  }

  /**
   * End a session by ID.
   */
  async endById(id: string, endReason: string): Promise<number> {
    const now = new Date()
    const result = await this.prisma.memberSession.updateMany({
      where: {
        id,
        endedAt: null,
      },
      data: {
        endedAt: now,
        endReason,
        updatedAt: now,
      },
    })

    return result.count
  }

  /**
   * End all sessions for a member (revoke all).
   */
  async endByMemberId(memberId: string, endReason: string): Promise<number> {
    const now = new Date()
    const result = await this.prisma.memberSession.updateMany({
      where: {
        memberId,
        endedAt: null,
      },
      data: {
        endedAt: now,
        endReason,
        updatedAt: now,
      },
    })

    return result.count
  }

  /**
   * End all expired sessions (cleanup).
   */
  async endExpired(): Promise<number> {
    const now = new Date()
    const result = await this.prisma.memberSession.updateMany({
      where: {
        endedAt: null,
        expiresAt: { lt: now },
      },
      data: {
        endedAt: now,
        endReason: 'expired',
        updatedAt: now,
      },
    })

    return result.count
  }

  async countActiveSessions(): Promise<number> {
    return this.prisma.memberSession.count({
      where: {
        endedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
  }

  async endAllActive(endReason: string): Promise<number> {
    const now = new Date()
    const result = await this.prisma.memberSession.updateMany({
      where: {
        endedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        endedAt: now,
        endReason,
        updatedAt: now,
      },
    })

    return result.count
  }
}
