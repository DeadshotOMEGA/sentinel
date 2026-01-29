'use client'

import { useEffect, useState } from 'react'

type BackendStatus = 'connected' | 'disconnected' | 'checking'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const POLL_INTERVAL = 30_000 // 30 seconds

export function useBackendHealth() {
  const [status, setStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()

    async function checkHealth() {
      try {
        const res = await fetch(`${API_URL}/health`, {
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
