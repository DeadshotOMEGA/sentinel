#!/usr/bin/env tsx
import 'dotenv/config'
import { prisma } from '@sentinel/database'

interface EnumSeedInput {
  code: string
  name: string
  description: string
  chipVariant: string
  chipColor: string
}

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

async function main(): Promise<void> {
  try {
    const insertedMemberStatuses = await ensureMemberStatuses()
    const insertedMemberTypes = await ensureMemberTypes()
    const insertedVisitTypes = await ensureVisitTypes()
    const insertedBadgeStatuses = await ensureBadgeStatuses()

    console.log(
      `enum seed complete: member_statuses=${insertedMemberStatuses} member_types=${insertedMemberTypes} visit_types=${insertedVisitTypes} badge_statuses=${insertedBadgeStatuses}`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('enum seed failed:', error)
  process.exit(1)
})
