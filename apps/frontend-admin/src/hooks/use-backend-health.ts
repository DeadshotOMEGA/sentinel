'use client'

import { useEffect, useState } from 'react'

type BackendStatus = 'connected' | 'disconnected' | 'checking'

const POLL_INTERVAL = 30_000 // 30 seconds

export function useBackendHealth() {
  const [status, setStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    // eslint-disable-next-line no-undef -- AbortController is a browser global
    const controller = new AbortController()

    async function checkHealth() {
      try {
        const res = await fetch('/healthz', {
          signal: controller.signal,
          cache: 'no-store',
        })
        setStatus(res.ok ? 'connected' : 'disconnected')
      } catch {
        if (!controller.signal.aborted) {
          setStatus('disconnected')
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

  return status
}
