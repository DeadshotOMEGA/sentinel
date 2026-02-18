'use client'

import type { Driver, DriveStep } from 'driver.js'
import { driver } from 'driver.js'
import type { ProcedureDefinition, ProcedureDriver, ProcedureDriverHandlers } from './types'

export class DriverJsProcedureDriver implements ProcedureDriver {
  private instance: Driver | null = null
  private activeProcedureId: string | null = null

  async mount(definition: ProcedureDefinition, handlers: ProcedureDriverHandlers): Promise<void> {
    const steps = definition.steps.map<DriveStep>((step, index) => ({
      element: step.target,
      popover: {
        title: step.popover.title,
        description: step.popover.description,
        side: step.popover.side,
        align: step.popover.align,
      },
      onHighlighted: () => handlers.onHighlighted(index),
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

    this.instance = null
    this.activeProcedureId = null
  }

  isActive(): boolean {
    return this.instance?.isActive() ?? false
  }
}
