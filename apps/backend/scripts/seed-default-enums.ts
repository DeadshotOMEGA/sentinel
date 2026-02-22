#!/usr/bin/env tsx
import 'dotenv/config'
import { prisma } from '@sentinel/database'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface EnumSeedInput {
  code: string
  name: string
  description: string
  chipVariant: string
  chipColor: string
}

interface TagSeedInput {
  name: string
  description: string
  displayOrder: number
  chipVariant: string
  chipColor: string
  isPositional: boolean
}

interface QualificationTypeSeedInput {
  code: string
  name: string
  description: string
  canReceiveLockup: boolean
  isAutomatic: boolean
  displayOrder: number
  tagName: string
}

const RANKS_SEED_SQL_RELATIVE_PATH = '../../../packages/database/scripts/seed-ranks.sql'

const DEFAULT_MEMBER_STATUSES: ReadonlyArray<EnumSeedInput> = [
  {
    code: 'active',
    name: 'Active',
    description: 'Member is active and can check in',
    chipVariant: 'solid',
    chipColor: 'success',
  },
  {
    code: 'inactive',
    name: 'Inactive',
    description: 'Member is inactive and cannot check in',
    chipVariant: 'soft',
    chipColor: 'neutral',
  },
]

const DEFAULT_MEMBER_TYPES: ReadonlyArray<EnumSeedInput> = [
  {
    code: 'class_a',
    name: 'Class A Reserve',
    description: 'Part-time reserve member',
    chipVariant: 'soft',
    chipColor: 'info',
  },
  {
    code: 'class_b',
    name: 'Class B Reserve',
    description: 'Full-time reserve member',
    chipVariant: 'soft',
    chipColor: 'accent',
  },
  {
    code: 'class_c',
    name: 'Class C Reserve',
    description: 'Class C reserve member',
    chipVariant: 'soft',
    chipColor: 'warning',
  },
  {
    code: 'reg_force',
    name: 'Regular Force',
    description: 'Regular force member',
    chipVariant: 'soft',
    chipColor: 'secondary',
  },
  {
    code: 'regular',
    name: 'Regular',
    description: 'Default generic member classification',
    chipVariant: 'soft',
    chipColor: 'primary',
  },
]

const DEFAULT_VISIT_TYPES: ReadonlyArray<EnumSeedInput> = [
  {
    code: 'guest',
    name: 'Guest',
    description: 'General guest visit',
    chipVariant: 'soft',
    chipColor: 'info',
  },
  {
    code: 'contractor',
    name: 'Contractor',
    description: 'Contracted worker on site',
    chipVariant: 'soft',
    chipColor: 'warning',
  },
  {
    code: 'official',
    name: 'Official',
    description: 'Official visit or inspection',
    chipVariant: 'soft',
    chipColor: 'success',
  },
  {
    code: 'other',
    name: 'Other',
    description: 'Other visitor purpose',
    chipVariant: 'soft',
    chipColor: 'neutral',
  },
]

const DEFAULT_BADGE_STATUSES: ReadonlyArray<EnumSeedInput> = [
  {
    code: 'active',
    name: 'Active',
    description: 'Badge is active and can be used',
    chipVariant: 'solid',
    chipColor: 'success',
  },
  {
    code: 'inactive',
    name: 'Inactive',
    description: 'Badge is inactive and should not be used',
    chipVariant: 'soft',
    chipColor: 'neutral',
  },
  {
    code: 'lost',
    name: 'Lost',
    description: 'Badge has been reported lost',
    chipVariant: 'soft',
    chipColor: 'error',
  },
  {
    code: 'damaged',
    name: 'Damaged',
    description: 'Badge is damaged and unusable',
    chipVariant: 'soft',
    chipColor: 'warning',
  },
]

