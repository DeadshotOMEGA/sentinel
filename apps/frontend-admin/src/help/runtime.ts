import type { ProcedureContext, ProcedureDefinition } from './types'

const ADMIN_LEVEL = 5

export function isAdminContext(context: ProcedureContext): boolean {
  return context.accountLevel >= ADMIN_LEVEL
}

export function isProcedureEligible(
  definition: ProcedureDefinition,
  context: ProcedureContext
): boolean {
  if (definition.route !== context.route) return false

  if (definition.personas.includes('admin') && !isAdminContext(context)) {
    return false
  }

  if (!definition.guards || definition.guards.length === 0) {
    return true
  }

  return definition.guards.every((guard) => guard(context))
}

export function resolveNextStepIndex(
  definition: ProcedureDefinition,
  currentIndex: number,
  context: ProcedureContext
): number {
  const currentStep = definition.steps[currentIndex]
  if (!currentStep) return definition.steps.length

  if (currentStep.next && currentStep.next.length > 0) {
    const selected = currentStep.next.find((transition) =>
      transition.when ? transition.when(context) : true
    )

    if (selected) {
      const toIndex = definition.steps.findIndex((step) => step.id === selected.to)
      if (toIndex !== -1) return toIndex
    }
  }

  return currentIndex + 1
}

export function findReachableIndex(
  definition: ProcedureDefinition,
  startIndex: number,
  direction: 1 | -1,
  hasTarget: (selector: string) => boolean
): number {
  let index = startIndex

  while (index >= 0 && index < definition.steps.length) {
    const step = definition.steps[index]
    if (!step?.target || hasTarget(step.target)) {
      return index
    }

    index += direction
  }

  return index
}
