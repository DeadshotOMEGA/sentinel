import bcrypt from 'bcryptjs'
import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import {
  SENTINEL_BOOTSTRAP_BADGE_SERIAL,
  SENTINEL_BOOTSTRAP_DEFAULT_PIN,
  SENTINEL_BOOTSTRAP_DIVISION_CODE,
  SENTINEL_BOOTSTRAP_DIVISION_NAME,
  SENTINEL_BOOTSTRAP_RANK_CODE,
  SENTINEL_BOOTSTRAP_SERVICE_NUMBER,
  SENTINEL_BOOTSTRAP_SETTING_KEY,
  getSentinelBootstrapIdentity,
} from '../lib/system-bootstrap.js'

const BCRYPT_COST = 12

interface EnsureIntegrityOptions {
  ensureDeleteProtectionTriggers?: boolean
}

export interface SentinelBootstrapIntegrityResult {
  memberId: string
  badgeId: string
  badgeSerial: string
}

export class SentinelBootstrapIntegrityService {
  private prisma: PrismaClientInstance

  constructor(prismaClient: PrismaClientInstance = defaultPrisma) {
    this.prisma = prismaClient
  }

  async ensureIntegrity(
    options: EnsureIntegrityOptions = {}
  ): Promise<SentinelBootstrapIntegrityResult> {
    const { ensureDeleteProtectionTriggers = false } = options
    const existingIdentity = await getSentinelBootstrapIdentity(this.prisma)
    const rank = await this.ensureSentinelRank()
    const division = await this.ensureSentinelDivision()

    const identity = await this.prisma.$transaction(async (tx) => {
      let memberRecord = existingIdentity
        ? await tx.member.findUnique({
            where: { id: existingIdentity.memberId },
            select: { id: true, pinHash: true, mustChangePin: true },
          })
        : null

      if (!memberRecord) {
        memberRecord = await tx.member.findUnique({
          where: { serviceNumber: SENTINEL_BOOTSTRAP_SERVICE_NUMBER },
          select: { id: true, pinHash: true, mustChangePin: true },
        })
      }

      if (!memberRecord) {
        const pinHash = await bcrypt.hash(SENTINEL_BOOTSTRAP_DEFAULT_PIN, BCRYPT_COST)
        memberRecord = await tx.member.create({
          data: {
            serviceNumber: SENTINEL_BOOTSTRAP_SERVICE_NUMBER,
            rankId: rank.id,
            rank: rank.code,
            divisionId: division.id,
            firstName: 'Sentinel',
            lastName: 'System',
            displayName: 'Sentinel System',
            memberType: 'class_a',
            status: 'active',
            accountLevel: 10,
            pinHash,
            mustChangePin: false,
          },
          select: { id: true, pinHash: true, mustChangePin: true },
        })
      }

      const shouldResetPin =
        !memberRecord.pinHash ||
        !(await bcrypt.compare(SENTINEL_BOOTSTRAP_DEFAULT_PIN, memberRecord.pinHash))

      await tx.member.update({
        where: { id: memberRecord.id },
        data: {
          serviceNumber: SENTINEL_BOOTSTRAP_SERVICE_NUMBER,
          firstName: 'Sentinel',
          lastName: 'System',
          displayName: 'Sentinel System',
          divisionId: division.id,
          rankId: rank.id,
          rank: rank.code,
          status: 'active',
          accountLevel: 10,
          mustChangePin: false,
          ...(shouldResetPin
            ? { pinHash: await bcrypt.hash(SENTINEL_BOOTSTRAP_DEFAULT_PIN, BCRYPT_COST) }
            : {}),
        },
      })

      const bootstrapBadge = await tx.badge.findUnique({
        where: { serialNumber: SENTINEL_BOOTSTRAP_BADGE_SERIAL },
        select: { id: true },
      })

      const identityBadge = existingIdentity
        ? await tx.badge.findUnique({
            where: { id: existingIdentity.badgeId },
            select: { id: true, serialNumber: true },
          })
        : null

      let badgeRecord = bootstrapBadge ?? identityBadge
      if (!badgeRecord) {
        badgeRecord = await tx.badge.create({
          data: {
            serialNumber: SENTINEL_BOOTSTRAP_BADGE_SERIAL,
            assignmentType: 'member',
            assignedToId: memberRecord.id,
            status: 'active',
          },
          select: { id: true, serialNumber: true },
        })
      }

      await tx.badge.update({
        where: { id: badgeRecord.id },
        data: {
          serialNumber: SENTINEL_BOOTSTRAP_BADGE_SERIAL,
          assignmentType: 'member',
          assignedToId: memberRecord.id,
          status: 'active',
        },
      })

      await tx.member.update({
        where: { id: memberRecord.id },
        data: { badgeId: badgeRecord.id },
      })

      await tx.setting.upsert({
        where: { key: SENTINEL_BOOTSTRAP_SETTING_KEY },
        update: {
          value: {
            memberId: memberRecord.id,
            badgeId: badgeRecord.id,
            badgeSerial: SENTINEL_BOOTSTRAP_BADGE_SERIAL,
            serviceNumber: SENTINEL_BOOTSTRAP_SERVICE_NUMBER,
            defaultPin: SENTINEL_BOOTSTRAP_DEFAULT_PIN,
            managedBy: 'sentinel-appliance',
            updatedAt: new Date().toISOString(),
          },
          category: 'security',
          description: 'Protected Sentinel bootstrap account identity metadata',
        },
        create: {
          key: SENTINEL_BOOTSTRAP_SETTING_KEY,
          value: {
            memberId: memberRecord.id,
            badgeId: badgeRecord.id,
            badgeSerial: SENTINEL_BOOTSTRAP_BADGE_SERIAL,
            serviceNumber: SENTINEL_BOOTSTRAP_SERVICE_NUMBER,
            defaultPin: SENTINEL_BOOTSTRAP_DEFAULT_PIN,
            managedBy: 'sentinel-appliance',
            createdAt: new Date().toISOString(),
          },
          category: 'security',
          description: 'Protected Sentinel bootstrap account identity metadata',
        },
      })

      return { memberId: memberRecord.id, badgeId: badgeRecord.id }
    })

    if (ensureDeleteProtectionTriggers) {
      await this.ensureDeleteProtectionTriggers()
    }

    return {
      memberId: identity.memberId,
      badgeId: identity.badgeId,
      badgeSerial: SENTINEL_BOOTSTRAP_BADGE_SERIAL,
    }
  }

