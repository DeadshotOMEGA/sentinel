'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { HostHotspotRecoveryStatus } from '@sentinel/contracts'
import { CheckCircle2, Clock3, RotateCcw, WifiOff } from 'lucide-react'
import { AppBadge } from '@/components/ui/AppBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSystemStatus } from '@/hooks/use-system-status'
import { websocketManager } from '@/lib/websocket'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import {
  formatRecoveryTime,
  getAutomatedRecoveryStatusRefetchIntervalMs,
  getRecoveryEstimateSeconds,
  getRecoveryProgressPercent,
  getRecoveryRemainingSeconds,
  getRecoveryRequestKey,
  isAutomatedHotspotRecoveryActive,
  isAutomatedHotspotRecoveryComplete,
} from './automated-hotspot-recovery-notice.logic'

const REFRESH_EVENT_DELAY_MS = 2_000
const REFRESH_STORAGE_PREFIX = 'sentinel-hotspot-refresh:'

type SystemRefreshPayload = {
  reason: 'host_hotspot_recovered'
  requestId: string | null
  message: string
  timestamp: string
}

function isSystemRefreshPayload(value: unknown): value is SystemRefreshPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>
  return (
    payload.reason === 'host_hotspot_recovered' &&
    (typeof payload.requestId === 'string' || payload.requestId === null) &&
    typeof payload.message === 'string' &&
    typeof payload.timestamp === 'string'
  )
}

function hasRefreshRun(key: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return window.sessionStorage.getItem(`${REFRESH_STORAGE_PREFIX}${key}`) === 'done'
  } catch {
    return false
  }
}

function markRefreshRun(key: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(`${REFRESH_STORAGE_PREFIX}${key}`, 'done')
  } catch {
    // Best effort only. Reload protection is nice to have, not required for recovery.
  }
}

