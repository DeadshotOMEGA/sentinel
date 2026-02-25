'use client'

import type { Driver, DriveStep, PopoverDOM } from 'driver.js'
import { driver } from 'driver.js'
import type { ProcedureDefinition, ProcedureDriver, ProcedureDriverHandlers } from './types'
import { emitActiveHelpStep } from './help-events'
import { openHelpTarget } from './orchestrator'
import { HELP_START_HERE_ROUTE_ID, resolveRouteIdFromPathname } from './help-registry'

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
  button.textContent = params.label

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
      element: step.target,
      popover: {
        title: step.popover.title,
        description: step.popover.description,
        side: step.popover.side,
        align: step.popover.align,
        onPopoverRender: (popover) => {
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
      showProgress: true,
      progressText: 'Step {{current}} of {{total}}',
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
