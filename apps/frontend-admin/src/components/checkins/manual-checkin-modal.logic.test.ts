import { describe, expect, it } from 'vitest'
import {
  evaluateManualCheckinEligibility,
  formatManualCheckinMemberLabel,
  type ManualCheckinMemberOption,
} from './manual-checkin-modal.logic'

function createMember(
  id: string,
  overrides: Partial<ManualCheckinMemberOption> = {}
): ManualCheckinMemberOption {
  return {
    id,
    rank: 'PO2',
    firstName: 'Jordan',
    lastName: `Member${id}`,
    displayName: null,
    serviceNumber: `10000000${id}`,
    ...overrides,
  }
}

describe('evaluateManualCheckinEligibility', () => {
  it('filters to absent members for check-in', () => {
    const members = [createMember('1'), createMember('2')]

    const result = evaluateManualCheckinEligibility({
      members,
      presentMemberIds: new Set(['1']),
      direction: 'in',
      selectedMemberId: null,
    })

    expect(result.eligibleMembers.map((member) => member.id)).toEqual(['2'])
    expect(result.selectedMemberReason).toBeNull()
  })

  it('filters to present members for check-out', () => {
    const members = [createMember('1'), createMember('2')]

    const result = evaluateManualCheckinEligibility({
      members,
      presentMemberIds: new Set(['2']),
      direction: 'out',
      selectedMemberId: null,
    })

    expect(result.eligibleMembers.map((member) => member.id)).toEqual(['2'])
  })

  it('reports when the selected member is already checked in for check-in', () => {
    const members = [createMember('1')]

    const result = evaluateManualCheckinEligibility({
      members,
      presentMemberIds: new Set(['1']),
      direction: 'in',
      selectedMemberId: '1',
    })

    expect(result.selectedMemberEligible).toBe(false)
    expect(result.selectedMemberReason).toContain('already checked in')
  })

  it('reports when the selected member is not checked in for check-out', () => {
    const members = [createMember('1')]

    const result = evaluateManualCheckinEligibility({
      members,
      presentMemberIds: new Set(),
      direction: 'out',
      selectedMemberId: '1',
    })

    expect(result.selectedMemberEligible).toBe(false)
    expect(result.selectedMemberReason).toContain('not currently checked in')
  })
})

describe('formatManualCheckinMemberLabel', () => {
  it('prefers display name and appends short service number', () => {
    expect(
      formatManualCheckinMemberLabel(
        createMember('321', {
          displayName: 'PO2 Taylor Hunt',
          serviceNumber: '1234567890',
        })
      )
    ).toBe('PO2 Taylor Hunt (890)')
  })
})
