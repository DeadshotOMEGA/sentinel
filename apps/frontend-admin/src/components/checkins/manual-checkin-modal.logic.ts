export type ManualCheckinDirection = 'in' | 'out'

export interface ManualCheckinMemberOption {
  id: string
  rank: string
  displayName?: string | null
  firstName: string
  lastName: string
  serviceNumber: string
}

export interface ManualCheckinEligibilityResult {
  eligibleMembers: ManualCheckinMemberOption[]
  selectedMemberEligible: boolean
  selectedMemberReason: string | null
}

export interface ManualCheckinTimestampResolution {
  isoTimestamp?: string
  error: string | null
}

function getFormattedName(member: ManualCheckinMemberOption): string {
  return (
    member.displayName?.trim() || `${member.rank} ${member.lastName}, ${member.firstName}`.trim()
  )
}

export function formatManualCheckinMemberLabel(member: ManualCheckinMemberOption): string {
  return `${getFormattedName(member)} (${member.serviceNumber.slice(-3)})`
}

export function resolveManualCheckinTimestamp(value: string): ManualCheckinTimestampResolution {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    return {
      isoTimestamp: undefined,
      error: null,
    }
  }

  const parsedTimestamp = new Date(trimmedValue)

  if (Number.isNaN(parsedTimestamp.getTime())) {
    return {
      isoTimestamp: undefined,
      error: 'Enter a valid date and time or leave it blank.',
    }
  }

  return {
    isoTimestamp: parsedTimestamp.toISOString(),
    error: null,
  }
}

export function evaluateManualCheckinEligibility({
  members,
  presentMemberIds,
  direction,
  selectedMemberId,
  selectedMember,
}: {
  members: ManualCheckinMemberOption[]
  presentMemberIds: Set<string>
  direction: ManualCheckinDirection
  selectedMemberId: string | null
  selectedMember?: ManualCheckinMemberOption | null
}): ManualCheckinEligibilityResult {
  const eligibleMembers = members.filter((member) => {
    const isPresent = presentMemberIds.has(member.id)
    return direction === 'in' ? !isPresent : isPresent
  })

  if (!selectedMemberId) {
    return {
      eligibleMembers,
      selectedMemberEligible: false,
      selectedMemberReason: null,
    }
  }

  const resolvedSelectedMember =
    members.find((member) => member.id === selectedMemberId) ??
    (selectedMember?.id === selectedMemberId ? selectedMember : undefined)

  if (!resolvedSelectedMember) {
    return {
      eligibleMembers,
      selectedMemberEligible: false,
      selectedMemberReason: 'Selected member is no longer available.',
    }
  }

  const isPresent = presentMemberIds.has(resolvedSelectedMember.id)

  if (direction === 'in' && isPresent) {
    return {
      eligibleMembers,
      selectedMemberEligible: false,
      selectedMemberReason: `${getFormattedName(resolvedSelectedMember)} is already checked in.`,
    }
  }

  if (direction === 'out' && !isPresent) {
    return {
      eligibleMembers,
      selectedMemberEligible: false,
      selectedMemberReason: `${getFormattedName(resolvedSelectedMember)} is not currently checked in.`,
    }
  }

  return {
    eligibleMembers,
    selectedMemberEligible: true,
    selectedMemberReason: null,
  }
}