const DEFAULT_TAGS: ReadonlyArray<TagSeedInput> = [
  {
    name: 'DDS',
    description: 'Duty Day Staff responsibility',
    displayOrder: 1,
    chipVariant: 'solid',
    chipColor: 'warning',
    isPositional: true,
  },
  {
    name: 'SWK',
    description: 'Senior Watchkeeper qualification tag',
    displayOrder: 2,
    chipVariant: 'solid',
    chipColor: 'error',
    isPositional: true,
  },
  {
    name: 'BUILDING_AUTH',
    description: 'Authorized for building access and lockup responsibility',
    displayOrder: 3,
    chipVariant: 'solid',
    chipColor: 'primary',
    isPositional: false,
  },
  {
    name: 'VAULT_KEY',
    description: 'Holds vault key access',
    displayOrder: 4,
    chipVariant: 'soft',
    chipColor: 'secondary',
    isPositional: false,
  },
  {
    name: 'VAULT_CODE',
    description: 'Holds vault code access',
    displayOrder: 5,
    chipVariant: 'soft',
    chipColor: 'secondary',
    isPositional: false,
  },
  {
    name: 'FM',
    description: 'Facility Manager responsibility',
    displayOrder: 6,
    chipVariant: 'soft',
    chipColor: 'accent',
    isPositional: false,
  },
  {
    name: 'ISA',
    description: 'Information Systems Authority responsibility',
    displayOrder: 7,
    chipVariant: 'soft',
    chipColor: 'info',
    isPositional: false,
  },
  {
    name: 'APS',
    description: 'Access Point Sentry duty watch qualification',
    displayOrder: 10,
    chipVariant: 'soft',
    chipColor: 'warning',
    isPositional: true,
  },
  {
    name: 'BM',
    description: "Bos'n Mate duty watch qualification",
    displayOrder: 11,
    chipVariant: 'soft',
    chipColor: 'warning',
    isPositional: true,
  },
  {
    name: 'QM',
    description: 'Quartermaster duty watch qualification',
    displayOrder: 12,
    chipVariant: 'soft',
    chipColor: 'warning',
    isPositional: true,
  },
  {
    name: 'DSWK',
    description: 'Deputy Senior Watchkeeper qualification',
    displayOrder: 13,
    chipVariant: 'soft',
    chipColor: 'error',
    isPositional: true,
  },
]

const DEFAULT_QUALIFICATION_TYPES: ReadonlyArray<QualificationTypeSeedInput> = [
  {
    code: 'DDS',
    name: 'DDS Qualified',
    description: 'Trained to serve as Duty Day Staff',
    canReceiveLockup: true,
    isAutomatic: false,
    displayOrder: 1,
    tagName: 'DDS',
  },
  {
    code: 'SWK',
    name: 'SWK Qualified',
    description: 'Trained to serve as Senior Watchkeeper',
    canReceiveLockup: true,
    isAutomatic: false,
    displayOrder: 2,
    tagName: 'SWK',
  },
  {
    code: 'BUILDING_AUTH',
    name: 'Building Authorized',
    description: 'Has alarm codes and building access',
    canReceiveLockup: true,
    isAutomatic: false,
    displayOrder: 3,
    tagName: 'BUILDING_AUTH',
  },
  {
    code: 'VAULT_KEY',
    name: 'Vault Key Holder',
    description: 'Has physical key to the vault',
    canReceiveLockup: false,
    isAutomatic: false,
    displayOrder: 4,
    tagName: 'VAULT_KEY',
  },
  {
    code: 'VAULT_CODE',
    name: 'Vault Code Holder',
    description: 'Knows the vault combination',
    canReceiveLockup: false,
    isAutomatic: false,
    displayOrder: 5,
    tagName: 'VAULT_CODE',
  },
  {
    code: 'FM',
    name: 'Facility Manager',
    description: 'Facility Manager responsibilities',
    canReceiveLockup: false,
    isAutomatic: false,
    displayOrder: 6,
    tagName: 'FM',
  },
  {
    code: 'ISA',
    name: 'ISA',
    description: 'Unit Security Authority responsibilities',
    canReceiveLockup: false,
    isAutomatic: false,
    displayOrder: 7,
    tagName: 'ISA',
  },
  {
    code: 'APS',
    name: 'APS Qualified',
    description: 'Access Point Sentry (auto: S3 not in BMQ)',
    canReceiveLockup: false,
    isAutomatic: true,
    displayOrder: 10,
    tagName: 'APS',
  },
  {
    code: 'BM',
    name: 'BM Qualified',
    description: 'Bosn Mate (auto: S2)',
    canReceiveLockup: false,
    isAutomatic: true,
    displayOrder: 11,
    tagName: 'BM',
  },
  {
    code: 'QM',
    name: 'QM Qualified',
    description: 'Quartermaster (auto: S1)',
    canReceiveLockup: false,
    isAutomatic: true,
    displayOrder: 12,
    tagName: 'QM',
  },
  {
    code: 'DSWK',
    name: 'DSWK Qualified',
    description: 'Deputy Senior Watchkeeper (auto: MS-Lt(N) without SWK)',
    canReceiveLockup: false,
    isAutomatic: true,
    displayOrder: 13,
    tagName: 'DSWK',
  },
]

async function ensureMemberStatuses(): Promise<number> {
  let inserted = 0

  for (const status of DEFAULT_MEMBER_STATUSES) {
    const existing = await prisma.memberStatus.findUnique({
      where: { code: status.code },
      select: { id: true },
    })

    if (existing) {
      continue
    }

    await prisma.memberStatus.create({
      data: {
        ...status,
        isHidden: false,
      },
    })
    inserted += 1
  }

  return inserted
}

