import type { VisitorResponse } from '@sentinel/contracts'

export interface VisitorSignoutGroupSummary {
  groupId: string
  groupCode: string
  accentIndex: number
  members: VisitorResponse[]
  memberCount: number
  mostRecentCheckInTime: string
  identityTitle: string
  identityDetail: string
  contextLine: string
  searchableText: string
}

export interface VisitorSignoutGroupingResult {
  groups: VisitorSignoutGroupSummary[]
  ungroupedVisitors: VisitorResponse[]
  activeVisitorCount: number
}

export interface VisitorEventTabSummary {
  unitEventId: string
  title: string
  count: number
}

const ACCENT_BUCKET_COUNT = 6

function clean(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ')
}

function visitorDisplayName(visitor: VisitorResponse): string {
  return clean(visitor.displayName) ?? clean(visitor.name) ?? 'Visitor'
}

function extractVisitReasonField(visitor: VisitorResponse, fieldName: string): string | undefined {
  const visitReason = clean(visitor.visitReason)
  if (!visitReason) return undefined

  const prefix = `${fieldName}:`
  const part = visitReason
    .split('|')
    .map((entry) => entry.trim())
    .find((entry) => entry.toLowerCase().startsWith(prefix.toLowerCase()))

  if (!part) return undefined
  return clean(part.slice(prefix.length))
}

function stripDateLikeEventSuffix(value: string): string {
  return value.replace(/\s+\([^)]*\d{4}[^)]*\)\s*$/, '').trim()
}

function getVisitReasonLabel(visitor: VisitorResponse): string | undefined {
  return extractVisitReasonField(visitor, 'Reason')
}

function getVisitorEventTitle(visitor: VisitorResponse): string | undefined {
  const structuredTitle = clean(visitor.unitEventTitle) ?? clean(visitor.eventName)
  if (structuredTitle) return structuredTitle

  const fallbackTitle = extractVisitReasonField(visitor, 'Event')
  return fallbackTitle ? stripDateLikeEventSuffix(fallbackTitle) : undefined
}

function getMilitaryContext(visitor: VisitorResponse): string | undefined {
  if (visitor.visitType !== 'military') return undefined

  return [clean(visitor.rankPrefix), clean(visitor.unit)].filter(Boolean).join(' • ') || undefined
}

export function getPublicVisitorContextLine(visitor: VisitorResponse): string | undefined {
  const eventTitle = getVisitorEventTitle(visitor)
  if (eventTitle) return eventTitle

  if (visitor.visitType === 'contractor') {
    return clean(visitor.organization)
  }

  if (visitor.visitType === 'recruitment') {
    return 'Recruitment'
  }

  const reasonLabel = getVisitReasonLabel(visitor)
  if (reasonLabel === 'Museum') return 'Museum'

  return getMilitaryContext(visitor)
}

export function getPublicVisitorTitle(visitor: VisitorResponse): string {
  if (visitor.visitType === 'contractor') {
    return clean(visitor.organization) ?? visitorDisplayName(visitor)
  }

  return visitorDisplayName(visitor)
}

export function buildVisitorEventTabs(activeVisitors: VisitorResponse[]): VisitorEventTabSummary[] {
  const tabMap = new Map<string, VisitorEventTabSummary>()

  for (const visitor of activeVisitors) {
    const unitEventId = clean(visitor.unitEventId)
    if (!unitEventId) continue

    const existing = tabMap.get(unitEventId)
    if (existing) {
      existing.count += 1
      continue
    }

    tabMap.set(unitEventId, {
      unitEventId,
      title: getVisitorEventTitle(visitor) ?? 'Event',
      count: 1,
    })
  }

  return Array.from(tabMap.values()).sort((left, right) =>
    left.title.localeCompare(right.title, 'en-CA')
  )
}

function extractFallbackSurname(visitor: VisitorResponse): string | undefined {
  const direct = clean(visitor.lastName)
  if (direct) return direct

  const display = clean(visitor.displayName) ?? clean(visitor.name)
  if (!display) return undefined

  if (display.includes(',')) {
    const [beforeComma] = display.split(',')
    return clean(beforeComma)
  }

  const parts = display.split(/\s+/).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] : undefined
}

function mostCommonValue(values: string[]): string | undefined {
  if (values.length === 0) return undefined

  const counts = new Map<string, { count: number; firstIndex: number; sample: string }>()
  values.forEach((value, index) => {
    const key = value.toLowerCase()
    const entry = counts.get(key)
    if (entry) {
      entry.count += 1
      return
    }
    counts.set(key, { count: 1, firstIndex: index, sample: value })
  })

  const winner = Array.from(counts.values()).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count
    return left.firstIndex - right.firstIndex
  })[0]

  return winner?.sample
}

