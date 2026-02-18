'use client'

import { clearProcedureProgress, loadProcedureProgress, saveProcedureProgress } from './persistence'
import { findReachableIndex, isProcedureEligible, resolveNextStepIndex } from './runtime'
import type {
  ProcedureContext,
  ProcedureController,
  ProcedureDefinition,
  ProcedureDriver,
  ProcedureEvent,
  ProcedureState,
} from './types'

interface CreateProcedureControllerOptions {
  procedures: ProcedureDefinition[]
  context: ProcedureContext
  driver: ProcedureDriver
  onEvent?: (event: ProcedureEvent) => void
}

function hasTarget(selector: string): boolean {
  if (typeof document === 'undefined') return true
  return document.querySelector(selector) !== null
}

export function createProcedureController(
  options: CreateProcedureControllerOptions
): ProcedureController {
  const byId = new Map(options.procedures.map((procedure) => [procedure.id, procedure]))

  let state: ProcedureState = {
    procedureId: null,
    stepIndex: -1,
    status: 'idle',
  }

  function emit(event: ProcedureEvent): void {
    options.onEvent?.(event)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new window.CustomEvent('sentinel:procedure-event', {
          detail: event,
        })
      )
    }
  }

  async function showStep(definition: ProcedureDefinition, requestedIndex: number): Promise<void> {
    const reachableIndex = findReachableIndex(definition, requestedIndex, 1, hasTarget)

    if (reachableIndex >= definition.steps.length) {
      await complete()
      return
    }

    if (reachableIndex !== requestedIndex) {
      emit({
        type: 'procedure_error',
        procedureId: definition.id,
        version: definition.version,
        memberId: options.context.memberId,
        route: options.context.route,
        stepIndex: requestedIndex,
        message: 'Skipped step because target element was not found',
      })
    }

    state = {
      procedureId: definition.id,
      stepIndex: reachableIndex,
      status: 'in_progress',
    }

    saveProcedureProgress({
      memberId: options.context.memberId,
      procedureId: definition.id,
      version: definition.version,
      route: definition.route,
      status: 'in_progress',
      stepIndex: reachableIndex,
    })

    if (options.driver.isActive()) {
      options.driver.moveTo(reachableIndex)
    } else {
      options.driver.drive(reachableIndex)
    }

    const currentStep = definition.steps[reachableIndex]
    await currentStep?.before?.(options.context)

    emit({
      type: 'step_viewed',
      procedureId: definition.id,
      version: definition.version,
      stepId: currentStep?.id,
      stepIndex: reachableIndex,
      memberId: options.context.memberId,
      route: options.context.route,
    })
  }

  async function start(procedureId: string): Promise<boolean> {
    const definition = byId.get(procedureId)
    if (!definition) {
      return false
    }

    if (!isProcedureEligible(definition, options.context)) {
      return false
    }

    await options.driver.mount(definition, {
      onNext: next,
      onPrev: back,
      onClose: abort,
      onHighlighted: (index) => {
        state = { ...state, stepIndex: index }
      },
    })

    emit({
      type: 'procedure_started',
      procedureId: definition.id,
      version: definition.version,
      memberId: options.context.memberId,
      route: options.context.route,
    })

    await showStep(definition, 0)
    return true
  }

  async function resume(procedureId: string): Promise<boolean> {
    const definition = byId.get(procedureId)
    if (!definition) {
      return false
    }

    if (!isProcedureEligible(definition, options.context)) {
      return false
    }

    const saved = loadProcedureProgress(options.context.memberId, definition.id, definition.version)
    const resumeIndex = saved?.status === 'in_progress' ? saved.stepIndex : 0

    await options.driver.mount(definition, {
      onNext: next,
      onPrev: back,
      onClose: abort,
      onHighlighted: (index) => {
        state = { ...state, stepIndex: index }
      },
    })

    emit({
      type: 'procedure_started',
      procedureId: definition.id,
      version: definition.version,
      memberId: options.context.memberId,
      route: options.context.route,
      message: saved?.status === 'in_progress' ? 'Resumed from saved progress' : undefined,
    })

    await showStep(definition, Math.max(0, resumeIndex))
    return true
  }

  async function restart(procedureId: string): Promise<boolean> {
    const definition = byId.get(procedureId)
    if (!definition) {
      return false
    }

    clearProcedureProgress(options.context.memberId, definition.id, definition.version)
    return start(procedureId)
  }

  async function next(): Promise<void> {
    if (!state.procedureId || state.stepIndex < 0) return

    const definition = byId.get(state.procedureId)
    if (!definition) return

    const currentStep = definition.steps[state.stepIndex]
    await currentStep?.after?.(options.context)

    const nextIndex = resolveNextStepIndex(definition, state.stepIndex, options.context)
    await showStep(definition, nextIndex)
  }

  async function back(): Promise<void> {
    if (!state.procedureId || state.stepIndex < 0) return

    const definition = byId.get(state.procedureId)
    if (!definition) return

    const previousIndex = findReachableIndex(definition, state.stepIndex - 1, -1, hasTarget)
    if (previousIndex < 0) {
      return
    }

    state = {
      procedureId: definition.id,
      stepIndex: previousIndex,
      status: 'in_progress',
    }

    saveProcedureProgress({
      memberId: options.context.memberId,
      procedureId: definition.id,
      version: definition.version,
      route: definition.route,
      status: 'in_progress',
      stepIndex: previousIndex,
    })

    options.driver.moveTo(previousIndex)
  }

  async function complete(): Promise<void> {
    if (!state.procedureId) return

    const definition = byId.get(state.procedureId)
    if (!definition) return

    state = {
      procedureId: definition.id,
      stepIndex: definition.steps.length - 1,
      status: 'completed',
    }

    saveProcedureProgress({
      memberId: options.context.memberId,
      procedureId: definition.id,
      version: definition.version,
      route: definition.route,
      status: 'completed',
      stepIndex: Math.max(0, definition.steps.length - 1),
    })

    emit({
      type: 'procedure_completed',
      procedureId: definition.id,
      version: definition.version,
      memberId: options.context.memberId,
      route: options.context.route,
    })

    options.driver.destroy()
  }

  async function skip(): Promise<void> {
    if (!state.procedureId) return

    const definition = byId.get(state.procedureId)
    if (!definition) return

    state = {
      procedureId: definition.id,
      stepIndex: state.stepIndex,
      status: 'skipped',
    }

    saveProcedureProgress({
      memberId: options.context.memberId,
      procedureId: definition.id,
      version: definition.version,
      route: definition.route,
      status: 'skipped',
      stepIndex: Math.max(0, state.stepIndex),
    })

    emit({
      type: 'procedure_skipped',
      procedureId: definition.id,
      version: definition.version,
      memberId: options.context.memberId,
      route: options.context.route,
    })

    options.driver.destroy()
  }

  async function abort(): Promise<void> {
    if (!state.procedureId) return

    const definition = byId.get(state.procedureId)
    if (!definition) return

    state = {
      procedureId: definition.id,
      stepIndex: state.stepIndex,
      status: 'aborted',
    }

    saveProcedureProgress({
      memberId: options.context.memberId,
      procedureId: definition.id,
      version: definition.version,
      route: definition.route,
      status: 'aborted',
      stepIndex: Math.max(0, state.stepIndex),
    })

    emit({
      type: 'procedure_aborted',
      procedureId: definition.id,
      version: definition.version,
      memberId: options.context.memberId,
      route: options.context.route,
    })

    options.driver.destroy()
  }

  function getState(): ProcedureState {
    return state
  }

  function dispose(): void {
    options.driver.destroy()
    state = {
      procedureId: null,
      stepIndex: -1,
      status: 'idle',
    }
  }

  return {
    start,
    resume,
    restart,
    next,
    back,
    skip,
    complete,
    abort,
    getState,
    dispose,
  }
}
