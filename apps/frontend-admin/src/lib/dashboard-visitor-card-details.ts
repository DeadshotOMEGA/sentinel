import type { PresentPerson } from '@sentinel/contracts'

export interface DashboardVisitorCardDetails {
  title: string
  subtitle?: string
  detail?: string
}

function clean(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function uniqueOrdered(values: Array<string | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const cleaned = clean(value)
    if (!cleaned) continue

    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    result.push(cleaned)
  }

  return result
}

function extractVisitReasonField(person: PresentPerson, fieldName: string): string | undefined {
  const visitReason = clean(person.visitReason)
  if (!visitReason) return undefined

  const prefix = `${fieldName}:`
  const part = visitReason
    .split('|')
    .map((segment) => segment.trim())
    .find((segment) => segment.toLowerCase().startsWith(prefix.toLowerCase()))

  if (!part) return undefined
  return clean(part.slice(prefix.length))
}

function stripDateLikeEventSuffix(value: string): string {
  return value.replace(/\s+\([^)]*\d{4}[^)]*\)\s*$/, '').trim()
}

function getVisitTypeName(person: PresentPerson): string | undefined {
  return clean(person.visitType?.name)
}

function getEventTitle(person: PresentPerson): string | undefined {
  const structuredEvent = clean(person.unitEventTitle) ?? clean(person.eventName)
  if (structuredEvent) return structuredEvent

  const fallbackEvent = extractVisitReasonField(person, 'Event')
  return fallbackEvent ? stripDateLikeEventSuffix(fallbackEvent) : undefined
}

function getEventOption(person: PresentPerson): string | undefined {
  if (!clean(person.unitEventVisitorOptionId)) return undefined

  const purposeDetails = clean(person.purposeDetails)
  if (purposeDetails && purposeDetails !== 'Event visit') return purposeDetails

  return extractVisitReasonField(person, 'Event option')
}

function getCompany(person: PresentPerson): string | undefined {
  return clean(person.organization) ?? extractVisitReasonField(person, 'Company/Organization')
}

function getWorkDescription(person: PresentPerson): string | undefined {
  const purposeDetails = clean(person.purposeDetails)
  if (getVisitTypeName(person)?.toLowerCase() === 'contractor' && purposeDetails) {
    return purposeDetails
  }

  return extractVisitReasonField(person, 'Work')
}

function getHost(person: PresentPerson): string | undefined {
  if (clean(person.hostName)) return undefined

  const hostName = extractVisitReasonField(person, 'Meeting with')
  return hostName ? `hosted by ${hostName}` : undefined
}

function getCategory(person: PresentPerson): string | undefined {
  return extractVisitReasonField(person, 'Category')
}

function getMilitaryContext(person: PresentPerson): string | undefined {
  const rankUnit = uniqueOrdered([clean(person.rank), extractVisitReasonField(person, 'Rank')])
  const unit = extractVisitReasonField(person, 'Unit')

  return uniqueOrdered([...rankUnit, unit]).join(' • ') || undefined
}

function getOtherDetails(person: PresentPerson): string[] {
  const visitReason = clean(person.visitReason)
  if (!visitReason) return []

  return visitReason
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter(
      (segment) =>
        !/^(Reason|Category|Rank|Unit|Company\/Organization|Work|Event|Event option|Meeting with):/i.test(
          segment
        )
    )
    .filter((segment) => segment.toLowerCase() !== 'other')
}

function getVisitorTitle(person: PresentPerson, displayName: string): string {
  const visitorType = getVisitTypeName(person)?.toLowerCase()
  const firstName = clean((person as { firstName?: string }).firstName)
  const lastName = clean((person as { lastName?: string }).lastName)

  if (visitorType !== 'military' && firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  return displayName
}

function getVisitorSubtitle(person: PresentPerson): string | undefined {
  return getEventTitle(person) ?? getCompany(person) ?? getMilitaryContext(person) ?? undefined
}

export function getDashboardVisitorCardDetails(
  person: PresentPerson,
  displayName: string
): DashboardVisitorCardDetails {
  const subtitle = getVisitorSubtitle(person)
  const details = uniqueOrdered([
    getEventTitle(person),
    getEventOption(person),
    getCompany(person),
    getWorkDescription(person),
    getHost(person),
    getCategory(person),
    getVisitTypeName(person),
    getMilitaryContext(person),
    ...getOtherDetails(person),
  ]).filter((detail) => detail.toLowerCase() !== subtitle?.toLowerCase())

  return {
    title: getVisitorTitle(person, displayName),
    subtitle,
    detail: details.length > 0 ? details.join(' • ') : undefined,
  }
}
