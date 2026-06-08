'use client'

/* global HTMLInputElement */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CircleAlert, Keyboard, LogIn, LogOut } from 'lucide-react'
import { LockupOptionsModal } from '@/components/lockup/lockup-options-modal'
import { AppCard, AppCardContent } from '@/components/ui/AppCard'
import { useCheckoutOptions } from '@/hooks/use-lockup'
import { apiClient } from '@/lib/api-client'
import { invalidateDashboardQueries } from '@/lib/dashboard-query-invalidation'
import { TID } from '@/lib/test-ids'
import { cn } from '@/lib/utils'
import {
  createMemberCheckin,
  extractErrorMessage,
  formatTimestamp,
  toMemberName,
  type ScanDirection,
  type ResultTone,
} from '@/components/kiosk/kiosk-domain'

const DASHBOARD_BROW_KIOSK_ID = 'DASHBOARD_BROW'

type DashboardScanMutationResult =
  | {
      type: 'member'
      serial: string
      memberId: string
      memberName: string
      direction: ScanDirection
      timestamp: string
    }
  | {
      type: 'temporary_personnel'
      serial: string
      displayName: string
      assignmentName: string
      direction: ScanDirection
      timestamp: string
    }
  | {
      type: 'visitor'
      serial: string
      message: string
    }
  | {
      type: 'lockup'
      serial: string
      memberId: string
      memberName: string
      badgeId: string
      message: string
    }

interface PendingDashboardLockup {
  memberId: string
  memberName: string
  badgeId: string
  serial: string
}

interface DashboardScanResult {
  tone: ResultTone
  eyebrow: string
  title: string
  message: string
  direction?: ScanDirection
  timestamp?: string
}

const INITIAL_SCAN_RESULT: DashboardScanResult = {
  tone: 'neutral',
  eyebrow: 'Ready',
  title: 'Brow scanner',
  message: 'Awaiting badge scan.',
}

function getResultSurfaceClass(tone: ResultTone): string {
  if (tone === 'success') return 'border-success/30 bg-success-fadded text-base-content'
  if (tone === 'warning') return 'border-warning/35 bg-warning-fadded text-base-content'
  if (tone === 'error') return 'border-error/35 bg-error-fadded text-base-content'
  if (tone === 'info') return 'border-info/30 bg-info-fadded text-base-content'
  return 'border-base-300 bg-base-200/60 text-base-content'
}

function getDirectionIcon(direction: ScanDirection | undefined, tone: ResultTone) {
  if (direction === 'in') return <LogIn className="size-5 shrink-0 text-success" />
  if (direction === 'out') return <LogOut className="size-5 shrink-0 text-error" />
  if (tone === 'error' || tone === 'warning') {
    return <CircleAlert className="size-5 shrink-0 text-current" />
  }
  return <BadgeCheck className="size-5 shrink-0 text-info" />
}

