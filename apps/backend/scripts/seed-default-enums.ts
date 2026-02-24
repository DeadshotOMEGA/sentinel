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
  description: string | null
  chipVariant: string
  chipColor: string
  isHidden?: boolean
}

interface TagSeedInput {
  name: string
  description: string | null
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

interface DutyRoleSeedInput {
  code: string
  name: string
  description: string
  roleType: 'single' | 'team'
  scheduleType: 'weekly'
  activeDays: number[]
  displayOrder: number
}

interface DutyPositionSeedInput {
  dutyRoleCode: 'DUTY_WATCH'
  code: string
  name: string
  description: string
  maxSlots: number
  displayOrder: number
}

const RANKS_SEED_SQL_RELATIVE_PATH = '../../../packages/database/scripts/seed-ranks.sql'
const RANK_INSERT_STATEMENT_REGEX = /INSERT INTO ranks[\s\S]*?;/gi
const RANK_REPLACEMENT_MAPPINGS = [
  { deprecatedCode: 'OS', replacementCode: 'S3' },
  { deprecatedCode: 'AB', replacementCode: 'S2' },
  { deprecatedCode: 'LS', replacementCode: 'S1' },
] as const

const DEFAULT_MEMBER_STATUSES: ReadonlyArray<EnumSeedInput> = [
  {
    code: 'active',
    name: 'Active',
    description: 'Member is actively with the Unit',
    chipVariant: 'dot',
    chipColor: 'success',
    isHidden: false,
  },
  {
    code: 'deployed',
    name: 'Deployed',
    description: 'Member deployed to another coast',
    chipVariant: 'dot',
    chipColor: 'warning',
    isHidden: true,
  },
  {
    code: 'inactive',
    name: 'Inactive',
    description: 'Member is inactive and cannot check in',
    chipVariant: 'dot',
    chipColor: 'neutral',
    isHidden: false,
  },
  {
    code: 'suspended',
    name: 'Suspended',
    description: null,
    chipVariant: 'dot',
    chipColor: 'error',
    isHidden: false,
  },
]

const DEFAULT_MEMBER_TYPES: ReadonlyArray<EnumSeedInput> = [
  {
    code: 'class_a',
    name: 'Class A',
    description:
      'The part-time employment most often associated with the Reserve Force. Members serve short periods of service (to a maximum of 12 consecutive calendar days and a maximum of 16 cumulative calendar days per month).',
    chipVariant: 'light',
    chipColor: 'primary',
  },
  {
    code: 'class_b',
    name: 'Class B',
    description:
      'This full-time Reserve Service is for 13 or more consecutive days. Service can include employment as staff at training establishments, attendance at training courses, or duties of a temporary nature when it is not practical to employ Regular Force members. This class of Reserve Service has two groups: those employed for short-term (180 days or less) and those employed for longer term (more than 180 days).',
    chipVariant: 'light',
    chipColor: 'primary',
  },
  {
    code: 'class_c',
    name: 'Class C',
    description:
      'This is full-time Reserve Service. There is no minimum period applicable to this class of Reserve Service. Class “C” Reserve Service may be operational (related to a specific military tasking in or outside of Canada) or non-operational.',
    chipVariant: 'light',
    chipColor: 'primary',
  },
  {
    code: 'reg_force',
    name: 'Reg Force',
    description: null,
    chipVariant: 'light',
    chipColor: 'error',
  },
]

const DEFAULT_VISIT_TYPES: ReadonlyArray<EnumSeedInput> = [
  {
    code: 'contractor',
    name: 'Contractor',
    description: 'Contractor at the Unit to conduct work',
    chipVariant: 'shadow',
    chipColor: 'blue',
  },
  {
    code: 'guest',
    name: 'Guest',
    description: 'Guest visitor to the Unit',
    chipVariant: 'shadow',
    chipColor: 'success',
  },
  {
    code: 'official',
    name: 'Official',
    description: 'Official visit or inspection',
    chipVariant: 'shadow',
    chipColor: 'default',
  },
  {
    code: 'other',
    name: 'Other',
    description: 'Other visitor purpose',
    chipVariant: 'shadow',
    chipColor: 'info',
  },
]

const DEFAULT_BADGE_STATUSES: ReadonlyArray<EnumSeedInput> = [
  {
    code: 'active',
    name: 'Active',
    description: 'Badge is able to be used',
    chipVariant: 'bordered',
    chipColor: 'success',
  },
  {
    code: 'damaged',
    name: 'Damaged',
    description: 'Badge is damaged and unusable',
    chipVariant: 'bordered',
    chipColor: 'warning',
  },
  {
    code: 'disabled',
    name: 'Disabled',
    description: 'Badge has been disabled by an Admin',
    chipVariant: 'bordered',
    chipColor: 'danger',
  },
  {
    code: 'inactive',
    name: 'Inactive',
    description: 'Badge is inactive and should not be used',
    chipVariant: 'bordered',
    chipColor: 'neutral',
  },
  {
    code: 'lost',
    name: 'Lost',
    description: 'Badge has been lost or misplaced',
    chipVariant: 'bordered',
    chipColor: 'warning',
  },
]

const DEFAULT_TAGS: ReadonlyArray<TagSeedInput> = [
  {
    name: 'DDS',
    description: 'Duty Day Staff responsibility',
    displayOrder: 1,
    chipVariant: 'solid',
    chipColor: 'success',
    isPositional: false,
  },
  {
    name: 'SWK',
    description: 'Senior Watchkeeper qualification tag',
    displayOrder: 3,
    chipVariant: 'solid',
    chipColor: 'error',
    isPositional: false,
  },
  {
    name: 'CMD',
    description: 'Command Team',
    displayOrder: 7,
    chipVariant: 'shadow',
    chipColor: 'warning',
    isPositional: false,
  },
  {
    name: 'VIP',
    description: 'Member is a Very Important Person',
    displayOrder: 8,
    chipVariant: 'shadow',
    chipColor: 'blue',
    isPositional: false,
  },
  {
    name: 'FTS',
    description: 'Full Time Staff',
    displayOrder: 9,
    chipVariant: 'shadow',
    chipColor: 'green',
    isPositional: false,
  },
  {
    name: 'APS',
    description: 'Access Point Sentry duty watch qualification',
    displayOrder: 10,
    chipVariant: 'solid',
    chipColor: 'purple',
    isPositional: false,
  },
  {
    name: 'BM',
    description: "Bos'n Mate duty watch qualification",
    displayOrder: 11,
    chipVariant: 'solid',
    chipColor: 'purple',
    isPositional: false,
  },
  {
    name: 'QM',
    description: 'Quartermaster duty watch qualification',
    displayOrder: 12,
    chipVariant: 'solid',
    chipColor: 'purple',
    isPositional: false,
  },
  {
    name: 'DSWK',
    description: 'Deputy Senior Watchkeeper qualification',
    displayOrder: 13,
    chipVariant: 'solid',
    chipColor: 'purple',
    isPositional: false,
  },
  {
    name: 'Commanding Officer',
    description: 'Commanding Officer',
    displayOrder: 14,
    chipVariant: 'faded',
    chipColor: 'primary',
    isPositional: true,
  },
  {
    name: 'Executive Officer',
    description: 'Executive Officer',
    displayOrder: 15,
    chipVariant: 'faded',
    chipColor: 'primary',
    isPositional: true,
  },
  {
    name: 'COXN',
    description: 'Coxswain',
    displayOrder: 16,
    chipVariant: 'faded',
    chipColor: 'primary',
    isPositional: true,
  },
  {
    name: 'Training Officer',
    description: null,
    displayOrder: 17,
    chipVariant: 'faded',
    chipColor: 'primary',
    isPositional: true,
  },
  {
    name: 'Facility Manager',
    description: null,
    displayOrder: 18,
    chipVariant: 'faded',
    chipColor: 'primary',
    isPositional: true,
  },
  {
    name: 'RPO',
    description: 'Regulating Petty Officer',
    displayOrder: 19,
    chipVariant: 'faded',
    chipColor: 'primary',
    isPositional: true,
  },
  {
    name: 'Stores Mgr',
    description: 'Stores Manager',
    displayOrder: 20,
    chipVariant: 'faded',
    chipColor: 'primary',
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

const DEFAULT_DUTY_ROLES: ReadonlyArray<DutyRoleSeedInput> = [
  {
    code: 'DDS',
    name: 'Duty Day Staff',
    description: 'Single person responsible for daily operations Monday through Sunday',
    roleType: 'single',
    scheduleType: 'weekly',
    activeDays: [1, 2, 3, 4, 5, 6, 7],
    displayOrder: 1,
  },
  {
    code: 'DUTY_WATCH',
    name: 'Duty Watch',
    description: 'Evening team responsible for security on Tuesday and Thursday nights',
    roleType: 'team',
    scheduleType: 'weekly',
    activeDays: [2, 4],
    displayOrder: 2,
  },
]

const DEFAULT_DUTY_POSITIONS: ReadonlyArray<DutyPositionSeedInput> = [
  {
    dutyRoleCode: 'DUTY_WATCH',
    code: 'SWK',
    name: 'Senior Watchkeeper',
    description: 'Team leader, takes lockup responsibility',
    maxSlots: 1,
    displayOrder: 1,
  },
  {
    dutyRoleCode: 'DUTY_WATCH',
    code: 'DSWK',
    name: 'Deputy Senior Watchkeeper',
    description: 'Backup to SWK',
    maxSlots: 1,
    displayOrder: 2,
  },
  {
    dutyRoleCode: 'DUTY_WATCH',
    code: 'QM',
    name: 'Quartermaster',
    description: 'Watch duties',
    maxSlots: 1,
    displayOrder: 3,
  },
  {
    dutyRoleCode: 'DUTY_WATCH',
    code: 'BM',
    name: "Bos'n Mate",
    description: 'Watch duties',
    maxSlots: 1,
    displayOrder: 4,
  },
  {
    dutyRoleCode: 'DUTY_WATCH',
    code: 'APS',
    name: 'Access Point Sentry',
    description: 'Two positions for access control',
    maxSlots: 2,
    displayOrder: 5,
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
        code: status.code,
        name: status.name,
        description: status.description,
        chipVariant: status.chipVariant,
        chipColor: status.chipColor,
        isHidden: status.isHidden ?? false,
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

async function ensureTags(): Promise<{
  inserted: number
  updated: number
  tagIdsByName: Map<string, string>
}> {
  let inserted = 0
  let updated = 0
  const tagIdsByName = new Map<string, string>()

  const tagsInOrder = [...DEFAULT_TAGS].sort((a, b) => a.displayOrder - b.displayOrder)

  for (const tag of tagsInOrder) {
    const existing = await prisma.tag.findUnique({
      where: { name: tag.name },
      select: {
        id: true,
        description: true,
        displayOrder: true,
        chipVariant: true,
        chipColor: true,
        isPositional: true,
      },
    })

    if (existing) {
      const needsUpdate =
        existing.description !== tag.description ||
        existing.displayOrder !== tag.displayOrder ||
        existing.chipVariant !== tag.chipVariant ||
        existing.chipColor !== tag.chipColor ||
        existing.isPositional !== tag.isPositional

      if (needsUpdate) {
        await prisma.tag.update({
          where: { id: existing.id },
          data: {
            description: tag.description,
            displayOrder: tag.displayOrder,
            chipVariant: tag.chipVariant,
            chipColor: tag.chipColor,
            isPositional: tag.isPositional,
          },
        })
        updated += 1
      }

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

  return { inserted, updated, tagIdsByName }
}

async function ensureQualificationTypes(tagIdsByName: Map<string, string>): Promise<{
  inserted: number
  updated: number
  linkedTagIds: number
}> {
  let inserted = 0
  let updated = 0
  let linkedTagIds = 0

  for (const qualificationType of DEFAULT_QUALIFICATION_TYPES) {
    const tagId = tagIdsByName.get(qualificationType.tagName)
    if (!tagId) {
      throw new Error(
        `Missing linked tag '${qualificationType.tagName}' for qualification type '${qualificationType.code}'`
      )
    }
    const existing = await prisma.qualificationType.findUnique({
      where: { code: qualificationType.code },
      select: {
        id: true,
        name: true,
        description: true,
        canReceiveLockup: true,
        isAutomatic: true,
        displayOrder: true,
        tagId: true,
      },
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

    const needsUpdate =
      existing.name !== qualificationType.name ||
      existing.description !== qualificationType.description ||
      existing.canReceiveLockup !== qualificationType.canReceiveLockup ||
      existing.isAutomatic !== qualificationType.isAutomatic ||
      existing.displayOrder !== qualificationType.displayOrder ||
      existing.tagId !== tagId

    if (needsUpdate) {
      await prisma.qualificationType.update({
        where: { id: existing.id },
        data: {
          name: qualificationType.name,
          description: qualificationType.description,
          canReceiveLockup: qualificationType.canReceiveLockup,
          isAutomatic: qualificationType.isAutomatic,
          displayOrder: qualificationType.displayOrder,
          tagId,
        },
      })
      updated += 1
      if (existing.tagId !== tagId) {
        linkedTagIds += 1
      }
    }
  }

  return { inserted, updated, linkedTagIds }
}

async function ensureDutyRoles(): Promise<{
  inserted: number
  roleIdsByCode: Map<string, string>
}> {
  let inserted = 0
  const roleIdsByCode = new Map<string, string>()

  for (const dutyRole of DEFAULT_DUTY_ROLES) {
    const existing = await prisma.dutyRole.findUnique({
      where: { code: dutyRole.code },
      select: { id: true },
    })

    if (!existing) {
      const created = await prisma.dutyRole.create({
        data: dutyRole,
        select: { id: true },
      })
      roleIdsByCode.set(dutyRole.code, created.id)
      inserted += 1
      continue
    }

    await prisma.dutyRole.update({
      where: { id: existing.id },
      data: {
        name: dutyRole.name,
        description: dutyRole.description,
        roleType: dutyRole.roleType,
        scheduleType: dutyRole.scheduleType,
        activeDays: dutyRole.activeDays,
        displayOrder: dutyRole.displayOrder,
      },
    })
    roleIdsByCode.set(dutyRole.code, existing.id)
  }

  return { inserted, roleIdsByCode }
}

async function ensureDutyPositions(roleIdsByCode: Map<string, string>): Promise<number> {
  let inserted = 0

  for (const dutyPosition of DEFAULT_DUTY_POSITIONS) {
    const dutyRoleId = roleIdsByCode.get(dutyPosition.dutyRoleCode)
    if (!dutyRoleId) {
      continue
    }

    const existing = await prisma.dutyPosition.findUnique({
      where: {
        dutyRoleId_code: {
          dutyRoleId,
          code: dutyPosition.code,
        },
      },
      select: { id: true },
    })

    if (!existing) {
      await prisma.dutyPosition.create({
        data: {
          dutyRoleId,
          code: dutyPosition.code,
          name: dutyPosition.name,
          description: dutyPosition.description,
          maxSlots: dutyPosition.maxSlots,
          displayOrder: dutyPosition.displayOrder,
        },
      })
      inserted += 1
      continue
    }

    await prisma.dutyPosition.update({
      where: { id: existing.id },
      data: {
        name: dutyPosition.name,
        description: dutyPosition.description,
        maxSlots: dutyPosition.maxSlots,
        displayOrder: dutyPosition.displayOrder,
      },
    })
  }

  return inserted
}

async function ensureRanks(): Promise<{ inserted: number; existing: number }> {
  const existing = await prisma.rank.count()
  const seedPath = join(__dirname, RANKS_SEED_SQL_RELATIVE_PATH)
  const seedSql = readFileSync(seedPath, 'utf-8')
  const insertStatements = seedSql.match(RANK_INSERT_STATEMENT_REGEX) ?? []

  if (insertStatements.length === 0) {
    throw new Error(`No rank INSERT statements found in ${seedPath}`)
  }

  for (const statement of insertStatements) {
    const normalizedStatement = statement.trim().replace(/;\s*$/, '')
    await prisma.$executeRawUnsafe(`${normalizedStatement}\nON CONFLICT (code) DO NOTHING`)
  }

  for (const mapping of RANK_REPLACEMENT_MAPPINGS) {
    await prisma.$executeRawUnsafe(
      `
      UPDATE ranks AS deprecated
      SET replaced_by = replacement.id
      FROM ranks AS replacement
      WHERE deprecated.code = $1
        AND replacement.code = $2
        AND deprecated.replaced_by IS DISTINCT FROM replacement.id
      `,
      mapping.deprecatedCode,
      mapping.replacementCode
    )
  }

  const after = await prisma.rank.count()
  return { inserted: Math.max(after - existing, 0), existing }
}

async function main(): Promise<void> {
  try {
    const { inserted: insertedRanks, existing: existingRanks } = await ensureRanks()
    const insertedMemberStatuses = await ensureMemberStatuses()
    const insertedMemberTypes = await ensureMemberTypes()
    const insertedVisitTypes = await ensureVisitTypes()
    const insertedBadgeStatuses = await ensureBadgeStatuses()
    const { inserted: insertedTags, updated: updatedTags, tagIdsByName } = await ensureTags()
    const {
      inserted: insertedQualificationTypes,
      updated: updatedQualificationTypes,
      linkedTagIds,
    } = await ensureQualificationTypes(tagIdsByName)
    const { inserted: insertedDutyRoles, roleIdsByCode } = await ensureDutyRoles()
    const insertedDutyPositions = await ensureDutyPositions(roleIdsByCode)

    console.log(
      `enum seed complete: ranks_seeded=${insertedRanks} ranks_existing=${existingRanks} member_statuses=${insertedMemberStatuses} member_types=${insertedMemberTypes} visit_types=${insertedVisitTypes} badge_statuses=${insertedBadgeStatuses} tags_inserted=${insertedTags} tags_updated=${updatedTags} qualification_types_inserted=${insertedQualificationTypes} qualification_types_updated=${updatedQualificationTypes} qualification_tag_links=${linkedTagIds} duty_roles=${insertedDutyRoles} duty_positions=${insertedDutyPositions}`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('enum seed failed:', error)
  process.exit(1)
})