function buildIdentity(members: VisitorResponse[]): {
  identityTitle: string
  identityDetail: string
  contextLine: string
} {
  const memberCount = members.length
  const allContractors = members.every((member) => member.visitType === 'contractor')
  const companyNames = members
    .map((member) => clean(member.organization))
    .filter(Boolean) as string[]
  const dominantCompany = mostCommonValue(companyNames)

  if (allContractors && dominantCompany) {
    return {
      identityTitle: dominantCompany,
      identityDetail: `${memberCount} contractor${memberCount === 1 ? '' : 's'}`,
      contextLine: '',
    }
  }

  const publicContexts = members
    .map((member) => getPublicVisitorContextLine(member))
    .filter(Boolean) as string[]
  const dominantPublicContext = mostCommonValue(publicContexts)

  const surnames = members
    .map((member) => extractFallbackSurname(member))
    .filter(Boolean) as string[]
  if (surnames.length === memberCount) {
    const normalizedSurnames = new Set(surnames.map((surname) => surname.toLowerCase()))
    if (normalizedSurnames.size === 1) {
      const surname = titleCase(surnames[0] ?? 'Visitor')
      return {
        identityTitle: `${surname} group`,
        identityDetail: `${memberCount} visitor${memberCount === 1 ? '' : 's'}`,
        contextLine: dominantPublicContext ?? '',
      }
    }
  }

  const namePool = Array.from(
    new Set(
      members
        .map((member) => extractFallbackSurname(member) ?? visitorDisplayName(member))
        .filter(Boolean)
        .map((entry) => titleCase(entry))
    )
  )
  const shownNames = namePool.slice(0, 2)
  const overflow = Math.max(namePool.length - shownNames.length, 0)
  const title =
    shownNames.length > 0
      ? `${shownNames.join(' • ')}${overflow > 0 ? ` +${overflow} more` : ''}`
      : `${memberCount} visitors`

  const context = dominantCompany ?? dominantPublicContext ?? clean(members[0]?.organization) ?? ''

  return {
    identityTitle: title,
    identityDetail: `${memberCount} visitor${memberCount === 1 ? '' : 's'}`,
    contextLine: context,
  }
}

function hashToAccentIndex(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash % ACCENT_BUCKET_COUNT
}

function buildSearchText(group: VisitorSignoutGroupSummary): string {
  const memberTerms = group.members
    .map((member) =>
      [
        visitorDisplayName(member),
        clean(member.firstName),
        clean(member.lastName),
        clean(member.organization),
        getPublicVisitorContextLine(member),
      ]
        .filter(Boolean)
        .join(' ')
    )
    .join(' ')

  return [
    group.groupCode,
    group.identityTitle,
    group.identityDetail,
    group.contextLine,
    memberTerms,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function buildVisitorSignoutGrouping(
  activeVisitors: VisitorResponse[]
): VisitorSignoutGroupingResult {
  const groupedMap = new Map<string, VisitorResponse[]>()
  const ungroupedVisitors: VisitorResponse[] = []

  for (const visitor of activeVisitors) {
    if (!visitor.visitorGroupId) {
      ungroupedVisitors.push(visitor)
      continue
    }

    const existing = groupedMap.get(visitor.visitorGroupId)
    if (existing) {
      existing.push(visitor)
    } else {
      groupedMap.set(visitor.visitorGroupId, [visitor])
    }
  }

  const groupsWithoutCodes = Array.from(groupedMap.entries())
    .map(([groupId, members]) => {
      const sortedMembers = [...members].sort((left, right) =>
        left.checkInTime.localeCompare(right.checkInTime)
      )
      const mostRecentCheckInTime = sortedMembers[sortedMembers.length - 1]?.checkInTime ?? ''
      const identity = buildIdentity(sortedMembers)
      const accentIndex = hashToAccentIndex(groupId)

      return {
        groupId,
        groupCode: '',
        accentIndex,
        members: sortedMembers,
        memberCount: sortedMembers.length,
        mostRecentCheckInTime,
        identityTitle: identity.identityTitle,
        identityDetail: identity.identityDetail,
        contextLine: identity.contextLine,
        searchableText: '',
      }
    })
    .sort((left, right) => right.mostRecentCheckInTime.localeCompare(left.mostRecentCheckInTime))

  const groups = groupsWithoutCodes.map((group, index) => {
    const groupCode = `G-${String(index + 1).padStart(2, '0')}`
    const finalized: VisitorSignoutGroupSummary = {
      ...group,
      groupCode,
      searchableText: '',
    }
    return {
      ...finalized,
      searchableText: buildSearchText(finalized),
    }
  })

  const sortedUngrouped = [...ungroupedVisitors].sort((left, right) =>
    right.checkInTime.localeCompare(left.checkInTime)
  )

  return {
    groups,
    ungroupedVisitors: sortedUngrouped,
    activeVisitorCount: activeVisitors.length,
  }
}

export function filterVisitorSignoutGroups(
  grouping: VisitorSignoutGroupingResult,
  query: string
): VisitorSignoutGroupingResult {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return grouping

  const groups = grouping.groups.filter((group) => group.searchableText.includes(normalizedQuery))
  const ungroupedVisitors = grouping.ungroupedVisitors.filter((visitor) => {
    const haystack = [
      visitorDisplayName(visitor),
      clean(visitor.firstName),
      clean(visitor.lastName),
      clean(visitor.organization),
      getPublicVisitorContextLine(visitor),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })

  return {
    groups,
    ungroupedVisitors,
    activeVisitorCount:
      groups.reduce((sum, group) => sum + group.memberCount, 0) + ungroupedVisitors.length,
  }
}
