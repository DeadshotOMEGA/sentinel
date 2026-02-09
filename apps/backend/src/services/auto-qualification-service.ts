import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { QualificationRepository } from '../repositories/qualification-repository.js'
import type { AutoQualSyncResult, MemberAutoQualSyncResult } from '@sentinel/contracts'

/**
 * Rule definition for an auto-granted qualification
 */
interface AutoQualRule {
  /** Qualification type code */
  code: string
  /** Check if a member should have this qualification */
  isEligible: (member: MemberWithContext) => boolean
}

/**
 * Member data needed for rule evaluation
 */
interface MemberWithContext {
  id: string
  firstName: string
  lastName: string
  rankDisplayOrder: number
  divisionCode: string | null
  activeQualCodes: Set<string>
}

/**
 * Auto-qualification rules based on rank displayOrder:
 *   1 = S3, 2 = S2, 3 = S1, 4 = MS, 5 = PO2, 6 = PO1, 7 = CPO2, 8 = CPO1,
 *   9 = NCdt/OCdt, 10 = A/SLt, 11 = SLt/Lt, 12 = Lt(N)/Capt, ...
 */
const AUTO_QUAL_RULES: AutoQualRule[] = [
  {
    code: 'APS',
    isEligible: (m) => m.rankDisplayOrder === 1 && m.divisionCode !== 'BMQ',
  },
  {
    code: 'BM',
    isEligible: (m) => m.rankDisplayOrder === 2,
  },
  {
    code: 'QM',
    isEligible: (m) => m.rankDisplayOrder === 3,
  },
  {
    code: 'DSWK',
    isEligible: (m) =>
      m.rankDisplayOrder >= 4 &&
      m.rankDisplayOrder <= 12 &&
      !m.activeQualCodes.has('SWK'),
  },
]

/**
 * Service for automatically granting/revoking qualifications
 * based on member rank and division.
 *
 * SWK remains manual-only and is never auto-granted or auto-revoked.
 */
export class AutoQualificationService {
  private prisma: PrismaClientInstance
  private qualRepo: QualificationRepository

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
    this.qualRepo = new QualificationRepository(prisma)
  }

  /**
   * Sync auto-qualifications for all active members
   */
  async syncAll(): Promise<AutoQualSyncResult> {
    const members = await this.loadAllActiveMembers()
    const qualTypeMap = await this.loadAutoQualTypeIds()

    let granted = 0
    let revoked = 0
    let unchanged = 0
    const errors: AutoQualSyncResult['errors'] = []

    for (const member of members) {
      try {
        const result = await this.evaluateAndApply(member, qualTypeMap)
        granted += result.granted.length
        revoked += result.revoked.length
        unchanged += result.unchanged.length
      } catch (error) {
        errors.push({
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return { granted, revoked, unchanged, errors }
  }

  /**
   * Sync auto-qualifications for a single member
   */
  async syncMember(memberId: string): Promise<MemberAutoQualSyncResult> {
    const member = await this.loadMember(memberId)
    if (!member) {
      throw new Error(`Member not found: ${memberId}`)
    }

    const qualTypeMap = await this.loadAutoQualTypeIds()
    return this.evaluateAndApply(member, qualTypeMap)
  }

  /**
   * Core rule engine: evaluate rules and grant/revoke as needed
   */
  private async evaluateAndApply(
    member: MemberWithContext,
    qualTypeMap: Map<string, string>
  ): Promise<MemberAutoQualSyncResult> {
    const granted: string[] = []
    const revoked: string[] = []
    const unchanged: string[] = []

    for (const rule of AUTO_QUAL_RULES) {
      const qualTypeId = qualTypeMap.get(rule.code)
      if (!qualTypeId) continue // Qualification type not seeded yet

      const shouldHave = rule.isEligible(member)
      const hasIt = member.activeQualCodes.has(rule.code)

      if (shouldHave && !hasIt) {
        // Grant
        await this.qualRepo.grant({
          memberId: member.id,
          qualificationTypeId: qualTypeId,
          grantedBy: null,
          notes: `Auto-granted: ${this.buildReason(rule.code, member)}`,
        })
        member.activeQualCodes.add(rule.code)
        granted.push(rule.code)
      } else if (!shouldHave && hasIt) {
        // Revoke — find the active record
        const activeQual = await this.findActiveMemberQual(member.id, qualTypeId)
        if (activeQual) {
          await this.qualRepo.revoke(
            activeQual.id,
            null,
            `Auto-revoked: ${this.buildReason(rule.code, member)}`
          )
          member.activeQualCodes.delete(rule.code)
          revoked.push(rule.code)
        }
      } else {
        unchanged.push(rule.code)
      }
    }

    return { memberId: member.id, granted, revoked, unchanged }
  }

  /**
   * Build a human-readable reason for the grant/revoke action
   */
  private buildReason(code: string, member: MemberWithContext): string {
    switch (code) {
      case 'APS':
        return `Rank displayOrder=${member.rankDisplayOrder}, division=${member.divisionCode ?? 'none'}`
      case 'BM':
        return `Rank displayOrder=${member.rankDisplayOrder}`
      case 'QM':
        return `Rank displayOrder=${member.rankDisplayOrder}`
      case 'DSWK':
        return `Rank displayOrder=${member.rankDisplayOrder}, SWK=${member.activeQualCodes.has('SWK') ? 'yes' : 'no'}`
      default:
        return `Rule: ${code}`
    }
  }

  /**
   * Find an active member qualification by type
   */
  private async findActiveMemberQual(
    memberId: string,
    qualificationTypeId: string
  ): Promise<{ id: string } | null> {
    return this.prisma.memberQualification.findFirst({
      where: {
        memberId,
        qualificationTypeId,
        status: 'active',
      },
      select: { id: true },
    })
  }

  /**
   * Load all active members with rank and division context
   */
  private async loadAllActiveMembers(): Promise<MemberWithContext[]> {
    const members = await this.prisma.member.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rankRef: { select: { displayOrder: true } },
        division: { select: { code: true } },
        qualifications: {
          where: { status: 'active' },
          select: {
            qualificationType: { select: { code: true } },
          },
        },
      },
    })

    return members.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      rankDisplayOrder: m.rankRef?.displayOrder ?? 0,
      divisionCode: m.division?.code ?? null,
      activeQualCodes: new Set(m.qualifications.map((q) => q.qualificationType.code)),
    }))
  }

  /**
   * Load a single member with context for rule evaluation
   */
  private async loadMember(memberId: string): Promise<MemberWithContext | null> {
    const m = await this.prisma.member.findUnique({
      where: { id: memberId, status: 'active' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rankRef: { select: { displayOrder: true } },
        division: { select: { code: true } },
        qualifications: {
          where: { status: 'active' },
          select: {
            qualificationType: { select: { code: true } },
          },
        },
      },
    })

    if (!m) return null

    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      rankDisplayOrder: m.rankRef?.displayOrder ?? 0,
      divisionCode: m.division?.code ?? null,
      activeQualCodes: new Set(m.qualifications.map((q) => q.qualificationType.code)),
    }
  }

  /**
   * Load qualification type IDs for all auto-managed codes
   */
  private async loadAutoQualTypeIds(): Promise<Map<string, string>> {
    const types = await this.prisma.qualificationType.findMany({
      where: { isAutomatic: true },
      select: { id: true, code: true },
    })
    return new Map(types.map((t) => [t.code, t.id]))
  }
}
