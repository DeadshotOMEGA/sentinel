import bcrypt from 'bcryptjs'
import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

const BCRYPT_COST = 12
const TEMPORARY_PIN = '1111'

/**
 * Provisions member login credentials after badge assignment.
 * Idempotent by design: existing PIN hashes are never overwritten.
 */
export class MemberAuthProvisioningService {
  private prisma: PrismaClientInstance

  constructor(prismaClient: PrismaClientInstance = defaultPrisma) {
    this.prisma = prismaClient
  }

  async provisionForBadgeAssignment(memberId: string): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        pinHash: true,
      },
    })

    if (!member) {
      throw new Error(`Member with ID '${memberId}' not found`)
    }

    // Existing PIN remains authoritative; do not reset.
    if (member.pinHash) {
      return
    }

    const pinHash = await bcrypt.hash(TEMPORARY_PIN, BCRYPT_COST)
    await this.prisma.member.update({
      where: { id: memberId },
      data: {
        pinHash,
        mustChangePin: true,
      },
    })
  }
}
