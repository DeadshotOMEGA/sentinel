import { describe, expect, it } from 'vitest'
import {
  buildReasonFirstVisitSummary,
  buildReasonFirstVisitorGroupPayload,
  buildReasonFirstVisitorPayload,
  resolveVisitorSelfSigninSubmissionMode,
  SINGLE_VISITOR_MULTIPLE_VEHICLES_MESSAGE,
} from './visitor-self-signin'

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

  it('sends selected unit events through unitEventId', () => {
    const payload = buildReasonFirstVisitorPayload({
      kioskId: 'DASHBOARD_KIOSK',
      reason: 'event',
      branch: 'civilian',
      firstName: 'Alex',
      lastName: 'Taylor',
      eventId: '11111111-1111-1111-1111-111111111111',
      eventTitle: 'Standing Court Martial',
    })

    expect(payload.unitEventId).toBe('11111111-1111-1111-1111-111111111111')
    expect(payload.eventId).toBeUndefined()
    expect(payload.unitEventVisitorOptionId).toBeUndefined()
  })

  it('sends selected event options through unitEventVisitorOptionId', () => {
    const payload = buildReasonFirstVisitorPayload({
      kioskId: 'DASHBOARD_KIOSK',
      reason: 'event',
      branch: 'civilian',
      firstName: 'Alex',
      lastName: 'Taylor',
      eventId: '11111111-1111-1111-1111-111111111111',
      eventTitle: 'Wedding Reception',
      eventOptionId: '33333333-3333-3333-3333-333333333333',
      eventOptionTitle: 'Bride side',
    })

    expect(payload.unitEventVisitorOptionId).toBe('33333333-3333-3333-3333-333333333333')
    expect(payload.purposeDetails).toContain('Option: Bride side')
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

  it('includes event option labels in the visit summary', () => {
    const summary = buildReasonFirstVisitSummary({
      reason: 'event',
      branch: 'civilian',
      eventTitle: 'Standing Court Martial',
      eventOptionTitle: 'Gallery Attendee',
    })

    expect(summary).toContain('Event option: Gallery Attendee')
  })
})

describe('buildReasonFirstVisitorGroupPayload', () => {
  it('builds an atomic group payload with shared context and two members', () => {
    const payload = buildReasonFirstVisitorGroupPayload({
      kioskId: 'DASHBOARD_KIOSK',
      reason: 'meeting',
      branch: 'civilian',
      hostMemberId: '11111111-1111-1111-1111-111111111111',
      hostDisplayName: 'Lt(N) Patel',
      members: [
        { firstName: 'Alex', lastName: 'Taylor' },
        { firstName: 'Morgan', lastName: 'Lee' },
      ],
      vehicles: ['ABC 123', 'ZXY 987'],
    })

    expect(payload.members).toHaveLength(2)
    expect(payload.vehicles).toHaveLength(2)
    expect(payload.members[0]?.visitType).toBe('guest')
    expect(payload.visitPurpose).toBe('appointment')
  })

  it('requires at least one member', () => {
    expect(() =>
      buildReasonFirstVisitorGroupPayload({
        kioskId: 'DASHBOARD_KIOSK',
        reason: 'museum',
        branch: 'civilian',
        members: [],
      })
    ).toThrow('At least one visitor is required')
  })

  it('sends selected unit events through unitEventId for groups', () => {
    const payload = buildReasonFirstVisitorGroupPayload({
      kioskId: 'DASHBOARD_KIOSK',
      reason: 'event',
      branch: 'civilian',
      eventId: '22222222-2222-2222-2222-222222222222',
      eventTitle: 'Standing Court Martial',
      members: [{ firstName: 'Alex', lastName: 'Taylor' }],
    })

    expect(payload.unitEventId).toBe('22222222-2222-2222-2222-222222222222')
    expect(payload.eventId).toBeUndefined()
    expect(payload.unitEventVisitorOptionId).toBeUndefined()
  })

  it('sends selected event options through unitEventVisitorOptionId for groups', () => {
    const payload = buildReasonFirstVisitorGroupPayload({
      kioskId: 'DASHBOARD_KIOSK',
      reason: 'event',
      branch: 'civilian',
      eventId: '22222222-2222-2222-2222-222222222222',
      eventTitle: 'Standing Court Martial',
      eventOptionId: '44444444-4444-4444-4444-444444444444',
      eventOptionTitle: 'Gallery Attendee',
      members: [{ firstName: 'Alex', lastName: 'Taylor' }],
    })

    expect(payload.unitEventVisitorOptionId).toBe('44444444-4444-4444-4444-444444444444')
    expect(payload.purposeDetails).toContain('Option: Gallery Attendee')
  })
})

describe('resolveVisitorSelfSigninSubmissionMode', () => {
  it('submits a single listed visitor as an individual', () => {
    expect(resolveVisitorSelfSigninSubmissionMode({ memberCount: 1, vehicleCount: 0 })).toBe(
      'individual'
    )
    expect(resolveVisitorSelfSigninSubmissionMode({ memberCount: 1, vehicleCount: 1 })).toBe(
      'individual'
    )
  })

  it('submits multiple listed visitors as a group', () => {
    expect(resolveVisitorSelfSigninSubmissionMode({ memberCount: 2, vehicleCount: 0 })).toBe(
      'group'
    )
  })

  it('blocks one visitor with multiple vehicles', () => {
    expect(() =>
      resolveVisitorSelfSigninSubmissionMode({ memberCount: 1, vehicleCount: 2 })
    ).toThrow(SINGLE_VISITOR_MULTIPLE_VEHICLES_MESSAGE)
  })
})
