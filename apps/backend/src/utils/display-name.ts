const KNOWN_PREFIXES = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'cpl',
  'sgt',
  'wo',
  'mwo',
  'cwo',
  'lt',
  'capt',
  'maj',
  'lcol',
  'col',
])

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeNamePart(value?: string | null): string {
  if (!value) return ''
  return normalizeWhitespace(value)
}

function cleanPrefixToken(token: string): string {
  return token.trim().replace(/\.+$/, '').toLowerCase()
}

export function splitLegacyVisitorName(name: string): {
  rankPrefix?: string
  firstName?: string
  lastName?: string
} {
  const normalized = normalizeNamePart(name)
  if (!normalized) return {}

  const parts = normalized.split(' ')
  if (parts.length === 1) {
    return { lastName: parts[0] }
  }

  const maybePrefix = parts.at(0) ?? ''
  const cleanedPrefix = cleanPrefixToken(maybePrefix)

  if (KNOWN_PREFIXES.has(cleanedPrefix) && parts.length >= 3) {
    return {
      rankPrefix: maybePrefix,
      firstName: parts[1],
      lastName: parts.slice(2).join(' '),
    }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

function firstInitial(value?: string | null): string {
  const normalized = normalizeNamePart(value)
  return normalized ? normalized.charAt(0).toUpperCase() : ''
}

export function getMemberInitials(firstName?: string | null, initials?: string | null): string {
  const normalizedInitials = normalizeNamePart(initials)
  if (normalizedInitials) return normalizedInitials
  return firstInitial(firstName)
}

export function getVisitorInitials(firstName?: string | null): string {
  return firstInitial(firstName)
}

export function computeCollisionKey(lastName?: string | null, initials?: string | null): string {
  const ln = normalizeNamePart(lastName).toLowerCase()
  const init = normalizeNamePart(initials).toLowerCase()
  if (!ln || !init) return ''
  return `${ln}|${init}`
}

export function buildMemberDisplayName(input: {
  rank?: string | null
  firstName?: string | null
  lastName?: string | null
  initials?: string | null
  useLongForm?: boolean
  fallback?: string
}): string {
  const rank = normalizeNamePart(input.rank)
  const firstName = normalizeNamePart(input.firstName)
  const lastName = normalizeNamePart(input.lastName)
  const initials = getMemberInitials(firstName, input.initials)

  if (!lastName) {
    return input.fallback ?? ''
  }

  const prefix = rank ? `${rank} ` : ''

  if (input.useLongForm && firstName) {
    return `${prefix}${lastName}, ${firstName}`
  }

  if (initials) {
    return `${prefix}${lastName}, ${initials}`
  }

  return `${prefix}${lastName}`
}

export function buildVisitorDisplayName(input: {
  rankPrefix?: string | null
  firstName?: string | null
  lastName?: string | null
  legacyName?: string | null
  useLongForm?: boolean
}): string {
  const rankPrefix = normalizeNamePart(input.rankPrefix)
  const firstName = normalizeNamePart(input.firstName)
  const lastName = normalizeNamePart(input.lastName)
  const initials = getVisitorInitials(firstName)

  if (!lastName) {
    return normalizeNamePart(input.legacyName)
  }

  const prefix = rankPrefix ? `${rankPrefix} ` : ''

  if (input.useLongForm && firstName) {
    return `${prefix}${lastName}, ${firstName}`
  }

  if (initials) {
    return `${prefix}${lastName}, ${initials}`
  }

  return `${prefix}${lastName}`
}

export function buildLegacyVisitorName(input: {
  rankPrefix?: string | null
  firstName?: string | null
  lastName?: string | null
  legacyName?: string | null
}): string {
  const rankPrefix = normalizeNamePart(input.rankPrefix)
  const firstName = normalizeNamePart(input.firstName)
  const lastName = normalizeNamePart(input.lastName)

  const combined = [rankPrefix, firstName, lastName].filter(Boolean).join(' ')
  if (combined) return combined
  return normalizeNamePart(input.legacyName)
}
