import bcrypt from 'bcryptjs'
import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import {
  DISALLOWED_MEMBER_PINS,
  type KioskResponsibilityStateResponse,
  type LoginStartOfDayAction,
} from '@sentinel/contracts'
import { CheckinRepository } from '../repositories/checkin-repository.js'
import { SessionRepository } from '../repositories/session-repository.js'
import type { SessionMetadata, SessionWithMember } from '../repositories/session-repository.js'
import { authLogger } from '../lib/logger.js'
import {
  getSentinelBootstrapIdentity,
  isSentinelBootstrapServiceNumber,
} from '../lib/system-bootstrap.js'
import { broadcastCheckin } from '../websocket/broadcast.js'
import { PresenceService } from './presence-service.js'
import { DdsService } from './dds-service.js'
import { LockupService } from './lockup-service.js'

const BCRYPT_COST = 12
const DISALLOWED_MEMBER_PIN_SET = new Set<string>(DISALLOWED_MEMBER_PINS)

function isDisallowedMemberPin(pin: string): boolean {
  return DISALLOWED_MEMBER_PIN_SET.has(pin)
}

type PinSetupReason = 'missing' | 'default'

interface LoginMemberRecord {
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

interface AuthMemberSummary {
  id: string
  firstName: string
  lastName: string
  rank: string
  serviceNumber: string
  accountLevel: number
  mustChangePin: boolean
}

interface LoginContext {
  member: LoginMemberRecord
  isBootstrapMember: boolean
  pinState: 'configured' | 'setup_required'
  setupReason: PinSetupReason | null
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

export interface PreflightLoginResult {
  member: AuthMemberSummary
  pinState: 'configured' | 'setup_required'
  setupReason: PinSetupReason | null
}

export interface RemoteSystemSelection {
  remoteSystemId: string | null
  remoteSystemName: string
}

export interface StartOfDayRequirement {
  responsibilityState: KioskResponsibilityStateResponse
}

export class AuthService {
  private prisma: PrismaClientInstance
  private sessionRepo: SessionRepository
  private checkinRepo: CheckinRepository
  private presenceService: PresenceService
  private ddsService: DdsService
  private lockupService: LockupService

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
    this.sessionRepo = new SessionRepository(prisma)
    this.checkinRepo = new CheckinRepository(prisma)
    this.presenceService = new PresenceService(prisma)
    this.ddsService = new DdsService(prisma)
    this.lockupService = new LockupService(prisma)
  }

