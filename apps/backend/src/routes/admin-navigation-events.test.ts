import { createExpressEndpoints } from '@ts-rest/express'
import { adminNavigationContract } from '@sentinel/contracts'
import express from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { recordAdminNavigationEvent } = vi.hoisted(() => ({
  recordAdminNavigationEvent: vi.fn(),
}))

vi.mock('../lib/metrics.js', () => ({
  recordAdminNavigationEvent,
}))

async function createTestApp(accountLevel: number) {
  const { adminNavigationEventsRouter } = await import('./admin-navigation-events.js')
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    Object.assign(req, {
      member: {
        id: 'member-1',
        accountLevel,
      },
    })
    next()
  })
  createExpressEndpoints(adminNavigationContract, adminNavigationEventsRouter, app)
  return app
}

describe('adminNavigationEventsRouter', () => {
  afterEach(() => {
    recordAdminNavigationEvent.mockReset()
    vi.resetModules()
  })

  it('records aggregate admin navigation metrics for admin users', async () => {
    const app = await createTestApp(5)
    const response = await request(app).post('/api/admin-navigation-events').send({
      eventType: 'quick_action',
      routeId: 'admin-home',
      targetRouteId: 'updates',
      actionId: 'open-updates',
      sourceType: 'quick-action',
    })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ success: true })
    expect(recordAdminNavigationEvent).toHaveBeenCalledWith({
      eventType: 'quick_action',
      routeId: 'admin-home',
      targetRouteId: 'updates',
      actionId: 'open-updates',
      sourceType: 'quick-action',
      elapsedMs: undefined,
    })
  })

  it('requires admin access', async () => {
    const app = await createTestApp(1)
    const response = await request(app).post('/api/admin-navigation-events').send({
      eventType: 'page_view',
      routeId: 'admin-home',
    })

    expect(response.status).toBe(403)
    expect(recordAdminNavigationEvent).not.toHaveBeenCalled()
  })
})
