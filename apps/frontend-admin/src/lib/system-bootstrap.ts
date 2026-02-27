export const SENTINEL_BOOTSTRAP_BADGE_SERIAL = '0000000000'
export const SENTINEL_BOOTSTRAP_SERVICE_NUMBER = 'SENTINEL-SYSTEM'

export function isSentinelBootstrapServiceNumber(
  serviceNumber: string | null | undefined
): boolean {
  return serviceNumber === SENTINEL_BOOTSTRAP_SERVICE_NUMBER
}
