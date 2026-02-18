import { describe, expect, it } from 'vitest'
import { findReachableIndex, isProcedureEligible, resolveNextStepIndex } from './runtime'
import type { ProcedureContext, ProcedureDefinition } from './types'

const baseContext: ProcedureContext = {
  route: '/dashboard',
  accountLevel: 5,
  memberId: 'm-1',
  featureFlags: {},
}

const definition: ProcedureDefinition = {
  id: 'dashboard.admin.orientation.v1',
  version: 1,
  title: 'Orientation',
  summary: 'Summary',
  route: '/dashboard',
  personas: ['admin'],
  guards: [(context) => context.accountLevel >= 5],
  steps: [
    {
      id: 'a',
      target: '[data-help-id="a"]',
      popover: { title: 'A', description: 'A' },
      next: [{ to: 'c', when: (context) => context.featureFlags.jumpToC === true }],
    },
    {
      id: 'b',
      target: '[data-help-id="b"]',
      popover: { title: 'B', description: 'B' },
    },
    {
      id: 'c',
      popover: { title: 'C', description: 'C' },
    },
  ],
}

describe('isProcedureEligible', () => {
  it('accepts eligible admin on matching route', () => {
    expect(isProcedureEligible(definition, baseContext)).toBe(true)
  })

  it('rejects non-admin account level', () => {
    expect(isProcedureEligible(definition, { ...baseContext, accountLevel: 3 })).toBe(false)
  })

  it('rejects mismatched route', () => {
    expect(isProcedureEligible(definition, { ...baseContext, route: '/members' })).toBe(false)
  })
})

describe('resolveNextStepIndex', () => {
  it('follows transition when condition is true', () => {
    const next = resolveNextStepIndex(definition, 0, {
      ...baseContext,
      featureFlags: { jumpToC: true },
    })

    expect(next).toBe(2)
  })

  it('falls back to next sequential step', () => {
    const next = resolveNextStepIndex(definition, 0, baseContext)
    expect(next).toBe(1)
  })
})

describe('findReachableIndex', () => {
  it('skips missing target selectors', () => {
    const index = findReachableIndex(definition, 0, 1, (selector) => selector.includes('b'))
    expect(index).toBe(1)
  })

  it('returns out-of-range index when no reachable step exists', () => {
    const index = findReachableIndex(definition, 0, 1, () => false)
    expect(index).toBe(2)
  })
})
