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

function getFormattedName(member: ManualCheckinMemberOption): string {
  return (
    member.displayName?.trim() || `${member.rank} ${member.lastName}, ${member.firstName}`.trim()
  )
}

export function formatManualCheckinMemberLabel(member: ManualCheckinMemberOption): string {
  return `${getFormattedName(member)} (${member.serviceNumber.slice(-3)})`
}

export function evaluateManualCheckinEligibility({
  members,
  presentMemberIds,
  direction,
  selectedMemberId,
}: {
  members: ManualCheckinMemberOption[]
  presentMemberIds: Set<string>
  direction: ManualCheckinDirection
  selectedMemberId: string | null
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

  const selectedMember = members.find((member) => member.id === selectedMemberId)

  if (!selectedMember) {
    return {
      eligibleMembers,
      selectedMemberEligible: false,
      selectedMemberReason: 'Selected member is no longer available.',
    }
  }

  const isPresent = presentMemberIds.has(selectedMember.id)

  if (direction === 'in' && isPresent) {
    return {
      eligibleMembers,
      selectedMemberEligible: false,
      selectedMemberReason: `${getFormattedName(selectedMember)} is already checked in.`,
    }
  }

  if (direction === 'out' && !isPresent) {
    return {
      eligibleMembers,
      selectedMemberEligible: false,
      selectedMemberReason: `${getFormattedName(selectedMember)} is not currently checked in.`,
    }
  }

  return {
    eligibleMembers,
    selectedMemberEligible: true,
    selectedMemberReason: null,
  }
}
