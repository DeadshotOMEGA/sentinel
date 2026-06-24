import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { isSentinelBootstrapServiceNumber } from '../lib/system-bootstrap.js'

/**
 * Keeps protected bootstrap access metadata current after badge assignment.
 * Regular member login now uses Service Number or active assigned badge only.
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
        serviceNumber: true,
      },
    })

    if (!member) {
      throw new Error(`Member with ID '${memberId}' not found`)
    }

    if (isSentinelBootstrapServiceNumber(member.serviceNumber)) {
      await this.prisma.member.update({
        where: { id: member.id },
        data: {
          status: 'active',
          accountLevel: 10,
        },
      })
    }
  }
}
