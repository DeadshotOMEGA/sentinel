import { describe, expect, it } from 'vitest'
import { createProcedureController } from './controller'
import type { ProcedureContext, ProcedureDefinition, ProcedureDriver } from './types'

const baseContext: ProcedureContext = {
  route: '/dashboard',
  accountLevel: 5,
  memberId: 'member-1',
  featureFlags: {},
}

function createDriver(events: string[]): ProcedureDriver {
  let active = false

  return {
    async mount() {
      events.push('mount')
    },
    drive(index: number) {
      active = true
      events.push(`drive:${index}`)
    },
    moveTo(index: number) {
      events.push(`moveTo:${index}`)
    },
    destroy() {
      active = false
      events.push('destroy')
    },
    isActive() {
      return active
    },
  }
}

describe('createProcedureController', () => {
  it('runs step setup before driving to the step', async () => {
    const events: string[] = []
    const definition: ProcedureDefinition = {
      id: 'dashboard.admin.orientation.test',
      version: 1,
      title: 'Orientation',
      summary: 'Summary',
      route: '/dashboard',
      personas: ['admin'],
      steps: [
        {
          id: 'recent-activity',
          target: '[data-help-id="dashboard.recent-activity"]',
          popover: { title: 'Recent Activity', description: 'Open Recent Activity.' },
          before: () => {
            events.push('before')
          },
        },
      ],
    }

    const controller = createProcedureController({
      procedures: [definition],
      context: baseContext,
      driver: createDriver(events),
    })

    await controller.start(definition.id)

    expect(events).toEqual(['mount', 'before', 'drive:0'])
  })
})