  private async ensureSentinelRank(): Promise<{ id: string; code: string }> {
    const existing = await this.prisma.rank.findUnique({
      where: { code: SENTINEL_BOOTSTRAP_RANK_CODE },
      select: { id: true, code: true },
    })
    if (existing) return existing

    return this.prisma.rank.create({
      data: {
        code: SENTINEL_BOOTSTRAP_RANK_CODE,
        name: 'Sentinel System',
        branch: 'navy',
        category: 'senior_ncm',
        displayOrder: 99,
        isActive: true,
      },
      select: { id: true, code: true },
    })
  }

  private async ensureSentinelDivision(): Promise<{ id: string; code: string }> {
    const existing = await this.prisma.division.findUnique({
      where: { code: SENTINEL_BOOTSTRAP_DIVISION_CODE },
      select: { id: true, code: true },
    })
    if (existing) return existing

    return this.prisma.division.create({
      data: {
        code: SENTINEL_BOOTSTRAP_DIVISION_CODE,
        name: SENTINEL_BOOTSTRAP_DIVISION_NAME,
        description: 'Protected division for Sentinel internal bootstrap account',
      },
      select: { id: true, code: true },
    })
  }

  private async ensureDeleteProtectionTriggers(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION protect_sentinel_bootstrap_records()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      DECLARE
        protected_member_id UUID;
        protected_badge_id UUID;
      BEGIN
        SELECT
          NULLIF(value->>'memberId', '')::uuid,
          NULLIF(value->>'badgeId', '')::uuid
        INTO protected_member_id, protected_badge_id
        FROM settings
        WHERE key = '${SENTINEL_BOOTSTRAP_SETTING_KEY}'
        LIMIT 1;

        IF TG_TABLE_NAME = 'members' AND OLD.id = protected_member_id THEN
          RAISE EXCEPTION 'Cannot delete protected Sentinel bootstrap member';
        END IF;

        IF TG_TABLE_NAME = 'badges' AND OLD.id = protected_badge_id THEN
          RAISE EXCEPTION 'Cannot delete protected Sentinel bootstrap badge';
        END IF;

        RETURN OLD;
      END;
      $$;
    `)

    await this.prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trg_protect_sentinel_bootstrap_member_delete ON members;
      CREATE TRIGGER trg_protect_sentinel_bootstrap_member_delete
      BEFORE DELETE ON members
      FOR EACH ROW
      EXECUTE FUNCTION protect_sentinel_bootstrap_records();
    `)

    await this.prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trg_protect_sentinel_bootstrap_badge_delete ON badges;
      CREATE TRIGGER trg_protect_sentinel_bootstrap_badge_delete
      BEFORE DELETE ON badges
      FOR EACH ROW
      EXECUTE FUNCTION protect_sentinel_bootstrap_records();
    `)
  }
}
