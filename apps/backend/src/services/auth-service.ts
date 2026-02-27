import bcrypt from 'bcryptjs'
import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { SessionRepository } from '../repositories/session-repository.js'
import type { SessionWithMember } from '../repositories/session-repository.js'
import { authLogger } from '../lib/logger.js'
import {
  getSentinelBootstrapIdentity,
  isSentinelBootstrapServiceNumber,
} from '../lib/system-bootstrap.js'

const BCRYPT_COST = 12

export interface LoginResult {
  token: string
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
    accountLevel: number
    mustChangePin: boolean
  }
}

export class AuthService {
  private prisma: PrismaClientInstance
  private sessionRepo: SessionRepository

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
    this.sessionRepo = new SessionRepository(prisma)
  }

  /**
   * Authenticate with badge serial + PIN.
   * Returns session token and member data on success.
   * Throws generic error to avoid leaking which field failed.
   */
  async login(
    serialNumber: string,
    pin: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<LoginResult> {
    // Find badge by serial number with assigned member
    const badge = await this.prisma.badge.findUnique({
      where: { serialNumber },
      select: {
        id: true,
        status: true,
        members: {
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

    if (!badge || badge.status !== 'active') {
      authLogger.warn('Login failed: badge not found or inactive', {
        serialNumber,
        ip: ipAddress,
      })
      throw new AuthenticationError('Invalid badge or PIN')
    }

    const member = badge.members[0]
    if (!member || member.status !== 'active') {
      authLogger.warn('Login failed: no active member for badge', {
        serialNumber,
        ip: ipAddress,
      })
      throw new AuthenticationError('Invalid badge or PIN')
    }

    if (!member.pinHash) {
      authLogger.warn('Login failed: member has no PIN set', {
        memberId: member.id,
        ip: ipAddress,
      })
      throw new AuthenticationError('Invalid badge or PIN')
    }

    const pinValid = await bcrypt.compare(pin, member.pinHash)
    if (!pinValid) {
      authLogger.warn('Login failed: invalid PIN', {
        memberId: member.id,
        ip: ipAddress,
      })
      throw new AuthenticationError('Invalid badge or PIN')
    }

    // Create session
    const session = await this.sessionRepo.create(member.id, ipAddress, userAgent)

    authLogger.info('Login successful', {
      memberId: member.id,
      sessionId: session.id,
      ip: ipAddress,
    })

    return {
      token: session.token,
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        rank: member.rank,
        serviceNumber: member.serviceNumber,
        accountLevel: member.accountLevel,
        mustChangePin: member.mustChangePin,
      },
    }
  }

  /**
   * Destroy a session (logout).
   */
  async logout(token: string): Promise<void> {
    await this.sessionRepo.deleteByToken(token)
  }

  /**
   * Validate a session token and return member data.
   */
  async validateSession(token: string): Promise<SessionWithMember | null> {
    return this.sessionRepo.findByToken(token)
  }

  /**
   * Change own PIN (verify old PIN first).
   */
  async changePin(memberId: string, oldPin: string, newPin: string): Promise<void> {
    if (await this.isProtectedBootstrapMember(memberId)) {
      throw new ForbiddenError('Cannot change PIN for the protected Sentinel bootstrap account')
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { pinHash: true },
    })

    if (!member?.pinHash) {
      throw new AuthenticationError('Current PIN is not set')
    }

    const valid = await bcrypt.compare(oldPin, member.pinHash)
    if (!valid) {
      throw new AuthenticationError('Current PIN is incorrect')
    }

    const hash = await bcrypt.hash(newPin, BCRYPT_COST)
    await this.prisma.member.update({
      where: { id: memberId },
      data: { pinHash: hash, mustChangePin: false },
    })

    authLogger.info('PIN changed', { memberId })
  }

  /**
   * Admin set/reset a member's PIN (no old PIN required).
   */
  async setPin(memberId: string, newPin: string): Promise<void> {
    if (await this.isProtectedBootstrapMember(memberId)) {
      throw new ForbiddenError('Cannot set PIN for the protected Sentinel bootstrap account')
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    })

    if (!member) {
      throw new NotFoundError('Member not found')
    }

    const hash = await bcrypt.hash(newPin, BCRYPT_COST)
    await this.prisma.member.update({
      where: { id: memberId },
      data: { pinHash: hash, mustChangePin: false },
    })

    authLogger.info('PIN set by admin', { memberId })
  }

  private async isProtectedBootstrapMember(memberId: string): Promise<boolean> {
    const identity = await getSentinelBootstrapIdentity(this.prisma)
    if (identity && identity.memberId === memberId) {
      return true
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { serviceNumber: true },
    })

    return isSentinelBootstrapServiceNumber(member?.serviceNumber)
  }
}

export class AuthenticationError extends Error {
  public statusCode = 401
  public code = 'UNAUTHORIZED'
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends Error {
  public statusCode = 404
  public code = 'NOT_FOUND'
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  public statusCode = 403
  public code = 'FORBIDDEN'
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}
