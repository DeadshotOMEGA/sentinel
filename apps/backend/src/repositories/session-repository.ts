import crypto from 'node:crypto'
import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

export interface SessionWithMember {
  id: string
  token: string
  expiresAt: Date
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

export class SessionRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Create a new session for a member.
   * Generates a 256-bit random token with 7-day expiry.
   */
  async create(
    memberId: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<{ id: string; token: string; expiresAt: Date }> {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const session = await this.prisma.memberSession.create({
      data: {
        memberId,
        token,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
      select: {
        id: true,
        token: true,
        expiresAt: true,
      },
    })

    return session
  }

  /**
   * Find a valid (non-expired) session by token, including member data.
   * Returns null if token doesn't exist, is expired, or member is not active.
   */
  async findByToken(token: string): Promise<SessionWithMember | null> {
    const session = await this.prisma.memberSession.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        expiresAt: true,
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
    if (session.expiresAt < new Date()) return null
    if (session.member.status !== 'active') return null

    return session
  }

  /**
   * Delete a session by token (logout).
   */
  async deleteByToken(token: string): Promise<void> {
    await this.prisma.memberSession.deleteMany({
      where: { token },
    })
  }

  /**
   * Delete all sessions for a member (revoke all).
   */
  async deleteByMemberId(memberId: string): Promise<void> {
    await this.prisma.memberSession.deleteMany({
      where: { memberId },
    })
  }

  /**
   * Delete all expired sessions (cleanup).
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.memberSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })
    return result.count
  }
}
