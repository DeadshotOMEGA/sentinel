import { describe, expect, it } from 'vitest'
import { resolveFallbackTargets } from './orchestrator'

describe('resolveFallbackTargets', () => {
  it('uses local fallback only when env mode is local and context is wiki', () => {
    expect(resolveFallbackTargets('local', 'wiki')).toEqual(['local'])
  })

  it('prefers tour then local when context fallback mode is tour', () => {
    expect(resolveFallbackTargets('hybrid', 'tour')).toEqual(['tour', 'local'])
  })

  it('keeps local fallback path in wiki mode failures', () => {
    expect(resolveFallbackTargets('wiki', 'wiki')).toEqual(['local'])
  })
})
