import { describe, expect, it } from 'vitest'
import { resolveVisitReason } from './visitor-intake.js'

describe('resolveVisitReason', () => {
  it('preserves an explicit visit reason when provided', () => {
    expect(
      resolveVisitReason({
        visitReason: 'Meeting with the Executive Officer',
        visitType: 'guest',
      })
    ).toBe('Meeting with the Executive Officer')
  })

  it('builds a readable fallback summary for recruitment visitors', () => {
    expect(
      resolveVisitReason({
        visitType: 'recruitment',
        recruitmentStep: 'testing',
        visitPurpose: 'appointment',
        purposeDetails: 'Testing appointment at 1900',
      })
    ).toBe('Recruitment testing | Appointment at the Unit | Testing appointment at 1900')
  })

  it('builds a readable fallback summary for military visitors', () => {
    expect(
      resolveVisitReason({
        visitType: 'military',
        unit: 'HMCS Example',
        visitPurpose: 'member_invited',
      })
    ).toBe('Military visitor from HMCS Example | Invited by a member')
  })
})
