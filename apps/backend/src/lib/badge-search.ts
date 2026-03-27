import type { BadgeWithDetails } from '@sentinel/types'

type BadgeSearchMember = NonNullable<BadgeWithDetails['assignedMember']>

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase()
}

function getMemberSearchTerms(member: BadgeSearchMember): string[] {
  const firstName = member.firstName.trim()
  const lastName = member.lastName.trim()
  const rank = member.rank?.trim() ?? ''
  const initials = member.initials?.trim() ?? ''
  const displayName = member.displayName?.trim() ?? ''
  const serviceNumber = member.serviceNumber?.trim() ?? ''

  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const rankedName = [rank, firstName, lastName].filter(Boolean).join(' ')
  const reverseName = [lastName, firstName].filter(Boolean).join(', ')
  const reverseNameWithInitials = [lastName, [firstName, initials].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')

  return [
    displayName,
    serviceNumber,
    fullName,
    rankedName,
    reverseName,
    reverseNameWithInitials,
    firstName,
    lastName,
  ].filter(Boolean)
}

export function formatAssignedMemberName(member: BadgeSearchMember): string {
  return (
    member.displayName?.trim() ||
    [member.rank, member.firstName, member.lastName].filter(Boolean).join(' ')
  )
}

export function matchesBadgeSearch(badge: BadgeWithDetails, search: string): boolean {
  const normalizedSearch = normalizeSearchValue(search)
  if (!normalizedSearch) {
    return true
  }

  const searchTerms = [badge.serialNumber]

  if (badge.assignedMember) {
    searchTerms.push(...getMemberSearchTerms(badge.assignedMember))
  }

  return searchTerms.some((term) => normalizeSearchValue(term).includes(normalizedSearch))
}