async function ensureMemberTypes(): Promise<number> {
  let inserted = 0

  for (const memberType of DEFAULT_MEMBER_TYPES) {
    const existing = await prisma.memberType.findUnique({
      where: { code: memberType.code },
      select: { id: true },
    })

    if (existing) {
      continue
    }

    await prisma.memberType.create({ data: memberType })
    inserted += 1
  }

  return inserted
}

async function ensureVisitTypes(): Promise<number> {
  let inserted = 0

  for (const visitType of DEFAULT_VISIT_TYPES) {
    const existing = await prisma.visitType.findUnique({
      where: { code: visitType.code },
      select: { id: true },
    })

    if (existing) {
      continue
    }

    await prisma.visitType.create({ data: visitType })
    inserted += 1
  }

  return inserted
}

async function ensureBadgeStatuses(): Promise<number> {
  let inserted = 0

  for (const badgeStatus of DEFAULT_BADGE_STATUSES) {
    const existing = await prisma.badgeStatus.findUnique({
      where: { code: badgeStatus.code },
      select: { id: true },
    })

    if (existing) {
      continue
    }

    await prisma.badgeStatus.create({ data: badgeStatus })
    inserted += 1
  }

  return inserted
}

async function ensureTags(): Promise<{ inserted: number; tagIdsByName: Map<string, string> }> {
  let inserted = 0
  const tagIdsByName = new Map<string, string>()

  for (const tag of DEFAULT_TAGS) {
    const existing = await prisma.tag.findUnique({
      where: { name: tag.name },
      select: { id: true },
    })

    if (existing) {
      tagIdsByName.set(tag.name, existing.id)
      continue
    }

    const created = await prisma.tag.create({
      data: {
        name: tag.name,
        description: tag.description,
        displayOrder: tag.displayOrder,
        chipVariant: tag.chipVariant,
        chipColor: tag.chipColor,
        isPositional: tag.isPositional,
      },
      select: { id: true },
    })

    tagIdsByName.set(tag.name, created.id)
    inserted += 1
  }

  return { inserted, tagIdsByName }
}

async function ensureQualificationTypes(tagIdsByName: Map<string, string>): Promise<{
  inserted: number
  linkedTagIds: number
}> {
  let inserted = 0
  let linkedTagIds = 0

  for (const qualificationType of DEFAULT_QUALIFICATION_TYPES) {
    const tagId = tagIdsByName.get(qualificationType.tagName) ?? null
    const existing = await prisma.qualificationType.findUnique({
      where: { code: qualificationType.code },
      select: { id: true, tagId: true },
    })

    if (!existing) {
      await prisma.qualificationType.create({
        data: {
          code: qualificationType.code,
          name: qualificationType.name,
          description: qualificationType.description,
          canReceiveLockup: qualificationType.canReceiveLockup,
          isAutomatic: qualificationType.isAutomatic,
          displayOrder: qualificationType.displayOrder,
          tagId,
        },
      })
      inserted += 1
      continue
    }

    if (!existing.tagId && tagId) {
      await prisma.qualificationType.update({
        where: { id: existing.id },
        data: { tagId },
      })
      linkedTagIds += 1
    }
  }

  return { inserted, linkedTagIds }
}

async function ensureRanks(): Promise<{ inserted: number; existing: number }> {
  const existing = await prisma.rank.count()
  if (existing > 0) {
    return { inserted: 0, existing }
  }

  const seedPath = join(__dirname, RANKS_SEED_SQL_RELATIVE_PATH)
  const seedSql = readFileSync(seedPath, 'utf-8')
  await prisma.$executeRawUnsafe(seedSql)

  const after = await prisma.rank.count()
  return { inserted: after, existing }
}

async function main(): Promise<void> {
  try {
    const { inserted: insertedRanks, existing: existingRanks } = await ensureRanks()
    const insertedMemberStatuses = await ensureMemberStatuses()
    const insertedMemberTypes = await ensureMemberTypes()
    const insertedVisitTypes = await ensureVisitTypes()
    const insertedBadgeStatuses = await ensureBadgeStatuses()
    const { inserted: insertedTags, tagIdsByName } = await ensureTags()
    const { inserted: insertedQualificationTypes, linkedTagIds } =
      await ensureQualificationTypes(tagIdsByName)

    console.log(
      `enum seed complete: ranks_seeded=${insertedRanks} ranks_existing=${existingRanks} member_statuses=${insertedMemberStatuses} member_types=${insertedMemberTypes} visit_types=${insertedVisitTypes} badge_statuses=${insertedBadgeStatuses} tags=${insertedTags} qualification_types=${insertedQualificationTypes} qualification_tag_links=${linkedTagIds}`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('enum seed failed:', error)
  process.exit(1)
})
