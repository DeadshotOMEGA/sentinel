import { describe, expect, it } from 'vitest'
import {
  getAllRegisteredHelpContexts,
  getHelpContext,
  getRoleScopesForAccountLevel,
  resolveHelpContext,
  resolveRouteIdFromPathname,
  HELP_START_HERE_ROUTE_ID,
} from './help-registry'

describe('resolveRouteIdFromPathname', () => {
  it('resolves direct route paths', () => {
    expect(resolveRouteIdFromPathname('/dashboard')).toBe('dashboard')
    expect(resolveRouteIdFromPathname('/checkins')).toBe('checkins')
  })

  it('resolves nested route paths to stable route id', () => {
    expect(resolveRouteIdFromPathname('/events/123')).toBe('events')
  })

  it('returns null for unmapped routes', () => {
    expect(resolveRouteIdFromPathname('/unknown-route')).toBeNull()
  })
})

describe('getRoleScopesForAccountLevel', () => {
  it('maps account levels to increasing role scopes', () => {
    expect(getRoleScopesForAccountLevel(1)).toEqual(['basic'])
    expect(getRoleScopesForAccountLevel(3)).toEqual(['basic', 'member', 'officer'])
    expect(getRoleScopesForAccountLevel(5)).toEqual([
      'basic',
      'member',
      'officer',
      'manager',
      'admin',
    ])
  })
})

describe('getHelpContext', () => {
  it('returns allowed context by account level', () => {
    const context = getHelpContext('members', 5)
    expect(context?.routeId).toBe('members')
  })

  it('rejects context when account level is below allowed scopes', () => {
    const context = getHelpContext('database', 2)
    expect(context).toBeNull()
  })
})

describe('resolveHelpContext', () => {
  it('falls back to docs start-here on unmapped route', () => {
    const context = resolveHelpContext('/not-a-route', 2)
    expect(context.routeId).toBe(HELP_START_HERE_ROUTE_ID)
  })
})

describe('registry integrity', () => {
  it('uses URL-safe slugs for all registered contexts', () => {
    const slugPattern = /^[a-z0-9][a-z0-9\-/]*$/i

    for (const context of getAllRegisteredHelpContexts()) {
      expect(context.wikiSlug).toMatch(slugPattern)
    }
  })
})
