import type { VisitorResponse } from '@sentinel/contracts'
import { describe, expect, it } from 'vitest'
import {
  buildVisitorEventTabs,
  buildVisitorSignoutGrouping,
  getPublicVisitorContextLine,
  getPublicVisitorTitle,
} from './visitor-signout-grouping'

function createVisitor(overrides: Partial<VisitorResponse>): VisitorResponse {
  const id = overrides.id ?? '00000000-0000-0000-0000-000000000000'
  return {
    id,
    name: overrides.name ?? 'Test Visitor',
    rankPrefix: overrides.rankPrefix ?? null,
    firstName: overrides.firstName ?? null,
    lastName: overrides.lastName ?? null,
    displayName: overrides.displayName ?? overrides.name ?? 'Test Visitor',
    organization: overrides.organization ?? null,
    unit: overrides.unit ?? null,
    mobilePhone: overrides.mobilePhone ?? null,
    licensePlate: overrides.licensePlate ?? null,
    visitType: overrides.visitType ?? 'guest',
    visitTypeId: overrides.visitTypeId ?? null,
    visitReason: overrides.visitReason ?? null,
    visitPurpose: overrides.visitPurpose ?? null,
    purposeDetails: overrides.purposeDetails ?? null,
    recruitmentStep: overrides.recruitmentStep ?? null,
    eventId: overrides.eventId ?? null,
    eventName: overrides.eventName ?? null,
    unitEventId: overrides.unitEventId ?? null,
    unitEventTitle: overrides.unitEventTitle ?? null,
    unitEventVisitorOptionId: overrides.unitEventVisitorOptionId ?? null,
    hostMemberId: overrides.hostMemberId ?? null,
    checkInTime: overrides.checkInTime ?? '2026-05-04T12:00:00.000Z',
    checkOutTime: overrides.checkOutTime ?? null,
    temporaryBadgeId: overrides.temporaryBadgeId ?? null,
    kioskId: overrides.kioskId ?? 'DASHBOARD_KIOSK',
    adminNotes: overrides.adminNotes ?? null,
    checkInMethod: overrides.checkInMethod ?? 'kiosk_self_service',
    createdByAdmin: overrides.createdByAdmin ?? null,
    visitorGroupId: overrides.visitorGroupId ?? null,
    createdAt: overrides.createdAt ?? '2026-05-04T12:00:00.000Z',
  }
}

describe('buildVisitorSignoutGrouping', () => {
  it('labels contractor groups with their most common company', () => {
    const grouping = buildVisitorSignoutGrouping([
      createVisitor({
        id: '11111111-1111-1111-1111-111111111111',
        visitorGroupId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        visitType: 'contractor',
        organization: 'Black & MacDonald',
      }),
      createVisitor({
        id: '22222222-2222-2222-2222-222222222222',
        visitorGroupId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        visitType: 'contractor',
        organization: 'Black & MacDonald',
      }),
      createVisitor({
        id: '33333333-3333-3333-3333-333333333333',
        visitorGroupId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        visitType: 'contractor',
        organization: 'Another Company',
      }),
    ])

    expect(grouping.groups[0]?.identityTitle).toBe('Black & MacDonald')
    expect(grouping.groups[0]?.identityDetail).toBe('3 contractors')
    expect(grouping.groups[0]?.contextLine).toBe('')
  })

  it('uses public event titles for visitor group context without event option details', () => {
    const grouping = buildVisitorSignoutGrouping([
      createVisitor({
        id: '10101010-1111-1111-1111-111111111111',
        visitorGroupId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        firstName: 'Alex',
        lastName: 'Smith',
        unitEventId: 'event-1',
        unitEventTitle: 'Standing Court Martial',
        unitEventVisitorOptionId: 'option-1',
        visitReason: 'Reason: Event | Category: Civilian | Event option: Gallery Attendee',
      }),
      createVisitor({
        id: '20202020-2222-2222-2222-222222222222',
        visitorGroupId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        firstName: 'Morgan',
        lastName: 'Smith',
        unitEventId: 'event-1',
        unitEventTitle: 'Standing Court Martial',
        unitEventVisitorOptionId: 'option-1',
        visitReason: 'Reason: Event | Category: Civilian | Event option: Gallery Attendee',
      }),
    ])

    expect(grouping.groups[0]?.contextLine).toBe('Standing Court Martial')
    expect(grouping.groups[0]?.contextLine).not.toContain('Gallery Attendee')
  })

  it('labels civilian-style groups with a shared surname', () => {
    const grouping = buildVisitorSignoutGrouping([
      createVisitor({
        id: '44444444-4444-4444-4444-444444444444',
        visitorGroupId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: 'Doe, Jane',
      }),
      createVisitor({
        id: '55555555-5555-5555-5555-555555555555',
        visitorGroupId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        firstName: 'John',
        lastName: 'DOE',
        displayName: 'Doe, John',
      }),
    ])

    expect(grouping.groups[0]?.identityTitle).toBe('Doe group')
    expect(grouping.groups[0]?.identityDetail).toBe('2 visitors')
  })

  it('uses a mixed fallback label when surnames and companies differ', () => {
    const grouping = buildVisitorSignoutGrouping([
      createVisitor({
        id: '66666666-6666-6666-6666-666666666666',
        visitorGroupId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        displayName: 'Sauk, C',
        lastName: 'Sauk',
      }),
      createVisitor({
        id: '77777777-7777-7777-7777-777777777777',
        visitorGroupId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        displayName: 'Smith, M',
        lastName: 'Smith',
      }),
      createVisitor({
        id: '88888888-8888-8888-8888-888888888888',
        visitorGroupId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        displayName: 'Cook, D',
        lastName: 'Cook',
      }),
    ])

    expect(grouping.groups[0]?.identityTitle).toContain('Sauk')
    expect(grouping.groups[0]?.identityTitle).toContain('+1 more')
  })

  it('handles missing names and organizations without crashing', () => {
    const grouping = buildVisitorSignoutGrouping([
      createVisitor({
        id: '99999999-9999-9999-9999-999999999999',
        visitorGroupId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        displayName: 'Visitor One',
        lastName: null,
        organization: null,
      }),
      createVisitor({
        id: 'aaaaaaaa-1111-1111-1111-111111111111',
        visitorGroupId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        displayName: 'Visitor Two',
        lastName: null,
        organization: null,
      }),
    ])

    expect(grouping.groups[0]?.identityTitle.length).toBeGreaterThan(0)
    expect(grouping.groups[0]?.contextLine).toBe('')
  })

  it('assigns stable group codes based on sorted recency', () => {
    const visitors = [
      createVisitor({
        id: 'bbbbbbbb-1111-1111-1111-111111111111',
        visitorGroupId: 'group-older',
        checkInTime: '2026-05-04T09:00:00.000Z',
      }),
      createVisitor({
        id: 'cccccccc-1111-1111-1111-111111111111',
        visitorGroupId: 'group-newer',
        checkInTime: '2026-05-04T10:00:00.000Z',
      }),
    ]

    const first = buildVisitorSignoutGrouping(visitors)
    const second = buildVisitorSignoutGrouping(visitors)

    expect(first.groups.map((group) => group.groupCode)).toEqual(['G-01', 'G-02'])
    expect(second.groups.map((group) => group.groupCode)).toEqual(['G-01', 'G-02'])
    expect(first.groups[0]?.groupId).toBe('group-newer')
  })
})

