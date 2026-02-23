'use client'
/* global Response */

import { useEffect, useState } from 'react'

type BackendStatus = 'connected' | 'disconnected' | 'checking'
type BackendServiceStatus = 'healthy' | 'unhealthy'

interface BackendHealthDetails {
  status: BackendServiceStatus
  databaseHealthy: boolean
  environment: string
  version: string
  uptimeSeconds: number
  serviceTimestamp: string
}

interface BackendHealthState {
  status: BackendStatus
  details: BackendHealthDetails | null
  lastCheckedAt: string | null
}

const POLL_INTERVAL = 30_000 // 30 seconds

export function useBackendHealth() {
  const [health, setHealth] = useState<BackendHealthState>({
    status: 'checking',
    details: null,
    lastCheckedAt: null,
  })

  useEffect(() => {
    // eslint-disable-next-line no-undef -- AbortController is a browser global
    const controller = new AbortController()

    async function checkHealth() {
      try {
        const res = await fetch('/healthz', {
          signal: controller.signal,
          cache: 'no-store',
        })
        const details = await parseHealthResponse(res)
        const checkedAt = new Date().toISOString()

        setHealth({
          status: res.ok ? 'connected' : 'disconnected',
          details,
          lastCheckedAt: checkedAt,
        })
      } catch {
        if (!controller.signal.aborted) {
          setHealth((previous) => ({
            ...previous,
            status: 'disconnected',
            lastCheckedAt: new Date().toISOString(),
          }))
        }
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, POLL_INTERVAL)

    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [])

  return health
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function parseHealthResponse(response: Response): Promise<BackendHealthDetails | null> {
  try {
    const payload: unknown = await response.json()

    if (!isRecord(payload)) {
      return null
    }

    const statusValue = payload.status
    const status: BackendServiceStatus = statusValue === 'healthy' ? 'healthy' : 'unhealthy'

    const checks = isRecord(payload.checks) ? payload.checks : null
    const databaseHealthy = checks?.database === true
    const serviceTimestamp =
      typeof checks?.timestamp === 'string' ? checks.timestamp : new Date().toISOString()
    const uptimeSeconds = typeof checks?.uptime === 'number' ? checks.uptime : 0

    return {
      status,
      databaseHealthy,
      environment: typeof payload.environment === 'string' ? payload.environment : 'unknown',
      version: typeof payload.version === 'string' ? payload.version : 'unknown',
      uptimeSeconds,
      serviceTimestamp,
    }
  } catch {
    return null
  }
}
