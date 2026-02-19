interface NameParts {
  name: string
  displayName?: string
  rank?: string
  compact?: boolean
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripLeadingRank(value: string, rank?: string): string {
  if (!rank) return value
  const normalizedRank = normalizeWhitespace(rank)
  if (!normalizedRank) return value

  const prefixPattern = new RegExp(`^(?:${escapeRegex(normalizedRank)}\\s+)+`, 'i')
  return value.replace(prefixPattern, '').trim()
}

function toInitialsSuffix(value: string): string {
  const parts = value.split(' ').filter(Boolean)
  if (parts.length <= 2) return value

  const [lastName, ...givenNames] = parts
  const initials = givenNames
    .map((part) => part.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase())
    .filter(Boolean)

  if (initials.length === 0) return value
  return `${lastName}, ${initials.map((i) => `${i}.`).join('')}`
}

function inferRankToken(value: string): string | undefined {
  const parts = value.split(' ').filter(Boolean)
  if (parts.length < 3) return undefined

  const first = parts[0]
  // Covers common military-style prefixes like MS, SLt, PO2, S1, CPO2.
  if (/^[A-Za-z0-9]{1,4}$/.test(first) && /[A-Z]/.test(first)) {
    return first
  }

  return undefined
}

/**
 * Builds a clean label for list/card display:
 * - prefers backend displayName when available
 * - avoids duplicated rank prefixes (e.g. "MS MS ...")
 * - can compact long rank+name formats to "Rank Last, F.M."
 */
export function formatPersonLabel({ name, displayName, rank, compact = false }: NameParts): string {
  const preferred = normalizeWhitespace(displayName && displayName.trim() ? displayName : name)
  const rankValue = normalizeWhitespace(rank ?? '') || (compact ? inferRankToken(preferred) ?? '' : '')
  const withoutRank = stripLeadingRank(preferred, rankValue)
  const compacted = compact ? toInitialsSuffix(withoutRank) : withoutRank

  if (!rankValue) return compacted
  return normalizeWhitespace(`${rankValue} ${compacted}`)
}
