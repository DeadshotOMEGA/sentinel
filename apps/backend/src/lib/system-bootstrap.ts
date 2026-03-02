import type { PrismaClientInstance } from '@sentinel/database'

export const SENTINEL_BOOTSTRAP_SETTING_KEY = 'system.sentinel.bootstrap'
export const SENTINEL_BOOTSTRAP_BADGE_SERIAL = '0000000000'
export const SENTINEL_BOOTSTRAP_DEFAULT_PIN = '0000'
export const SENTINEL_BOOTSTRAP_SERVICE_NUMBER = 'SENTINEL-SYSTEM'
export const SENTINEL_BOOTSTRAP_RANK_CODE = 'SENTINEL'
export const SENTINEL_BOOTSTRAP_DIVISION_CODE = 'SYS'
export const SENTINEL_BOOTSTRAP_DIVISION_NAME = 'System'

export interface SentinelBootstrapIdentity {
  memberId: string
  badgeId: string
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseSentinelBootstrapIdentity(value: unknown): SentinelBootstrapIdentity | null {
  if (!isObjectRecord(value)) {
    return null
  }

  const memberId = value.memberId
  const badgeId = value.badgeId

  if (typeof memberId !== 'string' || memberId.length === 0) {
    return null
  }
  if (typeof badgeId !== 'string' || badgeId.length === 0) {
    return null
  }

  return { memberId, badgeId }
}

export async function getSentinelBootstrapIdentity(
  prisma: PrismaClientInstance
): Promise<SentinelBootstrapIdentity | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: SENTINEL_BOOTSTRAP_SETTING_KEY },
    select: { value: true },
  })

  if (!setting) {
    return null
  }

  return parseSentinelBootstrapIdentity(setting.value)
}

export function isSentinelBootstrapServiceNumber(
  serviceNumber: string | null | undefined
): boolean {
  return serviceNumber === SENTINEL_BOOTSTRAP_SERVICE_NUMBER
}
