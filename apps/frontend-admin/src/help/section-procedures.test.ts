import { describe, expect, it } from 'vitest'
import { sectionProcedureDefinitions } from './section-procedures'

describe('sectionProcedureDefinitions help metadata', () => {
  it('contains wiki slugs for all steps', () => {
    for (const definition of sectionProcedureDefinitions) {
      for (const step of definition.steps) {
        expect(step.help?.wikiSlug, `${definition.id}:${step.id}`).toBeTruthy()
      }
    }
  })
})
