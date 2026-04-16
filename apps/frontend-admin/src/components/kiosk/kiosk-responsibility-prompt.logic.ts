import type { KioskResponsibilityStateResponse } from '@sentinel/contracts'

export type ResponsibilityActionChoice = 'accept_dds' | 'open_building'

export interface ResponsibilityActionOption {
  value: ResponsibilityActionChoice
  title: string
  description: string
}

export interface KioskResponsibilityPromptPresentation {
  headline: string
  helperText: string
  bannerTone: 'info' | 'warning'
  bannerTitle: string
  bannerDescription: string
  defaultAction: ResponsibilityActionChoice | null
  actionOptions: ResponsibilityActionOption[]
  blockedMessage: string | null
}

function buildBlockedMessage(state: KioskResponsibilityStateResponse): string {
  if (!state.needsBuildingOpen && !state.canAcceptDds) {
    return 'This badge cannot take DDS right now. A DDS- and lockup-qualified member still needs to accept responsibility.'
  }

  if (!state.needsDds && !state.canOpenBuilding) {
    return 'This badge cannot open the building right now. A lockup-qualified member needs to handle the opening.'
  }

  if (!state.canAcceptDds && !state.canOpenBuilding) {
    return 'This badge cannot resolve DDS or opening right now. Ask the expected DDS or a lockup-qualified member.'
  }

  if (!state.canAcceptDds) {
    return 'This badge cannot take DDS right now. A DDS- and lockup-qualified member still needs to accept responsibility.'
  }

  return 'This badge cannot open the building right now. A lockup-qualified member must open first.'
}

function buildCommonOpenOnlyOption(
  state: KioskResponsibilityStateResponse
): ResponsibilityActionOption {
  if (state.needsDds) {
    return {
      value: 'open_building',
      title: 'Open building without accepting DDS',
      description: 'The building will open now. DDS can be accepted later.',
    }
  }

  return {
    value: 'open_building',
    title: 'Open building now',
    description: 'The building will open now, and you will become the current lockup holder.',
  }
}

function buildAcceptDdsOption(state: KioskResponsibilityStateResponse): ResponsibilityActionOption {
  return {
    value: 'accept_dds',
    title: state.promptVariant === 'replacement_candidate' ? 'Replace DDS' : 'Accept DDS now',
    description: state.needsBuildingOpen
      ? state.promptVariant === 'replacement_candidate'
        ? 'You will take over DDS now, and the building will open.'
        : 'DDS will activate, the building will open, and lockup will transfer to you automatically.'
      : state.promptVariant === 'replacement_candidate'
        ? 'You will take over DDS now.'
        : 'DDS will activate now and lockup will transfer to you automatically if needed.',
  }
}

export function getResponsibilityPrimaryLabel(
  state: KioskResponsibilityStateResponse,
  action: ResponsibilityActionChoice
): string {
  if (action === 'accept_dds') {
    return state.needsBuildingOpen ? 'Accept DDS and Open Building' : 'Accept DDS Now'
  }

  return 'Open Building Now'
}

export function getResponsibilitySummary(
  state: KioskResponsibilityStateResponse,
  action: ResponsibilityActionChoice
): string {
  if (action === 'accept_dds') {
    return state.needsBuildingOpen
      ? 'This will activate DDS, open the building, and move lockup to you.'
      : 'This will activate DDS and confirm you as the responsible staff member for today.'
  }

  if (state.needsDds) {
    return 'This will open the building now. DDS will still need to be accepted later.'
  }

  return 'This will open the building and make you the current lockup holder.'
}

export function getKioskResponsibilityPromptPresentation(
  state: KioskResponsibilityStateResponse
): KioskResponsibilityPromptPresentation {
  switch (state.promptVariant) {
    case 'expected_dds': {
      const actionOptions: ResponsibilityActionOption[] = []

      if (state.canAcceptDds) {
        actionOptions.push(buildAcceptDdsOption(state))
      }

      if (state.needsBuildingOpen && state.canOpenBuilding) {
        actionOptions.push(buildCommonOpenOnlyOption(state))
      }

      return {
        headline: "You're today's expected DDS.",
        helperText: state.needsBuildingOpen
          ? 'Accept DDS in one step to activate duty and open the building.'
          : 'Accept DDS now so later arrivals can continue without another stop.',
        bannerTone: 'info',
        bannerTitle: 'This badge matches the expected DDS for today.',
        bannerDescription: state.needsBuildingOpen
          ? 'The safe default is to accept DDS now so opening and lockup transfer happen together.'
          : 'The building is already open. Accept DDS now to clear the remaining daily responsibility.',
        defaultAction: actionOptions[0]?.value ?? null,
        actionOptions,
        blockedMessage: actionOptions.length === 0 ? buildBlockedMessage(state) : null,
      }
    }

    case 'replacement_candidate': {
      const actionOptions: ResponsibilityActionOption[] = []

      if (state.canOpenBuilding) {
        actionOptions.push(buildCommonOpenOnlyOption(state))
      }

      if (state.canAcceptDds) {
        actionOptions.push(buildAcceptDdsOption(state))
      }

      const expectedName = state.expectedDds
        ? `${state.expectedDds.member.rank} ${state.expectedDds.member.firstName} ${state.expectedDds.member.lastName}`
        : 'A DDS-qualified member'

      return {
        headline: 'Decide how you are opening today.',
        helperText: 'Opening first makes you responsible for the building until DDS is accepted.',
        bannerTone: 'warning',
        bannerTitle: `Expected DDS is ${expectedName}`,
        bannerDescription:
          'Choose “Replace DDS” only if you are taking over as the DDS for today. Otherwise, open the building without accepting DDS.',
        defaultAction: actionOptions[0]?.value ?? null,
        actionOptions,
        blockedMessage: actionOptions.length === 0 ? buildBlockedMessage(state) : null,
      }
    }

    case 'building_open_dds_pending': {
      const actionOptions = state.canAcceptDds ? [buildAcceptDdsOption(state)] : []

      return {
        headline: 'The building is already open.',
        helperText:
          'DDS still needs to be accepted before this check-in flow stops prompting later arrivals.',
        bannerTone: 'warning',
        bannerTitle: 'Opening is already covered.',
        bannerDescription:
          'Review who opened the building, who currently holds lockup, and who is already inside before deciding whether to take DDS.',
        defaultAction: actionOptions[0]?.value ?? null,
        actionOptions,
        blockedMessage: actionOptions.length === 0 ? buildBlockedMessage(state) : null,
      }
    }

    case 'opener_only':
    default: {
      const actionOptions = state.canOpenBuilding ? [buildCommonOpenOnlyOption(state)] : []

      return {
        headline: 'Open the building to continue check-ins.',
        helperText:
          'Opening now records you as responsible for the building until lockup changes hands.',
        bannerTone: 'warning',
        bannerTitle: 'The building is still secured.',
        bannerDescription:
          'Open the building now to let check-ins continue. DDS can still be accepted later by the correct member.',
        defaultAction: actionOptions[0]?.value ?? null,
        actionOptions,
        blockedMessage: actionOptions.length === 0 ? buildBlockedMessage(state) : null,
      }
    }
  }
}
