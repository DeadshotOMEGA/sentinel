import { describe, expect, it } from 'vitest'
import {
  buildSetTodayDdsModalPresentation,
  getSetTodayDdsMode,
  type DisplayMember,
  type SetTodayDdsModalPresentationInput,
} from './set-today-dds-modal.logic'

function member(id: string, rank: string, firstName: string, lastName: string): DisplayMember {
  return {
    id,
    rank,
    firstName,
    lastName,
    serviceNumber: `${id}-SN`,
  }
}

function createInput(
  overrides: Partial<SetTodayDdsModalPresentationInput> = {}
): SetTodayDdsModalPresentationInput {
  const scheduled = member('member-1', 'S1', 'Taylor', 'Hunt')

  return {
    isHandoverPending: false,
    hasActiveDds: false,
    hasPendingDds: false,
    isOverrideSelection: false,
    isPendingCurrentDds: false,
    isAlreadyCurrentDds: false,
    loadingEligible: false,
    candidateCount: 3,
    handoverFirstOperationalDay: null,
    selectedMember: member('member-2', 'MS', 'Jordan', 'Lee'),
    currentAssignmentMember: null,
    selectedScheduledMember: scheduled,
    outgoingHandoverMember: null,
    currentHolder: member('member-9', 'PO1', 'Casey', 'Moore'),
    buildingStatus: 'open',
    ...overrides,
  }
}

describe('getSetTodayDdsMode', () => {
  it('detects all four modal modes', () => {
    expect(
      getSetTodayDdsMode({
        isHandoverPending: true,
        hasActiveDds: true,
        hasPendingDds: true,
      })
    ).toBe('handover')

    expect(
      getSetTodayDdsMode({
        isHandoverPending: false,
        hasActiveDds: true,
        hasPendingDds: true,
      })
    ).toBe('transfer')

    expect(
      getSetTodayDdsMode({
        isHandoverPending: false,
        hasActiveDds: false,
        hasPendingDds: true,
      })
    ).toBe('confirm')

    expect(
      getSetTodayDdsMode({
        isHandoverPending: false,
        hasActiveDds: false,
        hasPendingDds: false,
      })
    ).toBe('assign')
  })
})

describe('buildSetTodayDdsModalPresentation', () => {
  it('uses complete handover label when target matches scheduled DDS', () => {
    const scheduled = member('incoming-1', 'SLt', 'Jamie', 'Rivera')

    const presentation = buildSetTodayDdsModalPresentation(
      createInput({
        isHandoverPending: true,
        hasActiveDds: false,
        hasPendingDds: false,
        selectedScheduledMember: scheduled,
        selectedMember: scheduled,
        outgoingHandoverMember: member('outgoing-1', 'MS', 'Pat', 'Singh'),
      })
    )

    expect(presentation.mode).toBe('handover')
    expect(presentation.title).toBe('Complete weekly DDS handover')
    expect(presentation.primaryActionLabel).toBe('Complete handover')
  })

  it('uses confirm and override action labels in confirm mode', () => {
    const confirmPresentation = buildSetTodayDdsModalPresentation(
      createInput({
        hasPendingDds: true,
        isPendingCurrentDds: true,
        currentAssignmentMember: member('member-2', 'MS', 'Jordan', 'Lee'),
        selectedMember: member('member-2', 'MS', 'Jordan', 'Lee'),
      })
    )

    expect(confirmPresentation.mode).toBe('confirm')
    expect(confirmPresentation.primaryActionLabel).toBe('Confirm DDS')
    expect(confirmPresentation.primaryActionTone).toBe('success')

    const overridePresentation = buildSetTodayDdsModalPresentation(
      createInput({
        hasPendingDds: true,
        isPendingCurrentDds: false,
        isOverrideSelection: true,
      })
    )

    expect(overridePresentation.primaryActionLabel).toBe('Assign different DDS')
  })

  it('does not show redundant live-status summary badge in transfer mode', () => {
    const presentation = buildSetTodayDdsModalPresentation(
      createInput({
        hasActiveDds: true,
        currentAssignmentMember: member('member-live', 'MS', 'Cortney', 'Sauk'),
      })
    )

    expect(presentation.mode).toBe('transfer')
    expect(presentation.summaryBadges.map((badge) => badge.label)).not.toContain('Live DDS active')
  })

  it('reports actionable blockers only and disables submit when required', () => {
    const presentation = buildSetTodayDdsModalPresentation(
      createInput({
        selectedMember: null,
      })
    )

    expect(presentation.canSubmit).toBe(false)
    expect(presentation.blockers.map((check) => check.id)).toContain('target-selected')
    expect(presentation.blockers.every((check) => check.isBlocking)).toBe(true)
  })

  it('treats same-member transfer as a blocker', () => {
    const current = member('member-live', 'PO2', 'Avery', 'King')

    const presentation = buildSetTodayDdsModalPresentation(
      createInput({
        hasActiveDds: true,
        currentAssignmentMember: current,
        selectedMember: current,
        isAlreadyCurrentDds: true,
      })
    )

    expect(presentation.mode).toBe('transfer')
    expect(presentation.canSubmit).toBe(false)
    expect(presentation.blockers.map((check) => check.id)).toContain('different-from-current')
  })

  it('moves satisfied and informational checks into collapsed-details model', () => {
    const presentation = buildSetTodayDdsModalPresentation(createInput())

    expect(presentation.canSubmit).toBe(true)
    expect(presentation.detailsChecks.map((check) => check.id)).toEqual(
      expect.arrayContaining(['scheduled-dds', 'building-status', 'lockup-holder'])
    )
    expect(presentation.metChecks.length).toBeGreaterThan(0)
    expect(presentation.blockers).toEqual([])
  })

  it('shows no-candidate blocker when checked-in options are unavailable', () => {
    const presentation = buildSetTodayDdsModalPresentation(
      createInput({
        candidateCount: 0,
        selectedMember: null,
      })
    )

    expect(presentation.canSubmit).toBe(false)
    expect(presentation.blockers.map((check) => check.id)).toContain('no-candidates')
    expect(presentation.blockers.map((check) => check.id)).not.toContain('target-selected')
  })

  it('shows no selected target in transfer mode when selection is missing', () => {
    const presentation = buildSetTodayDdsModalPresentation(
      createInput({
        hasActiveDds: true,
        selectedMember: null,
        currentAssignmentMember: member('member-live', 'MS', 'Cortney', 'Sauk'),
      })
    )

    expect(presentation.summaryTargetMemberName).toBe('None selected')
    expect(presentation.blockers.map((check) => check.id)).toContain('target-selected')
  })
})
