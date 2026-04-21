import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ADMIN_NAV_ROUTES, isAdminNavPath } from './admin-routes'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(currentDir, '../app')

describe('ADMIN_NAV_ROUTES', () => {
  it('matches known admin paths', () => {
    expect(isAdminNavPath('/settings')).toBe(true)
    expect(isAdminNavPath('/logs')).toBe(true)
    expect(isAdminNavPath('/dashboard')).toBe(false)
  })

  it('only includes routes that ship a page entrypoint', () => {
    for (const route of ADMIN_NAV_ROUTES) {
      const routeSegment = route.href.slice(1)
      const pagePath = path.join(appDir, routeSegment, 'page.tsx')

      expect(existsSync(pagePath)).toBe(true)
    }
  })
})
