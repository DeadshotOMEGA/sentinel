import { describe, expect, it } from 'vitest'
import type {
  DutyPositionResponse,
  DutyWatchTeamResponse,
  PresentPerson,
} from '@sentinel/contracts'
import {
  getDutyWatchCoverageSummary,
  getQualifiedTemporaryDutyPositions,
  getTonightReplacementOptions,
} from './dashboard-member-actions'

function createMember(overrides: Partial<PresentPerson> = {}): PresentPerson {
  return {
    id: 'member-1',
    type: 'member',
    name: 'Alex Stone',
    displayName: 'Alex Stone',
    rank: 'PO1',
    firstName: 'Alex',
    lastName: 'Stone',
    initials: 'AS',
    rankSortOrder: 10,
    division: 'Operations',
    divisionCode: 'OPS',
    divisionId: 'division-1',
    memberType: 'class_a',
    tags: [
      {
        id: 'tag-swk',
        name: 'SWK',
        source: 'qualification',
        isPositional: true,
      },
      {
        id: 'tag-qm',
        name: 'QM',
        source: 'qualification',
        isPositional: true,
      },
    ],
    activeCheckinId: 'checkin-1',
    checkInTime: '2026-04-02T18:00:00.000Z',
    ...overrides,
  }
}

function createDutyPosition(code: string): DutyPositionResponse {
  return {
    id: `position-${code.toLowerCase()}`,
    dutyRoleId: 'role-duty-watch',
    code,
    name: code,
    description: null,
    maxSlots: 1,
    displayOrder: 1,
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z',
  }
}

function createDutyWatchTeam(): DutyWatchTeamResponse {
  return {
    scheduleId: 'schedule-1',
    weekStartDate: '2026-03-30',
    operationalDate: '2026-04-02',
    isDutyWatchNight: true,
    team: [
      {
        assignmentId: 'assignment-swk',
        position: {
          id: 'position-swk',
          code: 'SWK',
          name: 'Senior Watch Keeper',
        },
        member: {
          id: 'member-2',
          firstName: 'Jordan',
          lastName: 'West',
          rank: 'LS',
          serviceNumber: '222222',
        },
        status: 'assigned',
        isCheckedIn: false,
        source: 'schedule',
        liveCoverage: {
          assignmentId: 'live-swk',
          startedAt: '2026-04-02T19:10:00.000Z',
          notes: 'Covering for the evening',
          member: {
            id: 'member-3',
            firstName: 'Taylor',
            lastName: 'Cover',
            rank: 'MS',
            serviceNumber: '333333',
          },
        },
      },
      {
        assignmentId: 'assignment-qm',
        position: {
          id: 'position-qm',
          code: 'QM',
          name: 'Quartermaster',
        },
        member: {
          id: 'member-4',
          firstName: 'Morgan',
          lastName: 'Quill',
          rank: 'PO2',
          serviceNumber: '444444',
        },
        status: 'confirmed',
        isCheckedIn: true,
        source: 'schedule',
        liveCoverage: null,
      },
      {
        assignmentId: 'live-aps',
        position: {
          id: 'position-aps',
          code: 'APS',
          name: 'Assistant Petty Officer',
        },
        member: {
          id: 'member-5',
          firstName: 'Pat',
          lastName: 'Extra',
          rank: 'LS',
          serviceNumber: '555555',
        },
        status: 'assigned',
        isCheckedIn: true,
        source: 'live_only',
        liveCoverage: null,
      },
    ],
  }
}

describe('dashboard member action helpers', () => {
  it('filters temporary roles to allowed positions that match the member qualifications', () => {
    const positions = [
      createDutyPosition('SWK'),
      createDutyPosition('QM'),
      createDutyPosition('BM'),
    ]

    const result = getQualifiedTemporaryDutyPositions(createMember(), positions)

    expect(result.map((position) => position.code)).toEqual(['SWK', 'QM'])
  })

  it('builds tonight replacement options from scheduled slots the member is qualified to cover', () => {
    const result = getTonightReplacementOptions(createMember(), createDutyWatchTeam())

    expect(result).toEqual([
      expect.objectContaining({
        assignmentId: 'assignment-swk',
        positionCode: 'SWK',
        replacingMemberId: 'member-2',
      }),
      expect.objectContaining({
        assignmentId: 'assignment-qm',
        positionCode: 'QM',
        replacingMemberId: 'member-4',
      }),
    ])
  })

  it('counts planned coverage separately from live-only entries', () => {
    const summary = getDutyWatchCoverageSummary(createDutyWatchTeam())

    expect(summary).toEqual({
      plannedCount: 2,
      coveredCount: 2,
      uncoveredCount: 0,
      liveOnlyCount: 1,
      allCovered: true,
    })
  })
})
