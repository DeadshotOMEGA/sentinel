#!/usr/bin/env tsx
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { prisma } from '@sentinel/database'
import {
  SENTINEL_BOOTSTRAP_BADGE_SERIAL,
  SENTINEL_BOOTSTRAP_SERVICE_NUMBER,
} from '../src/lib/system-bootstrap.js'

interface ImportMember {
  serviceNumber: string
  employeeNumber: string | null
  firstName: string
  lastName: string
  displayName: string | null
  initials: string | null
  rank: string
  divisionCode: string | null
  mess: string | null
  moc: string | null
  memberType: string
  status: string
  classDetails: string | null
  notes: string | null
  contractStart: string | null
  contractEnd: string | null
  email: string | null
  homePhone: string | null
  mobilePhone: string | null
  accountLevel: number
}

interface ImportBadge {
  serialNumber: string
  assignmentType: string
  status: string
  assignedServiceNumber: string | null
}

interface ImportPayload {
  members: ImportMember[]
  badges: ImportBadge[]
}

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function main() {
  const inputPath = getArgValue('--input')
  if (!inputPath) {
    console.error('Missing required argument: --input <path>')
    process.exit(1)
  }

  const raw = await readFile(inputPath, 'utf8')
  const parsed = JSON.parse(raw) as ImportPayload
  const members = parsed.members ?? []
  const badges = parsed.badges ?? []

  const ranks = await prisma.rank.findMany({
    select: { id: true, code: true },
  })
  const rankIdByCode = new Map(ranks.map((rank) => [rank.code, rank.id]))

  const divisions = await prisma.division.findMany({
    select: { id: true, code: true },
  })
  const divisionIdByCode = new Map(divisions.map((division) => [division.code, division.id]))

  const memberIdByServiceNumber = new Map<string, string>()
  const skippedMembers: string[] = []

  for (const member of members) {
    if (member.serviceNumber === SENTINEL_BOOTSTRAP_SERVICE_NUMBER) {
      continue
    }

    const rankId = rankIdByCode.get(member.rank)
    if (!rankId) {
      skippedMembers.push(member.serviceNumber)
      continue
    }

    const divisionId = member.divisionCode
      ? (divisionIdByCode.get(member.divisionCode) ?? null)
      : null

    const upserted = await prisma.member.upsert({
      where: { serviceNumber: member.serviceNumber },
      create: {
        serviceNumber: member.serviceNumber,
        employeeNumber: member.employeeNumber,
        firstName: member.firstName,
        lastName: member.lastName,
        displayName: member.displayName,
        initials: member.initials,
        rank: member.rank,
        rankId,
        divisionId,
        mess: member.mess,
        moc: member.moc,
        memberType: member.memberType,
        status: member.status,
        classDetails: member.classDetails,
        notes: member.notes,
        contract_start: parseDate(member.contractStart),
        contract_end: parseDate(member.contractEnd),
        email: member.email,
        homePhone: member.homePhone,
        mobilePhone: member.mobilePhone,
        accountLevel: member.accountLevel,
      },
      update: {
        employeeNumber: member.employeeNumber,
        firstName: member.firstName,
        lastName: member.lastName,
        displayName: member.displayName,
        initials: member.initials,
        rank: member.rank,
        rankId,
        divisionId,
        mess: member.mess,
        moc: member.moc,
        memberType: member.memberType,
        status: member.status,
        classDetails: member.classDetails,
        notes: member.notes,
        contract_start: parseDate(member.contractStart),
        contract_end: parseDate(member.contractEnd),
        email: member.email,
        homePhone: member.homePhone,
        mobilePhone: member.mobilePhone,
        accountLevel: member.accountLevel,
      },
      select: { id: true, serviceNumber: true },
    })

    memberIdByServiceNumber.set(upserted.serviceNumber, upserted.id)
  }

  let badgesUpserted = 0
  for (const badge of badges) {
    if (badge.serialNumber === SENTINEL_BOOTSTRAP_BADGE_SERIAL) {
      continue
    }

    const assignedMemberId = badge.assignedServiceNumber
      ? (memberIdByServiceNumber.get(badge.assignedServiceNumber) ?? null)
      : null

    const upsertedBadge = await prisma.badge.upsert({
      where: { serialNumber: badge.serialNumber },
      create: {
        serialNumber: badge.serialNumber,
        status: badge.status,
        assignmentType: assignedMemberId ? 'member' : 'unassigned',
        assignedToId: assignedMemberId,
      },
      update: {
        status: badge.status,
        assignmentType: assignedMemberId ? 'member' : 'unassigned',
        assignedToId: assignedMemberId,
      },
      select: { id: true },
    })

    if (assignedMemberId) {
      await prisma.member.updateMany({
        where: {
          badgeId: upsertedBadge.id,
          NOT: { id: assignedMemberId },
        },
        data: {
          badgeId: null,
        },
      })
      await prisma.member.update({
        where: { id: assignedMemberId },
        data: { badgeId: upsertedBadge.id },
      })
    }

    badgesUpserted += 1
  }

  console.log(
    `import complete: members_upserted=${memberIdByServiceNumber.size} badges_upserted=${badgesUpserted} members_skipped_missing_rank=${skippedMembers.length}`
  )
  if (skippedMembers.length > 0) {
    console.warn(`skipped members (missing rank code): ${skippedMembers.join(', ')}`)
  }
}

main()
  .catch((error: unknown) => {
    console.error('import failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