export function DashboardScanPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const queryClient = useQueryClient()
  const [serial, setSerial] = useState('')
  const [result, setResult] = useState<DashboardScanResult>(INITIAL_SCAN_RESULT)
  const [pendingLockup, setPendingLockup] = useState<PendingDashboardLockup | null>(null)
  const [lockupOptionsOpen, setLockupOptionsOpen] = useState(false)
  const { data: checkoutOptions } = useCheckoutOptions(pendingLockup?.memberId ?? '')

  const refocusInput = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)
  }, [])

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ['checkins'] })
    queryClient.invalidateQueries({ queryKey: ['recent-checkins'] })
    queryClient.invalidateQueries({ queryKey: ['recent-activity'] })
    void invalidateDashboardQueries(queryClient)
  }

  const scanMutation = useMutation({
    mutationFn: async (rawSerial: string): Promise<DashboardScanMutationResult> => {
      const scannedSerial = rawSerial.trim()
      if (!scannedSerial) {
        throw new Error('Badge serial is required.')
      }

      const badgeResponse = await apiClient.badges.getBadgeBySerialNumber({
        params: { serialNumber: scannedSerial },
      })

      if (badgeResponse.status !== 200) {
        throw new Error(extractErrorMessage(badgeResponse.body, 'Badge lookup failed.'))
      }

      const badge = badgeResponse.body

      if (badge.status !== 'active') {
        throw new Error(`Badge is ${badge.status}.`)
      }

      if (badge.assignmentType === 'visitor') {
        return {
          type: 'visitor',
          serial: scannedSerial,
          message: 'Use visitor sign-in for visitor badges.',
        }
      }

      if (badge.assignmentType === 'temporary_personnel') {
        const scanResponse = await apiClient.temporaryPersonnel.scan({
          body: {
            serialNumber: scannedSerial,
            kioskId: DASHBOARD_BROW_KIOSK_ID,
          },
        })

        if (scanResponse.status !== 200) {
          throw new Error(
            extractErrorMessage(scanResponse.body, 'Temporary personnel scan failed.')
          )
        }

        return {
          type: 'temporary_personnel',
          serial: scannedSerial,
          displayName: scanResponse.body.temporaryPersonnel.displayName,
          assignmentName: scanResponse.body.assignment.name,
          direction: scanResponse.body.direction,
          timestamp: scanResponse.body.checkin.timestamp,
        }
      }

      if (badge.assignmentType !== 'member' || !badge.assignedToId) {
        throw new Error('Badge is not assigned to a member.')
      }

      const memberId = badge.assignedToId
      const memberName = badge.assignedTo?.name ?? 'Assigned member'
      const latestResponse = await apiClient.checkins.getCheckins({
        query: {
          memberId,
          page: '1',
          limit: '1',
        },
      })

      if (latestResponse.status !== 200) {
        throw new Error(extractErrorMessage(latestResponse.body, 'Unable to determine direction.'))
      }

      const lastDirection = latestResponse.body.checkins[0]?.direction
      const direction: ScanDirection = lastDirection === 'in' ? 'out' : 'in'
      const createResult = await createMemberCheckin({
        memberId,
        badgeId: badge.id,
        direction,
        kioskId: DASHBOARD_BROW_KIOSK_ID,
        method: 'badge',
        timestamp: new Date().toISOString(),
      })

      if (createResult.kind === 'lockup') {
        return {
          type: 'lockup',
          serial: scannedSerial,
          memberId,
          memberName,
          badgeId: badge.id,
          message: createResult.message,
        }
      }

      return {
        type: 'member',
        serial: scannedSerial,
        memberId,
        memberName: toMemberName(createResult.checkin, memberName),
        direction: createResult.checkin.direction === 'out' ? 'out' : 'in',
        timestamp: createResult.checkin.timestamp,
      }
    },
    onSuccess: (scanResult) => {
      setSerial('')

      if (scanResult.type === 'visitor') {
        setPendingLockup(null)
        setLockupOptionsOpen(false)
        setResult({
          tone: 'warning',
          eyebrow: 'Visitor badge',
          title: 'Visitor flow required',
          message: scanResult.message,
          timestamp: new Date().toISOString(),
        })
        refocusInput()
        return
      }

      if (scanResult.type === 'lockup') {
        setPendingLockup({
          memberId: scanResult.memberId,
          memberName: scanResult.memberName,
          badgeId: scanResult.badgeId,
          serial: scanResult.serial,
        })
        setLockupOptionsOpen(true)
        setResult({
          tone: 'warning',
          eyebrow: 'Lockup hold',
          title: scanResult.memberName,
          message: scanResult.message,
          direction: 'out',
          timestamp: new Date().toISOString(),
        })
        refocusInput()
        return
      }

      if (scanResult.type === 'temporary_personnel') {
        setPendingLockup(null)
        setLockupOptionsOpen(false)
        setResult({
          tone: scanResult.direction === 'in' ? 'success' : 'error',
          eyebrow:
            scanResult.direction === 'in'
              ? 'Temporary check-in recorded'
              : 'Temporary check-out recorded',
          title: scanResult.displayName,
          message: `${scanResult.assignmentName} - ${scanResult.direction === 'in' ? 'arrived' : 'departed'} at ${formatTimestamp(scanResult.timestamp)}.`,
          direction: scanResult.direction,
          timestamp: scanResult.timestamp,
        })
        refreshDashboard()
        refocusInput()
        return
      }

      setPendingLockup(null)
      setLockupOptionsOpen(false)
      setResult({
        tone: scanResult.direction === 'in' ? 'success' : 'error',
        eyebrow: scanResult.direction === 'in' ? 'Check-in recorded' : 'Check-out recorded',
        title: scanResult.memberName,
        message: `${scanResult.direction === 'in' ? 'Arrived' : 'Departed'} at ${formatTimestamp(scanResult.timestamp)}.`,
        direction: scanResult.direction,
        timestamp: scanResult.timestamp,
      })
      refreshDashboard()
      refocusInput()
    },
    onError: (error) => {
      setSerial('')
      setPendingLockup(null)
      setLockupOptionsOpen(false)
      setResult({
        tone: 'error',
        eyebrow: 'Scan rejected',
        title: 'Badge not accepted',
        message: error instanceof Error ? error.message : 'Badge scan failed.',
        timestamp: new Date().toISOString(),
      })
      refocusInput()
    },
  })

  useEffect(() => {
    refocusInput()
  }, [refocusInput])

  useEffect(() => {
    if (!scanMutation.isPending && !lockupOptionsOpen) {
      refocusInput()
    }
  }, [lockupOptionsOpen, refocusInput, scanMutation.isPending])

  const handleSubmit = () => {
    if (scanMutation.isPending) return

    const liveSerial = inputRef.current?.value ?? serial
    if (!liveSerial.trim()) return

    setPendingLockup(null)
    setLockupOptionsOpen(false)
    scanMutation.mutate(liveSerial)
  }

  const handleLockupCheckoutComplete = async (action: 'transfer' | 'execute') => {
    if (!pendingLockup) return

    const checkout = pendingLockup

    if (action === 'execute') {
      setPendingLockup(null)
      setLockupOptionsOpen(false)
      setResult({
        tone: 'warning',
        eyebrow: 'Lockup completed',
        title: `${checkout.memberName} checked out`,
        message: 'Building lockup was executed and the building is secured.',
        direction: 'out',
        timestamp: new Date().toISOString(),
      })
      refreshDashboard()
      refocusInput()
      return
    }

    try {
      const createResult = await createMemberCheckin({
        memberId: checkout.memberId,
        badgeId: checkout.badgeId,
        direction: 'out',
        kioskId: DASHBOARD_BROW_KIOSK_ID,
        method: 'badge',
      })

      if (createResult.kind === 'lockup') {
        setLockupOptionsOpen(true)
        setResult({
          tone: 'warning',
          eyebrow: 'Lockup hold',
          title: checkout.memberName,
          message: createResult.message,
          direction: 'out',
          timestamp: new Date().toISOString(),
        })
        return
      }

      setPendingLockup(null)
      setLockupOptionsOpen(false)
      setResult({
        tone: 'error',
        eyebrow: 'Check-out recorded',
        title: toMemberName(createResult.checkin, checkout.memberName),
        message: `Departed at ${formatTimestamp(createResult.checkin.timestamp)}.`,
        direction: 'out',
        timestamp: createResult.checkin.timestamp,
      })
      refreshDashboard()
      refocusInput()
    } catch (error) {
      setPendingLockup(null)
      setLockupOptionsOpen(false)
      setResult({
        tone: 'error',
        eyebrow: 'Checkout failed',
        title: 'Unable to finish checkout',
        message: error instanceof Error ? error.message : 'Failed to complete checkout.',
        direction: 'out',
        timestamp: new Date().toISOString(),
      })
      refocusInput()
    }
  }

  return (
    <>
      <AppCard
        className="border border-base-300 bg-base-100 shadow-md"
        data-help-id="dashboard.scan-panel"
      >
        <AppCardContent style={{ padding: 'var(--space-3)' }}>
          <form
            className={cn(
              'grid min-h-24 items-center gap-(--space-3) rounded-box border px-(--space-4) py-(--space-3) lg:grid-cols-[auto_minmax(0,1fr)_minmax(16rem,24rem)]',
              getResultSurfaceClass(result.tone)
            )}
            onSubmit={(event) => {
              event.preventDefault()
              handleSubmit()
            }}
            data-testid={TID.dashboard.scan.result}
          >
            {getDirectionIcon(result.direction, result.tone)}
            <div
              className="min-w-0"
              role={result.tone === 'error' || result.tone === 'warning' ? 'alert' : 'status'}
              aria-live={
                result.tone === 'error' || result.tone === 'warning' ? 'assertive' : 'polite'
              }
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-base-content/60">
                {result.eyebrow}
              </p>
              <p className="mt-(--space-1) truncate text-lg font-semibold leading-tight">
                {result.title}
              </p>
              <p className="mt-(--space-1) text-sm leading-5 text-base-content/75">
                {result.message}
              </p>
            </div>
            <label className="input input-sm flex h-10 w-full items-center gap-(--space-2) border-base-300 bg-base-100 lg:justify-self-end">
              <Keyboard className="size-4 shrink-0 text-base-content/45" />
              <input
                ref={inputRef}
                value={serial}
                type="text"
                autoComplete="off"
                aria-label="Scan badge"
                className="min-w-0 flex-1 font-mono text-sm tracking-[0.12em] uppercase placeholder:normal-case placeholder:tracking-normal"
                placeholder="Scan badge"
                disabled={scanMutation.isPending}
                onChange={(event) => setSerial(event.target.value)}
                data-testid={TID.dashboard.scan.input}
              />
            </label>
          </form>
        </AppCardContent>
      </AppCard>

      {pendingLockup && checkoutOptions && (
        <LockupOptionsModal
          open={lockupOptionsOpen}
          onOpenChange={(open) => {
            setLockupOptionsOpen(open)
            if (!open) {
              setPendingLockup(null)
              refocusInput()
            }
          }}
          memberId={pendingLockup.memberId}
          memberName={pendingLockup.memberName}
          checkoutOptions={checkoutOptions}
          onCheckoutComplete={handleLockupCheckoutComplete}
        />
      )}
    </>
  )
}
