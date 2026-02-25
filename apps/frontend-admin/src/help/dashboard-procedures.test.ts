import { describe, expect, it } from 'vitest'
import { dashboardProcedureDefinitions } from './dashboard-procedures'

describe('dashboardProcedureDefinitions help metadata', () => {
  it('contains wiki slugs for all steps', () => {
    for (const definition of dashboardProcedureDefinitions) {
      for (const step of definition.steps) {
        expect(step.help?.wikiSlug, `${definition.id}:${step.id}`).toBeTruthy()
      }
    }
  })
})
