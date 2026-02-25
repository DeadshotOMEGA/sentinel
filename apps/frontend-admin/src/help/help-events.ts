'use client'

export type HelpOpenSource = 'help_button' | 'driver_step' | 'fallback'

export type HelpTarget = 'wiki' | 'tour' | 'local'

export interface HelpOpenEventDetail {
  routeId: string
  wikiSlug: string | null
  source: HelpOpenSource
  target: HelpTarget
  outcome: 'opened' | 'fallback' | 'failed'
  timestamp: string
}

export interface HelpTourRequestDetail {
  routeId: string
  procedureId: string
  timestamp: string
}

export interface ActiveHelpStepDetail {
  routeId: string
  procedureId: string
  stepId: string
  wikiSlug?: string
  openMode?: 'new-tab' | 'drawer'
  label?: string
}

const HELP_OPEN_EVENT = 'sentinel:help-open'
const HELP_TOUR_REQUEST_EVENT = 'sentinel:help-request-tour'
const HELP_ACTIVE_STEP_EVENT = 'sentinel:help-active-step'

let activeHelpStep: ActiveHelpStepDetail | null = null

function dispatchSentinelEvent<T>(name: string, detail: T): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new window.CustomEvent<T>(name, {
      detail,
    })
  )
}

export function emitHelpOpen(detail: HelpOpenEventDetail): void {
  dispatchSentinelEvent(HELP_OPEN_EVENT, detail)
}

export function subscribeHelpOpen(handler: (detail: HelpOpenEventDetail) => void): () => void {
  if (typeof window === 'undefined') return () => undefined

  const listener = (event: Event) => {
    const customEvent = event as globalThis.CustomEvent<HelpOpenEventDetail>
    handler(customEvent.detail)
  }

  window.addEventListener(HELP_OPEN_EVENT, listener)
  return () => window.removeEventListener(HELP_OPEN_EVENT, listener)
}

export function emitHelpTourRequest(routeId: string, procedureId: string): void {
  dispatchSentinelEvent<HelpTourRequestDetail>(HELP_TOUR_REQUEST_EVENT, {
    routeId,
    procedureId,
    timestamp: new Date().toISOString(),
  })
}

export function subscribeHelpTourRequest(
  handler: (detail: HelpTourRequestDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined

  const listener = (event: Event) => {
    const customEvent = event as globalThis.CustomEvent<HelpTourRequestDetail>
    handler(customEvent.detail)
  }

  window.addEventListener(HELP_TOUR_REQUEST_EVENT, listener)
  return () => window.removeEventListener(HELP_TOUR_REQUEST_EVENT, listener)
}

export function emitActiveHelpStep(detail: ActiveHelpStepDetail | null): void {
  activeHelpStep = detail
  dispatchSentinelEvent<ActiveHelpStepDetail | null>(HELP_ACTIVE_STEP_EVENT, detail)
}

export function getActiveHelpStep(): ActiveHelpStepDetail | null {
  return activeHelpStep
}

export function subscribeActiveHelpStep(
  handler: (detail: ActiveHelpStepDetail | null) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined

  const listener = (event: Event) => {
    const customEvent = event as globalThis.CustomEvent<ActiveHelpStepDetail | null>
    handler(customEvent.detail)
  }

  window.addEventListener(HELP_ACTIVE_STEP_EVENT, listener)
  return () => window.removeEventListener(HELP_ACTIVE_STEP_EVENT, listener)
}
