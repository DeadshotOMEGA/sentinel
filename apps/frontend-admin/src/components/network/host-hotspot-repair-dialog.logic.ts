export const HOST_HOTSPOT_ANTENNA_WAIT_SECONDS = 3
export const HOST_HOTSPOT_RESET_WATCH_SECONDS = 10

export const HOST_HOTSPOT_REPAIR_STEPS = [
  {
    id: 'check-wifi',
    label: 'Check radios',
  },
  {
    id: 'run-repair',
    label: 'Run repair',
  },
  {
    id: 'watch-reset',
    label: 'Watch reset',
  },
  {
    id: 'reset-antenna',
    label: 'Reseat antenna',
  },
  {
    id: 'retry-repair',
    label: 'Run repair again',
  },
] as const

export type HostHotspotRepairStepId = (typeof HOST_HOTSPOT_REPAIR_STEPS)[number]['id']
export type HostHotspotRepairStage = HostHotspotRepairStepId | 'complete'
export type HostHotspotRepairStepState = 'complete' | 'active' | 'pending'

export interface HostHotspotAntennaWaitState {
  started: boolean
  secondsRemaining: number
}

export interface HostHotspotResetWatchState {
  secondsRemaining: number
}

export function getHostHotspotRepairStepState(
  stage: HostHotspotRepairStage,
  stepId: HostHotspotRepairStepId
): HostHotspotRepairStepState {
  if (stage === 'complete') {
    return 'complete'
  }

  const activeIndex = HOST_HOTSPOT_REPAIR_STEPS.findIndex((step) => step.id === stage)
  const stepIndex = HOST_HOTSPOT_REPAIR_STEPS.findIndex((step) => step.id === stepId)

  if (stepIndex < activeIndex) {
    return 'complete'
  }

  if (stepIndex === activeIndex) {
    return 'active'
  }

  return 'pending'
}

export function getHostHotspotAntennaWaitLabel(state: HostHotspotAntennaWaitState): string {
  if (!state.started) {
    return 'Start 3-second wait'
  }

  const secondsRemaining = Math.max(0, Math.ceil(state.secondsRemaining))

  if (secondsRemaining === 0) {
    return 'Antenna is plugged in'
  }

  return `Wait ${secondsRemaining}s`
}

export function getHostHotspotResetWatchLabel(state: HostHotspotResetWatchState): string {
  const secondsRemaining = Math.max(0, Math.ceil(state.secondsRemaining))

  if (secondsRemaining === 0) {
    return 'Continue if needed'
  }

  return `Watching reset ${secondsRemaining}s`
}

export function isHostHotspotResetWatchActionDisabled(state: HostHotspotResetWatchState): boolean {
  return state.secondsRemaining > 0
}

export function isHostHotspotAntennaWaitActionDisabled(
  state: HostHotspotAntennaWaitState
): boolean {
  return state.started && state.secondsRemaining > 0
}
