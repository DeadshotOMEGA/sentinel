import { describe, expect, it } from 'vitest'
import {
  evaluateManualCheckinEligibility,
  formatManualCheckinMemberLabel,
  type ManualCheckinMemberOption,
  resolveManualCheckinTimestamp,
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

  it('keeps the selected member eligible when they are no longer in the current member page', () => {
    const members = [createMember('1')]
    const selectedMember = createMember('999')

    const result = evaluateManualCheckinEligibility({
      members,
      presentMemberIds: new Set(),
      direction: 'in',
      selectedMemberId: '999',
      selectedMember,
    })

    expect(result.selectedMemberEligible).toBe(true)
    expect(result.selectedMemberReason).toBeNull()
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

describe('resolveManualCheckinTimestamp', () => {
  it('omits the timestamp when the field is blank', () => {
    expect(resolveManualCheckinTimestamp('')).toEqual({
      isoTimestamp: undefined,
      error: null,
    })
  })

  it('converts a local datetime value to ISO', () => {
    const value = '2026-04-21T19:45'

    expect(resolveManualCheckinTimestamp(value)).toEqual({
      isoTimestamp: new Date(value).toISOString(),
      error: null,
    })
  })

  it('reports invalid datetime input', () => {
    expect(resolveManualCheckinTimestamp('not-a-date')).toEqual({
      isoTimestamp: undefined,
      error: 'Enter a valid date and time or leave it blank.',
    })
  })
})
