import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { formatAuditMemberName } from '../lib/audit-log.js'
import { CheckinRepository } from '../repositories/checkin-repository.js'
import { AuditRepository } from '../repositories/audit-repository.js'
import { SessionRepository } from '../repositories/session-repository.js'
import type { SessionMetadata, SessionWithMember } from '../repositories/session-repository.js'
import { authLogger } from '../lib/logger.js'
import { broadcastCheckin } from '../websocket/broadcast.js'
import { PresenceService } from './presence-service.js'

interface LoginMemberRecord {
  id: string
  firstName: string
  lastName: string
  rank: string
  serviceNumber: string
  accountLevel: number
  status: string
}

interface AuthMemberSummary {
  id: string
  firstName: string
  lastName: string
  rank: string
  serviceNumber: string
  accountLevel: number
}

interface LoginCheckinResult {
  created: boolean
  checkinId: string | null
}

export interface LoginResult {
  token: string
  sessionId: string
  remoteSystemId: string | null
  remoteSystemName: string
  lastSeenAt: string
  expiresAt: string
  member: AuthMemberSummary
}

export interface RemoteSystemSelection {
  remoteSystemId: string | null
  remoteSystemName: string
}

export class AuthService {
  private prisma: PrismaClientInstance
  private sessionRepo: SessionRepository
  private checkinRepo: CheckinRepository
  private auditRepo: AuditRepository
  private presenceService: PresenceService

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
    this.sessionRepo = new SessionRepository(prisma)
    this.checkinRepo = new CheckinRepository(prisma)
    this.auditRepo = new AuditRepository(prisma)
    this.presenceService = new PresenceService(prisma)
  }

  /**
   * Authenticate with badge serial/service number.
   * Returns session token and member data on success.
   * Throws generic error to avoid leaking identifier details.
   */
  async login(
    loginIdentifier: string,
    remoteSystem: RemoteSystemSelection,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<LoginResult> {
    const member = await this.findLoginMemberByIdentifier(loginIdentifier, ipAddress)

    const session = await this.sessionRepo.create({
      memberId: member.id,
      remoteSystemId: remoteSystem.remoteSystemId,
      remoteSystemName: remoteSystem.remoteSystemName,
      ipAddress,
      userAgent,
    })

    let loginCheckin: LoginCheckinResult = { created: false, checkinId: null }

    try {
      loginCheckin = await this.ensureMemberCheckedIn(member.id, remoteSystem.remoteSystemId)
    } catch (error) {
      if (loginCheckin.created && loginCheckin.checkinId) {
        try {
          await this.checkinRepo.delete(loginCheckin.checkinId)
          await this.presenceService.broadcastStatsUpdate()
        } catch (rollbackError) {
          authLogger.error('Login rollback failed after auto check-in error', {
            memberId: member.id,
            sessionId: session.id,
            checkinId: loginCheckin.checkinId,
            error: rollbackError instanceof Error ? rollbackError.message : 'Unknown error',
          })
        }
      }

      await this.sessionRepo.endById(session.id, 'auto_checkin_failed')
      authLogger.error('Login auto check-in failed; session revoked', {
        memberId: member.id,
        sessionId: session.id,
        remoteSystemId: remoteSystem.remoteSystemId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }

    authLogger.info('Login successful', {
      memberId: member.id,
      sessionId: session.id,
      remoteSystemId: remoteSystem.remoteSystemId,
      remoteSystemName: remoteSystem.remoteSystemName,
      ip: ipAddress,
    })

    await this.auditRepo.log({
      adminUserId: null,
      action: 'login',
      entityType: 'session',
      entityId: session.id,
      details: {
        actorMemberId: member.id,
        actorName: formatAuditMemberName(member),
        actorServiceNumber: member.serviceNumber,
        actorType: 'member',
        remoteSystemId: remoteSystem.remoteSystemId,
        remoteSystemName: remoteSystem.remoteSystemName,
        sessionId: session.id,
      },
      ipAddress: ipAddress ?? 'unknown',
    })

    return {
      token: session.token,
      sessionId: session.id,
      remoteSystemId: session.remoteSystemId,
      remoteSystemName: session.remoteSystemName,
      lastSeenAt: session.lastSeenAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      member: this.toAuthMemberSummary(member),
    }
  }

  private async findLoginMemberByIdentifier(
    loginIdentifier: string,
    ipAddress?: string | null
  ): Promise<LoginMemberRecord> {
    const identifier = loginIdentifier.trim()

    // Find badge by serial number with assigned member
    const badge = await this.prisma.badge.findUnique({
      where: { serialNumber: identifier },
      select: {
        id: true,
        assignedToId: true,
        status: true,
        members: {
          where: { status: 'active' },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rank: true,
            serviceNumber: true,
            accountLevel: true,
            status: true,
          },
        },
      },
    })

    const assignedMember =
      badge?.status === 'active' && badge.assignedToId
        ? await this.prisma.member.findUnique({
            where: { id: badge.assignedToId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rank: true,
              serviceNumber: true,
              accountLevel: true,
              status: true,
            },
          })
        : null

    const badgeMember = badge?.status === 'active' ? (assignedMember ?? badge.members[0]) : null
    if (badgeMember?.status === 'active') {
      return badgeMember
    }

    const serviceNumberMember = await this.prisma.member.findUnique({
      where: { serviceNumber: identifier },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rank: true,
        serviceNumber: true,
        accountLevel: true,
        status: true,
      },
    })

    if (serviceNumberMember?.status === 'active') {
      return serviceNumberMember
    }

    authLogger.warn('Login failed: identifier not found or inactive', {
      ip: ipAddress,
    })
    throw new AuthenticationError('Invalid badge or Service Number')
  }

  /**
   * Destroy a session (logout).
   */
  async logout(token: string): Promise<void> {
    await this.sessionRepo.endByToken(token, 'logout')
  }

  /**
   * Validate a session token and return member data.
   */
  async validateSession(token: string): Promise<SessionWithMember | null> {
    return this.sessionRepo.findByToken(token)
  }

  async heartbeat(token: string): Promise<SessionMetadata | null> {
    return this.sessionRepo.touchByToken(token)
  }

  private toAuthMemberSummary(member: LoginMemberRecord): AuthMemberSummary {
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      rank: member.rank,
      serviceNumber: member.serviceNumber,
      accountLevel: member.accountLevel,
    }
  }

  private async ensureMemberCheckedIn(
    memberId: string,
    remoteSystemId: string | null
  ): Promise<LoginCheckinResult> {
    const latestCheckin = await this.checkinRepo.findLatestByMember(memberId)
    if (latestCheckin?.direction === 'in') {
      return { created: false, checkinId: latestCheckin.id }
    }

    if (!remoteSystemId) {
      throw new Error('Remote system is required for login auto check-in')
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        rank: true,
        firstName: true,
        lastName: true,
        displayName: true,
        serviceNumber: true,
        division: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!member) {
      throw new NotFoundError('Member not found')
    }

    const checkin = await this.checkinRepo.create({
      memberId,
      direction: 'in',
      kioskId: remoteSystemId,
      method: 'login',
      timestamp: new Date(),
      synced: true,
    })

    broadcastCheckin({
      id: checkin.id,
      memberId,
      memberName: member.displayName ?? `${member.firstName} ${member.lastName}`,
      rank: member.rank,
      division: member.division?.name ?? 'Unknown',
      direction: 'in',
      timestamp: checkin.timestamp.toISOString(),
      kioskId: remoteSystemId,
    })

    await this.presenceService.broadcastStatsUpdate()

    await this.auditRepo.log({
      adminUserId: null,
      action: 'checkin_login',
      entityType: 'checkin',
      entityId: checkin.id,
      details: {
        actorMemberId: member.id,
        actorName: formatAuditMemberName(member),
        actorServiceNumber: member.serviceNumber,
        actorType: 'member',
        memberName: formatAuditMemberName(member),
        memberRank: member.rank,
        direction: 'in',
        kioskId: remoteSystemId,
        method: 'login',
      },
      ipAddress: 'unknown',
    })

    return {
      created: true,
      checkinId: checkin.id,
    }
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
