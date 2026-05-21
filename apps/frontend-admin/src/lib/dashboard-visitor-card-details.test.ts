import type { PresentPerson } from '@sentinel/contracts'
import { describe, expect, it } from 'vitest'
import { getDashboardVisitorCardDetails } from './dashboard-visitor-card-details'

function createVisitor(overrides: Partial<PresentPerson>): PresentPerson {
  return {
    id: overrides.id ?? 'visitor-1',
    type: 'visitor',
    name: overrides.name ?? 'Doe, Jane',
    displayName: overrides.displayName ?? 'Doe, Jane',
    rank: overrides.rank,
    firstName: overrides.firstName,
    lastName: overrides.lastName,
    organization: overrides.organization,
    visitType: overrides.visitType ?? {
      id: 'guest',
      name: 'guest',
    },
    visitReason: overrides.visitReason,
    visitPurpose: overrides.visitPurpose,
    purposeDetails: overrides.purposeDetails,
    hostMemberId: overrides.hostMemberId,
    hostName: overrides.hostName,
    eventId: overrides.eventId,
    eventName: overrides.eventName,
    unitEventId: overrides.unitEventId,
    unitEventTitle: overrides.unitEventTitle,
    unitEventVisitorOptionId: overrides.unitEventVisitorOptionId,
    checkInTime: overrides.checkInTime ?? '2026-05-20T15:00:00.000Z',
  }
}

describe('getDashboardVisitorCardDetails', () => {
  it('formats event visitor details without heading prefixes', () => {
    const details = getDashboardVisitorCardDetails(
      createVisitor({
        firstName: 'Jane',
        lastName: 'Doe',
        unitEventId: 'event-1',
        unitEventTitle: 'Standing Court Martial',
        unitEventVisitorOptionId: 'option-1',
        purposeDetails: 'Gallery Attendee',
        hostName: 'Lt(N) Patel',
        visitReason: 'Reason: Event | Category: Civilian | Event option: Gallery Attendee',
      }),
      'Doe, Jane'
    )

    expect(details.title).toBe('Jane Doe')
    expect(details.subtitle).toBe('Standing Court Martial')
    expect(details.detail).toBe('Gallery Attendee • Civilian • guest')
    expect(details.detail).not.toContain(details.subtitle as string)
    expect(details.detail).not.toContain('Lt(N) Patel')
    expect(details.detail).not.toContain('Reason:')
    expect(details.detail).not.toContain('Category:')
    expect(details.detail).not.toContain('Event option:')
  })

  it('keeps meeting host details when the structured host field is unavailable', () => {
    const details = getDashboardVisitorCardDetails(
      createVisitor({
        visitReason: 'Reason: Meeting | Category: Civilian | Meeting with: Lt(N) Patel',
      }),
      'Doe, Jane'
    )

    expect(details.detail).toContain('hosted by Lt(N) Patel')
  })

  it('shows contractor company and work description for internal dashboard cards', () => {
    const details = getDashboardVisitorCardDetails(
      createVisitor({
        name: 'Contractor Person',
        displayName: 'Contractor Person',
        organization: 'Black & MacDonald',
        visitType: { id: 'contractor', name: 'contractor' },
        purposeDetails: 'Panel inspection in mechanical space',
        visitReason:
          'Reason: Contract Work | Category: Civilian | Company/Organization: Black & MacDonald | Work: Panel inspection in mechanical space',
      }),
      'Contractor Person'
    )

    expect(details.subtitle).toBe('Black & MacDonald')
    expect(details.detail).toBe('Panel inspection in mechanical space • Civilian • contractor')
    expect(details.detail).not.toContain(details.subtitle as string)
  })

  it('keeps military rank and unit cleanly available', () => {
    const details = getDashboardVisitorCardDetails(
      createVisitor({
        name: 'PO2 Sauk',
        displayName: 'PO2 Sauk',
        rank: 'PO2',
        visitType: { id: 'military', name: 'military' },
        visitReason: 'Reason: Meeting | Category: Military | Rank: PO2 | Unit: HMCS Example',
      }),
      'PO2 Sauk'
    )

    expect(details.subtitle).toBe('PO2 • HMCS Example')
    expect(details.detail).toBe('Military')
    expect(details.detail).not.toContain(details.subtitle as string)
  })
})
