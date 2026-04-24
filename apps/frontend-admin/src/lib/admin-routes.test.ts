import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  ADMIN_NAV_ROUTES,
  ADMIN_QUICK_ACTIONS,
  ADMIN_SIDEBAR_GROUP_LIMIT,
  ADMIN_SIDEBAR_LINK_LIMIT_PER_GROUP,
  getAdminCapabilities,
  getAdminRouteGroups,
  getAdminSidebarRoutes,
  isAdminNavPath,
  resolveLegacyAdminPath,
} from './admin-routes'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(currentDir, '../app')

describe('ADMIN_NAV_ROUTES', () => {
  it('matches canonical admin paths only', () => {
    expect(isAdminNavPath('/admin')).toBe(true)
    expect(isAdminNavPath('/admin/logs')).toBe(true)
    expect(isAdminNavPath('/settings')).toBe(false)
    expect(isAdminNavPath('/dashboard')).toBe(false)
  })

  it('only includes routes that ship a page entrypoint', () => {
    for (const route of ADMIN_NAV_ROUTES) {
      const routeSegment = route.href.slice(1)
      const pagePath = path.join(appDir, routeSegment, 'page.tsx')

      expect(existsSync(pagePath)).toBe(true)
    }
  })

  it('keeps sidebar governance under the group and link limits', () => {
    const sidebarRoutes = getAdminSidebarRoutes(5)
    const groups = getAdminRouteGroups(sidebarRoutes)

    expect(groups.length).toBeLessThanOrEqual(ADMIN_SIDEBAR_GROUP_LIMIT)

    for (const group of groups) {
      const routesInGroup = sidebarRoutes.filter((route) => route.group === group)
      expect(routesInGroup.length).toBeLessThanOrEqual(ADMIN_SIDEBAR_LINK_LIMIT_PER_GROUP)
    }
  })

  it('provides command-palette-ready metadata for every route and action', () => {
    for (const route of ADMIN_NAV_ROUTES) {
      expect(route.aliases.length).toBeGreaterThan(0)
      expect(route.keywords.length).toBeGreaterThan(0)
      expect(route.searchWeight).toBeGreaterThan(0)
      expect(route.tier).toBeGreaterThanOrEqual(1)
    }

    for (const action of ADMIN_QUICK_ACTIONS) {
      expect(action.requiredCapabilities.length).toBeGreaterThan(0)
      expect(action.href.startsWith('/admin')).toBe(true)
    }
  })

  it('maps current account levels to admin capabilities', () => {
    expect(getAdminCapabilities(1)).toEqual([])
    expect(getAdminCapabilities(5)).toContain('admin:view')
    expect(getAdminCapabilities(5)).toContain('updates:manage')
    expect(getAdminCapabilities(6)).toContain('database:view')
  })

  it('preserves legacy route intent', () => {
    expect(resolveLegacyAdminPath('/badges', new URLSearchParams('page=2'))).toBe(
      '/admin/badges?page=2'
    )
    expect(resolveLegacyAdminPath('/database', new URLSearchParams('table=AuditLog'))).toBe(
      '/admin/database?table=AuditLog'
    )
    expect(resolveLegacyAdminPath('/logs', new URLSearchParams())).toBe('/admin/logs')
    expect(resolveLegacyAdminPath('/settings', new URLSearchParams('tab=updates&trace=open'))).toBe(
      '/admin/updates?trace=open'
    )
    expect(resolveLegacyAdminPath('/settings', new URLSearchParams('tab=network'))).toBe(
      '/admin/network'
    )
    expect(resolveLegacyAdminPath('/settings', new URLSearchParams('tab=tags'))).toBe(
      '/admin/config?tab=tags'
    )
  })
})
