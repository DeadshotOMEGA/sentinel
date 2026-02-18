import { prisma } from '@sentinel/database'

function mondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const delta = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + delta)
  return d
}

async function ensureBadge(serialNumber: string, opts: {
  assignmentType: string
  assignedToId?: string | null
  status: string
}) {
  const existing = await prisma.badge.findUnique({ where: { serialNumber } })
  if (existing) {
    return prisma.badge.update({
      where: { id: existing.id },
      data: {
        assignmentType: opts.assignmentType,
        assignedToId: opts.assignedToId ?? null,
        status: opts.status,
      },
    })
  }
  return prisma.badge.create({
    data: {
      serialNumber,
      assignmentType: opts.assignmentType,
      assignedToId: opts.assignedToId ?? null,
      status: opts.status,
    },
  })
}

async function main() {
  const claude = await prisma.member.findFirst({ where: { serviceNumber: 'CLAUDE-E2E' } })
  if (!claude) throw new Error('CLAUDE-E2E member not found. Seed first.')

  const claudeBadge = await ensureBadge('CLAUDE-E2E-BADGE', {
    assignmentType: 'member',
    assignedToId: claude.id,
    status: 'active',
  })

  await prisma.member.update({
    where: { id: claude.id },
    data: {
      badgeId: claudeBadge.id,
      status: 'active',
      accountLevel: 6,
    },
  })

  await ensureBadge('VIS-UNASSIGNED-BADGE', {
    assignmentType: 'unassigned',
    assignedToId: null,
    status: 'active',
  })

  await ensureBadge('VIS-INACTIVE-BADGE', {
    assignmentType: 'member',
    assignedToId: claude.id,
    status: 'inactive',
  })

  await ensureBadge('VIS-LOST-BADGE', {
    assignmentType: 'member',
    assignedToId: claude.id,
    status: 'lost',
  })

  // Long-name member for overflow/responsive visual checks
  const longServiceNumber = 'VIS-LONGNAME'
  const longBadgeSerial = 'VIS-LONGNAME-BADGE'
  let longMember = await prisma.member.findFirst({
    where: { serviceNumber: longServiceNumber },
  })

  if (!longMember) {
    const rank = (await prisma.rank.findFirst({ where: { code: 'S3' } })) ?? (await prisma.rank.findFirst())
    if (!rank) throw new Error('No rank available for long-name fixture')
    longMember = await prisma.member.create({
      data: {
        serviceNumber: longServiceNumber,
        rankId: rank.id,
        rank: rank.code ?? 'S3',
        firstName: 'Alexanderthegreat-Jonathan-Montgomery',
        lastName: 'VanDerWaal-Supercalifragilistic-Longlastname',
        memberType: 'system',
        status: 'active',
        accountLevel: 1,
      },
    })
  }

  const longBadge = await ensureBadge(longBadgeSerial, {
    assignmentType: 'member',
    assignedToId: longMember.id,
    status: 'active',
  })

  await prisma.member.update({
    where: { id: longMember.id },
    data: {
      badgeId: longBadge.id,
      status: 'active',
    },
  })

  // Find a member assigned to future duty watch if available
  const currentWeek = mondayOf(new Date())

  const futureDutyAssignment = await prisma.scheduleAssignment.findFirst({
    where: {
      status: { not: 'released' },
      schedule: {
        dutyRole: { code: 'DUTY_WATCH' },
        weekStartDate: { gt: currentWeek },
      },
      member: {
        badgeId: { not: null },
      },
    },
    include: {
      member: {
        include: {
          badge: true,
        },
      },
      schedule: true,
    },
    orderBy: {
      schedule: {
        weekStartDate: 'asc',
      },
    },
  })

  const out = {
    claudeBadge: 'CLAUDE-E2E-BADGE',
    unknownBadge: 'VIS-UNKNOWN-BADGE',
    unassignedBadge: 'VIS-UNASSIGNED-BADGE',
    inactiveBadge: 'VIS-INACTIVE-BADGE',
    lostBadge: 'VIS-LOST-BADGE',
    longNameBadge: longBadgeSerial,
    futureDutyWatchBadge: futureDutyAssignment?.member.badge?.serialNumber ?? null,
    futureDutyWatchMember: futureDutyAssignment
      ? `${futureDutyAssignment.member.rank} ${futureDutyAssignment.member.firstName} ${futureDutyAssignment.member.lastName}`
      : null,
    futureDutyWatchWeek: futureDutyAssignment?.schedule.weekStartDate ?? null,
  }

  console.log(JSON.stringify(out, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
