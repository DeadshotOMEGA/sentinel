import { describe, expect, it } from 'vitest'
import { buildReasonFirstVisitSummary, buildReasonFirstVisitorPayload } from './visitor-self-signin'

describe('buildReasonFirstVisitorPayload', () => {
  it('maps recruitment reason to recruitment visit with default step', () => {
    const payload = buildReasonFirstVisitorPayload({
      kioskId: 'DASHBOARD_KIOSK',
      reason: 'recruitment',
      firstName: 'Taylor',
      lastName: 'Smith',
    })

    expect(payload.visitType).toBe('recruitment')
    expect(payload.visitPurpose).toBe('information')
    expect(payload.recruitmentStep).toBe('information')
    expect(payload.firstName).toBe('Taylor')
    expect(payload.lastName).toBe('Smith')
  })

  it('maps contract work reason to contractor payload', () => {
    const payload = buildReasonFirstVisitorPayload({
      kioskId: 'DASHBOARD_KIOSK',
      reason: 'contract_work',
      branch: 'civilian',
      firstName: 'Morgan',
      lastName: 'Lee',
      organization: 'North Yard Electrical',
      workDescription: 'Panel inspection in mechanical space',
      licensePlate: 'ABC 123',
    })

    expect(payload.visitType).toBe('contractor')
    expect(payload.visitPurpose).toBe('other')
    expect(payload.organization).toBe('North Yard Electrical')
    expect(payload.purposeDetails).toBe('Panel inspection in mechanical space')
    expect(payload.licensePlate).toBe('ABC 123')
  })

  it('maps military branch identity using initials and last name', () => {
    const payload = buildReasonFirstVisitorPayload({
      kioskId: 'DASHBOARD_KIOSK',
      reason: 'museum',
      branch: 'military',
      initials: 'J.T.',
      lastName: 'Anderson',
      rankPrefix: 'PO2',
      unit: 'HMCS Example',
    })

    expect(payload.visitType).toBe('military')
    expect(payload.firstName).toBe('J.T.')
    expect(payload.lastName).toBe('Anderson')
    expect(payload.rankPrefix).toBe('PO2')
    expect(payload.unit).toBe('HMCS Example')
  })

  it('requires member selection for meeting reason', () => {
    expect(() =>
      buildReasonFirstVisitorPayload({
        kioskId: 'DASHBOARD_KIOSK',
        reason: 'meeting',
        branch: 'civilian',
        firstName: 'Alex',
        lastName: 'Taylor',
      })
    ).toThrow('Select a member for meeting visits before continuing')
  })

  it('requires event selection for event reason', () => {
    expect(() =>
      buildReasonFirstVisitorPayload({
        kioskId: 'DASHBOARD_KIOSK',
        reason: 'event',
        branch: 'civilian',
        firstName: 'Alex',
        lastName: 'Taylor',
      })
    ).toThrow('Select an event before continuing')
  })
})

describe('buildReasonFirstVisitSummary', () => {
  it('builds a readable summary string with reason and selections', () => {
    const summary = buildReasonFirstVisitSummary({
      reason: 'meeting',
      branch: 'military',
      rankPrefix: 'Lt(N)',
      unit: 'HMCS Example',
      hostDisplayName: 'Lt(N) Patel',
    })

    expect(summary).toContain('Reason: Meeting')
    expect(summary).toContain('Category: Military')
    expect(summary).toContain('Rank: Lt(N)')
    expect(summary).toContain('Unit: HMCS Example')
    expect(summary).toContain('Meeting with: Lt(N) Patel')
  })
})