export function AutomatedHotspotRecoveryNotice() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const queryClient = useQueryClient()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [refreshPayload, setRefreshPayload] = useState<SystemRefreshPayload | null>(null)
  const systemStatusQuery = useSystemStatus({
    enabled: isAuthenticated,
    refetchIntervalMs: getAutomatedRecoveryStatusRefetchIntervalMs(),
  })
  const systemStatus = systemStatusQuery.data ?? null
  const recoveryStatus = systemStatus?.network.hostHotspotRecovery ?? null
  const active = isAutomatedHotspotRecoveryActive(systemStatus)
  const complete = isAutomatedHotspotRecoveryComplete(systemStatus)
  const requestKey = getRecoveryRequestKey(recoveryStatus)
  const showRecovered =
    refreshPayload !== null || (complete && requestKey !== null && !hasRefreshRun(requestKey))
  const open = active || showRecovered
  const estimateSeconds = getRecoveryEstimateSeconds(recoveryStatus)
  const remainingSeconds = getRecoveryRemainingSeconds(recoveryStatus, nowMs)
  const progressPercent =
    refreshPayload || complete ? 100 : getRecoveryProgressPercent(recoveryStatus, nowMs)

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined
    }

    websocketManager.connect()

    const handleRefreshRequired = (payload: unknown) => {
      if (!isSystemRefreshPayload(payload)) {
        return
      }

      const refreshKey = payload.requestId ?? payload.timestamp
      if (hasRefreshRun(refreshKey)) {
        void queryClient.invalidateQueries({ queryKey: ['system-status'] })
        return
      }

      setRefreshPayload(payload)
      void queryClient.invalidateQueries({ queryKey: ['system-status'] })
    }

    websocketManager.on('system:refresh-required', handleRefreshRequired)

    return () => {
      if (websocketManager.hasSocket) {
        websocketManager.off('system:refresh-required', handleRefreshRequired)
      }
    }
  }, [isAuthenticated, queryClient])

  useEffect(() => {
    if (!active) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1_000)

    return () => window.clearInterval(intervalId)
  }, [active])

  useEffect(() => {
    if (!complete || !requestKey) {
      return undefined
    }

    if (hasRefreshRun(requestKey)) {
      return undefined
    }

    markRefreshRun(requestKey)
    void queryClient.invalidateQueries({ queryKey: ['system-status'] })

    const timeoutId = window.setTimeout(() => {
      window.location.reload()
    }, REFRESH_EVENT_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [complete, queryClient, recoveryStatus?.requestId, requestKey])

  useEffect(() => {
    if (!refreshPayload) {
      return undefined
    }

    const refreshKey = refreshPayload.requestId ?? refreshPayload.timestamp
    if (hasRefreshRun(refreshKey)) {
      return undefined
    }

    markRefreshRun(refreshKey)
    const timeoutId = window.setTimeout(() => {
      window.location.reload()
    }, REFRESH_EVENT_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [refreshPayload])

  if (!isAuthenticated) {
    return null
  }

  return (
    <Dialog open={open} dismissible={false}>
      <DialogContent
        size="md"
        showCloseButton={false}
        className={cn(
          'border-l-4 p-(--space-5) shadow-[var(--shadow-3)]',
          showRecovered ? 'border-success' : 'border-warning'
        )}
      >
        <DialogHeader className="mb-(--space-4)">
          <DialogTitle className="flex items-center gap-(--space-2)">
            {showRecovered ? (
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success" />
            ) : (
              <WifiOff aria-hidden="true" className="h-5 w-5 text-warning" />
            )}
            {showRecovered ? 'Hotspot connection restored' : 'Repairing hotspot connection'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-(--space-4)" role="status" aria-live="polite">
          <div
            className={cn(
              'rounded-box border p-(--space-4)',
              showRecovered
                ? 'border-success/40 bg-success-fadded text-success-fadded-content'
                : 'border-warning/45 bg-warning-fadded text-warning-fadded-content'
            )}
          >
            <div className="flex items-start gap-(--space-3)">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-box bg-base-100/80 shadow-[var(--shadow-1)]">
                {showRecovered ? (
                  <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <LoadingSpinner size="sm" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-(--space-2)">
                  <p className="font-bold">
                    {showRecovered
                      ? 'Sentinel is back online.'
                      : formatStageLabel(recoveryStatus?.stage)}
                  </p>
                  <AppBadge
                    status={showRecovered ? 'success' : 'warning'}
                    size="sm"
                    pulse={!showRecovered}
                  >
                    {showRecovered ? 'Restored' : 'Automatic'}
                  </AppBadge>
                </div>
                <p className="mt-(--space-1) text-sm leading-relaxed">
                  {showRecovered
                    ? 'Connected Sentinel pages are refreshing so everyone sees the restored state.'
                    : 'The host is repairing the USB Wi-Fi AP dongle. The hotspot may disappear briefly while it resets.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-box border border-base-300 bg-base-200 p-(--space-4)">
            <div className="flex flex-wrap items-center justify-between gap-(--space-3)">
              <div className="flex items-center gap-(--space-2)">
                <Clock3 aria-hidden="true" className="h-4 w-4 text-base-content/60" />
                <span className="text-sm font-semibold">
                  {showRecovered
                    ? 'Refreshing this page now'
                    : `${formatRecoveryTime(remainingSeconds)} remaining`}
                </span>
              </div>
              <span className="font-mono text-xs text-base-content/65">
                Historical average: {formatRecoveryTime(estimateSeconds)}
              </span>
            </div>
            <progress
              className={cn(
                'progress mt-(--space-3) h-2 w-full',
                showRecovered ? 'progress-success' : 'progress-warning'
              )}
              value={progressPercent}
              max={100}
              aria-label="Automated hotspot recovery progress"
            />
            <p className="mt-(--space-2) text-xs leading-relaxed text-base-content/70">
              {recoveryStatus?.message ??
                refreshPayload?.message ??
                'Waiting for host recovery status.'}
            </p>
          </div>

          {!showRecovered && (
            <div className="flex items-start gap-(--space-2) text-sm text-base-content/70">
              <RotateCcw aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Leave this page open. Remote pages will be told to refresh automatically once
                Sentinel confirms the hotspot is visible again.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatStageLabel(stage: HostHotspotRecoveryStatus['stage'] | undefined): string {
  switch (stage) {
    case 'request_queued':
      return 'Recovery is queued'
    case 'processing_request':
      return 'Starting recovery'
    case 'moving_internet_wifi':
      return 'Moving internet Wi-Fi'
    case 'ensuring_profile':
      return 'Checking hotspot profile'
    case 'stopping_hotspot':
      return 'Stopping hotspot'
    case 'resetting_driver':
      return 'Resetting Wi-Fi driver'
    case 'resetting_usb':
      return 'Resetting USB dongle'
    case 'waiting_for_adapter':
      return 'Waiting for adapter'
    case 'starting_hotspot':
      return 'Starting hotspot'
    case 'verifying_visibility':
      return 'Checking hotspot visibility'
    default:
      return 'Automated recovery is running'
  }
}