  /**
   * Authenticate with badge serial + PIN.
   * Returns session token and member data on success.
   * Throws generic error to avoid leaking which field failed.
   */
  async login(
    serialNumber: string,
    pin: string,
    remoteSystem: RemoteSystemSelection,
    startOfDayAction?: LoginStartOfDayAction,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<LoginResult> {
    const context = await this.resolveLoginContext(serialNumber, ipAddress)
    const { member } = context

    if (context.pinState === 'setup_required') {
      authLogger.info('Login blocked until PIN setup is completed', {
        memberId: member.id,
        setupReason: context.setupReason,
        ip: ipAddress,
      })
      throw new PinSetupRequiredError('PIN setup required before signing in')
    }

    const pinValid = await bcrypt.compare(pin, member.pinHash!)
    if (!pinValid) {
      authLogger.warn('Login failed: invalid PIN', {
        memberId: member.id,
        ip: ipAddress,
      })
      throw new AuthenticationError('Invalid badge or PIN')
    }

    const startOfDayRequirement = await this.getStartOfDayRequirement(member.id)
    if (startOfDayRequirement && !startOfDayAction) {
      authLogger.info('Login paused pending start-of-day action selection', {
        memberId: member.id,
        ip: ipAddress,
      })
      throw new StartOfDayActionRequiredError(
        'Choose how to open the unit before signing in',
        startOfDayRequirement
      )
    }
    if (startOfDayRequirement && startOfDayAction) {
      this.assertValidStartOfDayAction(startOfDayRequirement, startOfDayAction)
    }

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

      if (startOfDayRequirement && startOfDayAction) {
        await this.executeStartOfDayAction(member.id, startOfDayAction)
      }
    } catch (error) {
      if (loginCheckin.created && loginCheckin.checkinId) {
        try {
          await this.checkinRepo.delete(loginCheckin.checkinId)
          await this.presenceService.broadcastStatsUpdate()
        } catch (rollbackError) {
          authLogger.error('Login rollback failed after start-of-day action error', {
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

  async preflightLogin(
    serialNumber: string,
    ipAddress?: string | null
  ): Promise<PreflightLoginResult> {
    const context = await this.resolveLoginContext(serialNumber, ipAddress)

    return {
      member: this.toAuthMemberSummary(context.member),
      pinState: context.pinState,
      setupReason: context.setupReason,
    }
  }

  async setupPin(serialNumber: string, newPin: string, ipAddress?: string | null): Promise<void> {
    this.assertAllowedNewPin(newPin)

    const context = await this.resolveLoginContext(serialNumber, ipAddress)

    if (context.isBootstrapMember) {
      throw new ForbiddenError('Cannot set PIN for the protected Sentinel bootstrap account')
    }

    if (context.pinState !== 'setup_required') {
      throw new ForbiddenError('PIN setup is not available for this account')
    }

    const hash = await bcrypt.hash(newPin, BCRYPT_COST)
    await this.prisma.member.update({
      where: { id: context.member.id },
      data: { pinHash: hash, mustChangePin: false },
    })

    authLogger.info('PIN setup completed after badge scan', {
      memberId: context.member.id,
      ip: ipAddress,
    })
  }

  private async resolveLoginContext(
    serialNumber: string,
    ipAddress?: string | null
  ): Promise<LoginContext> {
    const member = await this.findLoginMemberByBadge(serialNumber, ipAddress)
    const isBootstrapMember = isSentinelBootstrapServiceNumber(member.serviceNumber)
    const setupReason = await this.detectPinSetupReason(member, isBootstrapMember)

    if (setupReason) {
      await this.ensureMustChangePin(member)

      authLogger.info('PIN setup is required before protected login', {
        memberId: member.id,
        setupReason,
        ip: ipAddress,
      })

      return {
        member,
        isBootstrapMember,
        pinState: 'setup_required',
        setupReason,
      }
    }

    return {
      member,
      isBootstrapMember,
      pinState: 'configured',
      setupReason: null,
    }
  }

  private async findLoginMemberByBadge(
    serialNumber: string,
    ipAddress?: string | null
  ): Promise<LoginMemberRecord> {
    // Find badge by serial number with assigned member
    const badge = await this.prisma.badge.findUnique({
      where: { serialNumber },
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

    const assignedMember = badge.assignedToId
      ? await this.prisma.member.findUnique({
          where: { id: badge.assignedToId },
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
        })
      : null

    const member = assignedMember ?? badge.members[0]
    if (!member || member.status !== 'active') {
      authLogger.warn('Login failed: no active member for badge', {
        serialNumber,
        ip: ipAddress,
      })
      throw new AuthenticationError('Invalid badge or PIN')
    }

    return member
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

  /**
   * Change own PIN (verify old PIN first).
   */
  async changePin(
    memberId: string,
    newPin: string,
    options?: {
      oldPin?: string
      allowWithoutCurrentPin?: boolean
    }
  ): Promise<void> {
    if (await this.isProtectedBootstrapMember(memberId)) {
      throw new ForbiddenError('Cannot change PIN for the protected Sentinel bootstrap account')
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { pinHash: true, mustChangePin: true },
    })

    this.assertAllowedNewPin(newPin)

    if (!options?.allowWithoutCurrentPin) {
      if (!options?.oldPin) {
        throw new PinPolicyError('Current PIN is required')
      }

      if (!member?.pinHash) {
        throw new AuthenticationError('Current PIN is not set')
      }

      const valid = await bcrypt.compare(options.oldPin, member.pinHash)
      if (!valid) {
        throw new AuthenticationError('Current PIN is incorrect')
      }
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

    this.assertAllowedNewPin(newPin)

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

  private assertAllowedNewPin(newPin: string): void {
    if (isDisallowedMemberPin(newPin)) {
      throw new PinPolicyError('Choose a less predictable PIN')
    }
  }

  private toAuthMemberSummary(member: LoginMemberRecord): AuthMemberSummary {
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      rank: member.rank,
      serviceNumber: member.serviceNumber,
      accountLevel: member.accountLevel,
      mustChangePin: member.mustChangePin,
    }
  }

  private async detectPinSetupReason(
    member: LoginMemberRecord,
    isBootstrapMember: boolean
  ): Promise<PinSetupReason | null> {
    if (!member.pinHash) {
      if (isBootstrapMember) {
        authLogger.warn('Login failed: bootstrap member is missing a PIN hash', {
          memberId: member.id,
        })
        throw new AuthenticationError('Invalid badge or PIN')
      }

      return 'missing'
    }

    if (isBootstrapMember) {
      return null
    }

    for (const disallowedPin of DISALLOWED_MEMBER_PINS) {
      if (await bcrypt.compare(disallowedPin, member.pinHash)) {
        return 'default'
      }
    }

    return null
  }

  private async ensureMustChangePin(member: LoginMemberRecord): Promise<void> {
    if (member.mustChangePin) {
      return
    }

    await this.prisma.member.update({
      where: { id: member.id },
      data: { mustChangePin: true },
    })

    member.mustChangePin = true
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

    return {
      created: true,
      checkinId: checkin.id,
    }
  }

  private async getStartOfDayRequirement(memberId: string): Promise<StartOfDayRequirement | null> {
    const latestCheckin = await this.checkinRepo.findLatestByMember(memberId)
    if (latestCheckin?.direction === 'in') {
      return null
    }

    const responsibilityState = await this.ddsService.getLoginResponsibilityState(memberId)
    if (
      responsibilityState.isFirstMemberCheckin &&
      responsibilityState.needsBuildingOpen &&
      responsibilityState.canOpenBuilding
    ) {
      return { responsibilityState }
    }

    return null
  }

  private assertValidStartOfDayAction(
    requirement: StartOfDayRequirement,
    action: LoginStartOfDayAction
  ): void {
    if (action === 'open_only') {
      if (!requirement.responsibilityState.canOpenBuilding) {
        throw new InvalidStartOfDayActionError('This badge cannot open the unit right now')
      }
      return
    }

    if (!requirement.responsibilityState.canAcceptDds) {
      throw new InvalidStartOfDayActionError(
        'This badge cannot accept DDS right now. Choose open unit only instead.'
      )
    }
  }

  private async executeStartOfDayAction(
    memberId: string,
    action: LoginStartOfDayAction
  ): Promise<void> {
    if (action === 'open_and_accept_dds') {
      await this.ddsService.acceptDds(memberId)
      return
    }

    await this.lockupService.openBuilding(memberId, 'Opened during Sentinel sign-in')
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

export class PinPolicyError extends Error {
  public statusCode = 400
  public code = 'PIN_POLICY_VIOLATION'
  constructor(message: string) {
    super(message)
    this.name = 'PinPolicyError'
  }
}

export class PinSetupRequiredError extends Error {
  public statusCode = 403
  public code = 'PIN_SETUP_REQUIRED'
  constructor(message: string) {
    super(message)
    this.name = 'PinSetupRequiredError'
  }
}

export class StartOfDayActionRequiredError extends Error {
  public statusCode = 409
  public code = 'START_OF_DAY_ACTION_REQUIRED'
  public requirement: StartOfDayRequirement

  constructor(message: string, requirement: StartOfDayRequirement) {
    super(message)
    this.name = 'StartOfDayActionRequiredError'
    this.requirement = requirement
  }
}

export class InvalidStartOfDayActionError extends Error {
  public statusCode = 400
  public code = 'INVALID_START_OF_DAY_ACTION'

  constructor(message: string) {
    super(message)
    this.name = 'InvalidStartOfDayActionError'
  }
}
