/**
 * Client-side merge logic for DW night overrides.
 * Computes effective roster count for a given night.
 */

interface NightOverride {
  nightDate: string
  overrideType: 'replace' | 'add' | 'remove'
  baseMemberId: string | null
  memberId: string | null
}

interface Assignment {
  id: string
  memberId: string
  dutyPosition?: { id: string; code: string; name: string } | null
  [key: string]: unknown
}

/**
 * Compute the effective count and override status for a specific night.
 *
 * - `remove` overrides subtract one slot (base member removed)
 * - `replace` overrides keep count unchanged (slot still filled by replacement)
 * - `add` overrides add one slot (extra member for the night)
 */
export function computeEffectiveCount(
  baseAssignments: Assignment[],
  nightOverrides: NightOverride[],
  nightDate: string
): { activeCount: number; hasOverrides: boolean } {
  const overridesForNight = nightOverrides.filter((o) => o.nightDate === nightDate)
  const hasOverrides = overridesForNight.length > 0

  let count = baseAssignments.length

  for (const override of overridesForNight) {
    switch (override.overrideType) {
      case 'remove':
        count -= 1
        break
      case 'add':
        count += 1
        break
      case 'replace':
        // Count stays the same — one out, one in
        break
    }
  }

  return { activeCount: Math.max(0, count), hasOverrides }
}
