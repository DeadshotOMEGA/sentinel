'use client'

import type { Driver, DriveStep, PopoverDOM } from 'driver.js'
import { driver } from 'driver.js'
import type { ProcedureDefinition, ProcedureDriver, ProcedureDriverHandlers } from './types'
import { emitActiveHelpStep } from './help-events'
import { openHelpTarget } from './orchestrator'
import { HELP_START_HERE_ROUTE_ID, resolveRouteIdFromPathname } from './help-registry'
import { resolvePreferredTargetElement } from './runtime'

const HELP_ICON_SVG =
  '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4H11v16H4.5A2.5 2.5 0 0 1 2 17.5z"/><path d="M22 6.5A2.5 2.5 0 0 0 19.5 4H13v16h6.5a2.5 2.5 0 0 0 2.5-2.5z"/></svg>'
const PREVIOUS_ICON_HTML =
  '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg><span class="sr-only">Previous step</span>'
const NEXT_ICON_HTML =
  '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><span class="sr-only">Next step</span>'
const DONE_ICON_HTML =
  '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span class="sr-only">Finish tour</span>'

function setIconButtonLabel(button: globalThis.HTMLButtonElement, label: string): void {
  button.setAttribute('aria-label', label)
  button.title = label
}

function polishPopoverControls(popover: PopoverDOM, params: { isLastStep: boolean }): void {
  setIconButtonLabel(popover.previousButton, 'Previous step')
  setIconButtonLabel(popover.nextButton, params.isLastStep ? 'Finish tour' : 'Next step')
  setIconButtonLabel(popover.closeButton, 'Close help tour')
}

function createLearnMoreButton(params: {
  popover: PopoverDOM
  routeId: string
  wikiSlug: string
  label: string
  openMode?: 'new-tab' | 'drawer'
}): void {
  const existing = params.popover.footerButtons.querySelector<globalThis.HTMLButtonElement>(
    '[data-sentinel-help-link="true"]'
  )
  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'driver-popover-btn driver-popover-btn-help'
  button.dataset.sentinelHelpLink = 'true'
  button.setAttribute('aria-label', params.label)
  button.title = params.label
  button.innerHTML = `${HELP_ICON_SVG}<span class="sr-only">${params.label}</span>`

  button.addEventListener('click', () => {
    if (params.openMode === 'drawer') {
      // Drawer mode is reserved for phase 2 preview support.
    }

    void openHelpTarget({
      routeId: params.routeId,
      wikiSlug: params.wikiSlug,
      source: 'driver_step',
    })
  })

  params.popover.footerButtons.prepend(button)
}

export class DriverJsProcedureDriver implements ProcedureDriver {
  private instance: Driver | null = null
  private activeProcedureId: string | null = null

  async mount(definition: ProcedureDefinition, handlers: ProcedureDriverHandlers): Promise<void> {
    const routeId = resolveRouteIdFromPathname(definition.route) ?? HELP_START_HERE_ROUTE_ID

    const steps = definition.steps.map<DriveStep>((step, index) => ({
      element: step.target
        ? () => resolvePreferredTargetElement(step.target ?? '') ?? document.body
        : undefined,
      popover: {
        title: step.popover.title,
        description: step.popover.description,
        side: step.popover.side,
        align: step.popover.align,
        onPopoverRender: (popover) => {
          polishPopoverControls(popover, { isLastStep: index === definition.steps.length - 1 })

          const helpMeta = definition.steps[index]?.help
          if (!helpMeta?.wikiSlug) return

          createLearnMoreButton({
            popover,
            routeId,
            wikiSlug: helpMeta.wikiSlug,
            label: helpMeta.label ?? 'Learn more',
            openMode: helpMeta.openMode,
          })
        },
      },
      onHighlighted: () => {
        const stepId = definition.steps[index]?.id
        const helpMeta = definition.steps[index]?.help

        emitActiveHelpStep({
          routeId,
          procedureId: definition.id,
          stepId: stepId ?? `step-${index + 1}`,
          wikiSlug: helpMeta?.wikiSlug,
          openMode: helpMeta?.openMode ?? 'new-tab',
          label: helpMeta?.label ?? 'Learn more',
        })

        handlers.onHighlighted(index)
      },
    }))

    if (this.activeProcedureId === definition.id && this.instance) {
      this.instance.setSteps(steps)
      return
    }

    this.destroy()

    this.instance = driver({
      steps,
      popoverClass: 'sentinel-help-popover',
      showProgress: true,
      progressText: 'Step {{current}} of {{total}}',
      prevBtnText: PREVIOUS_ICON_HTML,
      nextBtnText: NEXT_ICON_HTML,
      doneBtnText: DONE_ICON_HTML,
      allowKeyboardControl: true,
      allowClose: true,
      smoothScroll: true,
      onNextClick: () => {
        void handlers.onNext()
      },
      onPrevClick: () => {
        void handlers.onPrev()
      },
      onCloseClick: () => {
        void handlers.onClose()
      },
      onDestroyed: () => {
        emitActiveHelpStep(null)
        this.instance = null
        this.activeProcedureId = null
      },
    })

    this.activeProcedureId = definition.id
  }

  drive(startIndex: number): void {
    this.instance?.drive(startIndex)
  }

  moveTo(index: number): void {
    this.instance?.moveTo(index)
  }

  destroy(): void {
    if (this.instance) {
      this.instance.destroy()
    }

    emitActiveHelpStep(null)
    this.instance = null
    this.activeProcedureId = null
  }

  isActive(): boolean {
    return this.instance?.isActive() ?? false
  }
}
