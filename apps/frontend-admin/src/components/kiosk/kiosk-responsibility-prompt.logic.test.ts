import { describe, expect, it } from 'vitest'
import type { KioskResponsibilityStateResponse } from '@sentinel/contracts'
import {
  getKioskResponsibilityPromptPresentation,
  getResponsibilityPrimaryLabel,
} from './kiosk-responsibility-prompt.logic'

function createState(
  overrides: Partial<KioskResponsibilityStateResponse> = {}
): KioskResponsibilityStateResponse {
  return {
    shouldPrompt: true,
    promptVariant: 'expected_dds',
    isFirstMemberCheckin: true,
    needsDds: true,
    needsBuildingOpen: true,
    buildingStatus: 'secured',
    canAcceptDds: true,
    canOpenBuilding: true,
    member: {
      id: 'member-1',
      firstName: 'Alex',
      lastName: 'Stone',
      rank: 'PO1',
    },
    expectedDds: {
      member: {
        id: 'member-1',
        firstName: 'Alex',
        lastName: 'Stone',
        rank: 'PO1',
      },
      source: 'scheduled',
      matchesScannedMember: true,
    },
    scheduledDds: {
      id: 'member-1',
      firstName: 'Alex',
      lastName: 'Stone',
      rank: 'PO1',
    },
    currentDds: null,
    currentLockupHolder: null,
    currentOpenContext: null,
    presentMembers: [
      {
        id: 'member-1',
        firstName: 'Alex',
        lastName: 'Stone',
        rank: 'PO1',
        checkedInAt: '2026-04-02T08:00:00.000Z',
      },
    ],
    presentVisitorCount: 0,
    todayCycles: [],
    ...overrides,
  }
}

describe('getKioskResponsibilityPromptPresentation', () => {
  it('defaults the expected DDS flow to accepting DDS and opening the building', () => {
    const state = createState()

    const presentation = getKioskResponsibilityPromptPresentation(state)

    expect(presentation.defaultAction).toBe('accept_dds')
    expect(presentation.actionOptions.map((option) => option.value)).toEqual([
      'accept_dds',
      'open_building',
    ])
    expect(getResponsibilityPrimaryLabel(state, presentation.defaultAction ?? 'accept_dds')).toBe(
      'Accept DDS and Open Building'
    )
  })

  it('defaults the replacement candidate flow to opening the building first', () => {
    const state = createState({
      promptVariant: 'replacement_candidate',
      expectedDds: {
        member: {
          id: 'member-2',
          firstName: 'Jordan',
          lastName: 'West',
          rank: 'SLt',
        },
        source: 'live',
        matchesScannedMember: false,
      },
    })

    const presentation = getKioskResponsibilityPromptPresentation(state)

    expect(presentation.defaultAction).toBe('open_building')
    expect(presentation.actionOptions.map((option) => option.value)).toEqual([
      'open_building',
      'accept_dds',
    ])
    expect(
      getResponsibilityPrimaryLabel(state, presentation.defaultAction ?? 'open_building')
    ).toBe('Open Building Now')
  })

  it('removes the open-building option once the building is already open', () => {
    const state = createState({
      promptVariant: 'building_open_dds_pending',
      needsBuildingOpen: false,
      buildingStatus: 'open',
      canOpenBuilding: false,
      currentOpenContext: {
        openedBy: {
          id: 'member-2',
          firstName: 'Jordan',
          lastName: 'West',
          rank: 'SLt',
        },
        openedAt: '2026-04-02T07:00:00.000Z',
        currentLockupHolder: {
          id: 'member-2',
          firstName: 'Jordan',
          lastName: 'West',
          rank: 'SLt',
        },
        currentHolderAcquiredAt: '2026-04-02T07:00:00.000Z',
      },
    })

    const presentation = getKioskResponsibilityPromptPresentation(state)

    expect(presentation.defaultAction).toBe('accept_dds')
    expect(presentation.actionOptions.map((option) => option.value)).toEqual(['accept_dds'])
    expect(getResponsibilityPrimaryLabel(state, presentation.defaultAction ?? 'accept_dds')).toBe(
      'Accept DDS Now'
    )
  })

  it('shows a blocked message when the scanned badge cannot resolve anything', () => {
    const state = createState({
      promptVariant: 'building_open_dds_pending',
      needsBuildingOpen: false,
      buildingStatus: 'open',
      canAcceptDds: false,
      canOpenBuilding: false,
    })

    const presentation = getKioskResponsibilityPromptPresentation(state)

    expect(presentation.defaultAction).toBeNull()
    expect(presentation.actionOptions).toEqual([])
    expect(presentation.blockedMessage).toContain('cannot take DDS right now')
  })
})
