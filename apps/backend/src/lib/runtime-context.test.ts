import type { Request } from 'express'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getRequestClientIp,
  resetRuntimeContextCachesForTests,
  shouldEnforceMainSystemLoginSelection,
} from './runtime-context.js'

function createRequest(input: {
  ip?: string
  remoteAddress?: string
  forwardedFor?: string
}): Request {
  return {
    headers: input.forwardedFor ? { 'x-forwarded-for': input.forwardedFor } : {},
    ip: input.ip,
    socket: {
      remoteAddress: input.remoteAddress,
    },
    connection: {
      remoteAddress: input.remoteAddress,
    },
  } as Request
}

describe('runtime-context', () => {
  afterEach(() => {
    process.env.NODE_ENV = 'test'
    delete process.env.SENTINEL_ENFORCE_MAIN_SYSTEM_LOGIN
    resetRuntimeContextCachesForTests()
  })

  it('extracts client IP from x-forwarded-for when present', () => {
    const request = createRequest({
      ip: '127.0.0.1',
      forwardedFor: '100.80.250.121, 172.18.0.2',
    })

    expect(getRequestClientIp(request)).toBe('100.80.250.121')
  })

  it('enforces deployment-laptop selection for local production requests', () => {
    process.env.NODE_ENV = 'production'

    const request = createRequest({
      ip: '127.0.0.1',
    })

    expect(shouldEnforceMainSystemLoginSelection(request)).toBe(true)
  })

  it('does not enforce deployment-laptop selection for remote production requests', () => {
    process.env.NODE_ENV = 'production'

    const request = createRequest({
      ip: '100.64.10.25',
    })

    expect(shouldEnforceMainSystemLoginSelection(request)).toBe(false)
  })

  it('does not enforce deployment-laptop selection in development', () => {
    process.env.NODE_ENV = 'development'

    const request = createRequest({
      ip: '127.0.0.1',
    })

    expect(shouldEnforceMainSystemLoginSelection(request)).toBe(false)
  })
})
