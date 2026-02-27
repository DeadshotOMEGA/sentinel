#!/usr/bin/env tsx
import 'dotenv/config'
import { prisma } from '@sentinel/database'
import { SentinelBootstrapIntegrityService } from '../src/services/sentinel-bootstrap-integrity-service.js'

async function main() {
  const service = new SentinelBootstrapIntegrityService(prisma)

  try {
    const identity = await service.ensureIntegrity({
      ensureDeleteProtectionTriggers: true,
    })
    console.log(
      `bootstrap complete: memberId=${identity.memberId} badgeId=${identity.badgeId} serial=${identity.badgeSerial}`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('bootstrap failed:', error)
  process.exit(1)
})
