#!/usr/bin/env tsx
import 'dotenv/config'
import { writeFile } from 'node:fs/promises'
import { prisma } from '@sentinel/database'
import {
  SENTINEL_BOOTSTRAP_BADGE_SERIAL,
  SENTINEL_BOOTSTRAP_SERVICE_NUMBER,
} from '../src/lib/system-bootstrap.js'

interface ExportMember {
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

interface ExportBadge {
  serialNumber: string
  assignmentType: string
  status: string
  assignedServiceNumber: string | null
}

interface ExportPayload {
  exportedAt: string
  source: string
  members: ExportMember[]
  badges: ExportBadge[]
}

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

async function main() {
  const outputPath = getArgValue('--output') ?? './members-badges-export.json'

  try {
    const members = await prisma.member.findMany({
      where: {
        serviceNumber: { not: SENTINEL_BOOTSTRAP_SERVICE_NUMBER },
      },
      include: {
        division: {
          select: {
            code: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const memberIdToServiceNumber = new Map(
      members.map((member) => [member.id, member.serviceNumber])
    )

    const badges = await prisma.badge.findMany({
      where: {
        serialNumber: { not: SENTINEL_BOOTSTRAP_BADGE_SERIAL },
      },
      orderBy: [{ serialNumber: 'asc' }],
    })

    const payload: ExportPayload = {
      exportedAt: new Date().toISOString(),
      source: 'sentinel-backend',
      members: members.map((member) => ({
        serviceNumber: member.serviceNumber,
        employeeNumber: member.employeeNumber ?? null,
        firstName: member.firstName,
        lastName: member.lastName,
        displayName: member.displayName ?? null,
        initials: member.initials ?? null,
        rank: member.rank,
        divisionCode: member.division?.code ?? null,
        mess: member.mess ?? null,
        moc: member.moc ?? null,
        memberType: member.memberType,
        status: member.status,
        classDetails: member.classDetails ?? null,
        notes: member.notes ?? null,
        contractStart: member.contract_start ? member.contract_start.toISOString() : null,
        contractEnd: member.contract_end ? member.contract_end.toISOString() : null,
        email: member.email ?? null,
        homePhone: member.homePhone ?? null,
        mobilePhone: member.mobilePhone ?? null,
        accountLevel: member.accountLevel,
      })),
      badges: badges.map((badge) => ({
        serialNumber: badge.serialNumber,
        assignmentType: badge.assignmentType,
        status: badge.status,
        assignedServiceNumber: badge.assignedToId
          ? (memberIdToServiceNumber.get(badge.assignedToId) ?? null)
          : null,
      })),
    }

    await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8')

    console.log(
      `export complete: members=${payload.members.length} badges=${payload.badges.length} output=${outputPath}`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('export failed:', error)
  process.exit(1)
})
