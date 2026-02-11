import { prisma } from '@sentinel/database'

async function main() {
  const rank = await prisma.rank.findFirst({ where: { code: 'Civ' } })
    ?? await prisma.rank.findFirst()
  if (!rank) throw new Error('No ranks found')
  console.log('Rank:', rank.code, rank.id)

  const existing = await prisma.member.findFirst({ where: { serviceNumber: 'CLAUDE-E2E' } })
  if (existing) {
    console.log('Already exists:', existing.id)
    // Ensure status is active for login
    await prisma.member.update({ where: { id: existing.id }, data: { status: 'active' } })
    await prisma.$disconnect()
    return
  }

  const badge = await prisma.badge.create({
    data: {
      serialNumber: 'CLAUDE-E2E-BADGE',
      assignmentType: 'permanent',
      status: 'active',
    }
  })

  const member = await prisma.member.create({
    data: {
      serviceNumber: 'CLAUDE-E2E',
      rankId: rank.id,
      rank: rank.code ?? 'Civ',
      firstName: 'Claude',
      lastName: 'E2E',
      memberType: 'system',
      status: 'active',
      accountLevel: 6,
      badgeId: badge.id,
      pinHash: '$2b$12$hEikq71eUVjfjAoTDfAta.39drWK8zvwAyRZq1cIHQYuLg2z1Wqc2',
    }
  })

  console.log('Created member:', member.id)
  console.log('Badge serial: CLAUDE-E2E-BADGE, PIN: 9999')
  await prisma.$disconnect()
}
main()