describe('public visitor kiosk display', () => {
  it('uses company names as contractor primary titles without work descriptions', () => {
    const visitor = createVisitor({
      visitType: 'contractor',
      organization: 'Black & MacDonald',
      purposeDetails: 'Repair panel beside admin office',
    })

    expect(getPublicVisitorTitle(visitor)).toBe('Black & MacDonald')
    expect(getPublicVisitorContextLine(visitor)).toBe('Black & MacDonald')
    expect(getPublicVisitorContextLine(visitor)).not.toContain('Repair panel')
  })

  it('keeps meeting host and civilian category text off the public context line', () => {
    const visitor = createVisitor({
      visitReason: 'Reason: Meeting | Category: Civilian | Meeting with: Lt(N) Patel',
      visitPurpose: 'appointment',
    })

    expect(getPublicVisitorContextLine(visitor)).toBeUndefined()
  })

  it('shows military rank and unit cleanly when there is no event context', () => {
    const visitor = createVisitor({
      visitType: 'military',
      rankPrefix: 'PO2',
      unit: 'HMCS Example',
      visitReason: 'Reason: Meeting | Category: Military | Meeting with: Lt(N) Patel',
    })

    expect(getPublicVisitorContextLine(visitor)).toBe('PO2 • HMCS Example')
  })

  it('builds event tabs from active unit event visitors using total people counts', () => {
    const tabs = buildVisitorEventTabs([
      createVisitor({
        id: '30303030-3333-3333-3333-333333333333',
        unitEventId: 'event-2',
        unitEventTitle: 'Mess Dinner',
      }),
      createVisitor({
        id: '40404040-4444-4444-4444-444444444444',
        unitEventId: 'event-1',
        unitEventTitle: 'Standing Court Martial',
      }),
      createVisitor({
        id: '50505050-5555-5555-5555-555555555555',
        unitEventId: 'event-1',
        unitEventTitle: 'Standing Court Martial',
      }),
      createVisitor({
        id: '60606060-6666-6666-6666-666666666666',
        unitEventId: null,
      }),
    ])

    expect(tabs).toEqual([
      { unitEventId: 'event-2', title: 'Mess Dinner', count: 1 },
      { unitEventId: 'event-1', title: 'Standing Court Martial', count: 2 },
    ])
  })

  it('keeps fallback event tab labels focused on the event name', () => {
    const tabs = buildVisitorEventTabs([
      createVisitor({
        unitEventId: 'event-1',
        unitEventTitle: null,
        visitReason:
          'Reason: Event | Category: Civilian | Event: Standing Court Martial (May 22, 2026 - Jun 15, 2026)',
      }),
    ])

    expect(tabs).toEqual([{ unitEventId: 'event-1', title: 'Standing Court Martial', count: 1 }])
  })
})
