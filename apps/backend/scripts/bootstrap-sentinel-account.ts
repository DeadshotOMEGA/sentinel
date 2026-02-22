#!/usr/bin/env tsx
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '@sentinel/database'
import {
  SENTINEL_BOOTSTRAP_BADGE_SERIAL,
  SENTINEL_BOOTSTRAP_DEFAULT_PIN,
  SENTINEL_BOOTSTRAP_RANK_CODE,
  SENTINEL_BOOTSTRAP_SERVICE_NUMBER,
  SENTINEL_BOOTSTRAP_SETTING_KEY,
  getSentinelBootstrapIdentity,
} from '../src/lib/system-bootstrap.js'

const BCRYPT_COST = 12

async function ensureSentinelRank(): Promise<{ id: string; code: string }> {
  const existing = await prisma.rank.findUnique({
    where: { code: SENTINEL_BOOTSTRAP_RANK_CODE },
    select: { id: true, code: true },
  })
  if (existing) {
    return existing
  }

  return prisma.rank.create({
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

async function ensureDeleteProtectionTriggers(): Promise<void> {
  await prisma.$executeRawUnsafe(`
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

  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_protect_sentinel_bootstrap_member_delete ON members;
    CREATE TRIGGER trg_protect_sentinel_bootstrap_member_delete
    BEFORE DELETE ON members
    FOR EACH ROW
    EXECUTE FUNCTION protect_sentinel_bootstrap_records();
  `)

  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_protect_sentinel_bootstrap_badge_delete ON badges;
    CREATE TRIGGER trg_protect_sentinel_bootstrap_badge_delete
    BEFORE DELETE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION protect_sentinel_bootstrap_records();
  `)
}

async function ensureBootstrapIdentity(): Promise<void> {
  const rank = await ensureSentinelRank()
  const pinHash = await bcrypt.hash(SENTINEL_BOOTSTRAP_DEFAULT_PIN, BCRYPT_COST)
  const existingIdentity = await getSentinelBootstrapIdentity(prisma)

  const member = await prisma.$transaction(async (tx) => {
    let memberRecord = existingIdentity
      ? await tx.member.findUnique({
          where: { id: existingIdentity.memberId },
          select: { id: true, pinHash: true },
        })
      : null

    if (!memberRecord) {
      memberRecord = await tx.member.findUnique({
        where: { serviceNumber: SENTINEL_BOOTSTRAP_SERVICE_NUMBER },
        select: { id: true, pinHash: true },
      })
    }

    if (!memberRecord) {
      memberRecord = await tx.member.create({
        data: {
          serviceNumber: SENTINEL_BOOTSTRAP_SERVICE_NUMBER,
          rankId: rank.id,
          rank: rank.code,
          firstName: 'Sentinel',
          lastName: 'System',
          displayName: 'Sentinel System',
          memberType: 'class_a',
          status: 'active',
          accountLevel: 10,
          pinHash,
        },
        select: { id: true, pinHash: true },
      })
    } else if (!memberRecord.pinHash) {
      memberRecord = await tx.member.update({
        where: { id: memberRecord.id },
        data: { pinHash, status: 'active', accountLevel: 10 },
        select: { id: true, pinHash: true },
      })
    }

    let badgeRecord = existingIdentity
      ? await tx.badge.findUnique({
          where: { id: existingIdentity.badgeId },
          select: { id: true },
        })
      : null

    if (!badgeRecord) {
      badgeRecord = await tx.badge.findUnique({
        where: { serialNumber: SENTINEL_BOOTSTRAP_BADGE_SERIAL },
        select: { id: true },
      })
    }

    if (!badgeRecord) {
      badgeRecord = await tx.badge.create({
        data: {
          serialNumber: SENTINEL_BOOTSTRAP_BADGE_SERIAL,
          assignmentType: 'member',
          assignedToId: memberRecord.id,
          status: 'active',
        },
        select: { id: true },
      })
    }

    await tx.badge.update({
      where: { id: badgeRecord.id },
      data: {
        assignmentType: 'member',
        assignedToId: memberRecord.id,
        status: 'active',
      },
    })

    await tx.member.update({
      where: { id: memberRecord.id },
      data: {
        badgeId: badgeRecord.id,
        status: 'active',
        accountLevel: 10,
      },
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

  await ensureDeleteProtectionTriggers()
  console.log(
    `bootstrap complete: memberId=${member.memberId} badgeId=${member.badgeId} serial=${SENTINEL_BOOTSTRAP_BADGE_SERIAL}`
  )
}

async function main() {
  try {
    await ensureBootstrapIdentity()
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('bootstrap failed:', error)
  process.exit(1)
})
