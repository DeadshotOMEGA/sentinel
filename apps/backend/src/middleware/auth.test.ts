import type { NextFunction, Request, Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KIOSK_DEVICE_COOKIE_NAME } from '../lib/kiosk-device-auth.js'

const findByTokenMock = vi.fn()

vi.mock('../lib/database.js', () => ({
  getPrismaClient: vi.fn(() => ({})),
}))

vi.mock('../repositories/session-repository.js', () => ({
  SessionRepository: class {
    findByToken = findByTokenMock
  },
}))

const { requireAuth } = await import('./auth.js')

function createResponse() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }

  return response as unknown as Response & {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
  }
}

describe('requireAuth', () => {
  const originalDeviceApiKey = process.env.SENTINEL_KIOSK_DEVICE_API_KEY
  const originalDeviceName = process.env.SENTINEL_KIOSK_DEVICE_NAME

  afterEach(() => {
    vi.restoreAllMocks()
    findByTokenMock.mockReset()

    if (originalDeviceApiKey === undefined) {
      delete process.env.SENTINEL_KIOSK_DEVICE_API_KEY
    } else {
      process.env.SENTINEL_KIOSK_DEVICE_API_KEY = originalDeviceApiKey
    }

    if (originalDeviceName === undefined) {
      delete process.env.SENTINEL_KIOSK_DEVICE_NAME
    } else {
      process.env.SENTINEL_KIOSK_DEVICE_NAME = originalDeviceName
    }
  })

  it('authenticates requests with the kiosk device cookie', async () => {
    process.env.SENTINEL_KIOSK_DEVICE_API_KEY = 'sk_kiosk_cookie_auth'
    process.env.SENTINEL_KIOSK_DEVICE_NAME = 'Front entrance kiosk'

    const req = {
      cookies: {
        [KIOSK_DEVICE_COOKIE_NAME]: 'sk_kiosk_cookie_auth',
      },
      headers: {},
      path: '/system-status',
      method: 'GET',
    } as unknown as Request
    const res = createResponse()
    const next = vi.fn<NextFunction>()

    await requireAuth(true)(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.apiKey).toEqual({
      id: 'kiosk-device',
      name: 'Front entrance kiosk',
      scopes: ['kiosk:access', 'system-status:read'],
    })
    expect(req.member).toBeUndefined()
    expect(findByTokenMock).not.toHaveBeenCalled()
  })

  it('falls back to the kiosk device cookie when a session token is invalid', async () => {
    process.env.SENTINEL_KIOSK_DEVICE_API_KEY = 'sk_kiosk_cookie_auth'

    findByTokenMock.mockResolvedValue(null)

    const req = {
      cookies: {
        'sentinel-session': 'expired-session-token',
        [KIOSK_DEVICE_COOKIE_NAME]: 'sk_kiosk_cookie_auth',
      },
      headers: {},
      path: '/system-status',
      method: 'GET',
    } as unknown as Request
    const res = createResponse()
    const next = vi.fn<NextFunction>()

    await requireAuth(true)(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.apiKey?.id).toBe('kiosk-device')
    expect(req.member).toBeUndefined()
  })
})
