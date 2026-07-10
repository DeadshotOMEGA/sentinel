'use client'

/* global HTMLInputElement */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  CircleAlert,
  Keyboard,
  LogIn,
  LogOut,
  PanelBottomClose,
  PanelBottomOpen,
} from 'lucide-react'
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
const SCAN_RESULT_VISIBLE_MS = 4000
const SCAN_INPUT_REFOCUS_MS = 1500
const FOCUS_HOLD_SELECTOR = [
  `input:not([data-testid="${TID.dashboard.scan.input}"])`,
  'textarea',
  'select',
  '[contenteditable="true"]',
].join(',')
const ACTIVE_WORK_SURFACE_SELECTOR = [
  '.modal[open]',
  '.presence-member-floating-panel[data-open="true"]',
  `[data-testid="${TID.dashboard.help.launcher}"] [aria-expanded="true"]`,
].join(',')

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

interface DashboardScanPanelProps {
  isVisible: boolean
  onVisibleChange: (nextVisible: boolean) => void
}

function isInitialScanResult(result: DashboardScanResult): boolean {
  return (
    result.tone === INITIAL_SCAN_RESULT.tone &&
    result.eyebrow === INITIAL_SCAN_RESULT.eyebrow &&
    result.title === INITIAL_SCAN_RESULT.title &&
    result.message === INITIAL_SCAN_RESULT.message
  )
}

function shouldRefocusScanInput(input: HTMLInputElement | null): boolean {
  if (!input || document.hidden) return false
  if (document.querySelector(ACTIVE_WORK_SURFACE_SELECTOR)) return false

  const activeElement = document.activeElement
  if (activeElement === input) return false

  if (activeElement instanceof HTMLElement) {
    return !activeElement.closest(FOCUS_HOLD_SELECTOR)
  }

  return true
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

export function DashboardScanPanel({ isVisible, onVisibleChange }: DashboardScanPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const queryClient = useQueryClient()
  const [serial, setSerial] = useState('')
  const [result, setResult] = useState<DashboardScanResult>(INITIAL_SCAN_RESULT)
  const [pendingLockup, setPendingLockup] = useState<PendingDashboardLockup | null>(null)
  const [lockupOptionsOpen, setLockupOptionsOpen] = useState(false)
  const { data: checkoutOptions } = useCheckoutOptions(pendingLockup?.memberId ?? '')

  const refocusInput = useCallback(() => {
    if (!isVisible) return
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)
  }, [isVisible])

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
    if (!isVisible) return
    refocusInput()
  }, [isVisible, refocusInput])

  useEffect(() => {
    if (!isVisible) return
    if (!scanMutation.isPending && !lockupOptionsOpen) {
      refocusInput()
    }
  }, [isVisible, lockupOptionsOpen, refocusInput, scanMutation.isPending])

  useEffect(() => {
    if (!isVisible) return
    if (scanMutation.isPending || lockupOptionsOpen) return

    const refocusWhenIdle = () => {
      if (shouldRefocusScanInput(inputRef.current)) {
        inputRef.current?.focus({ preventScroll: true })
      }
    }

    const intervalId = window.setInterval(refocusWhenIdle, SCAN_INPUT_REFOCUS_MS)

    window.addEventListener('focus', refocusWhenIdle)
    document.addEventListener('visibilitychange', refocusWhenIdle)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refocusWhenIdle)
      document.removeEventListener('visibilitychange', refocusWhenIdle)
    }
  }, [isVisible, lockupOptionsOpen, scanMutation.isPending])

  useEffect(() => {
    if (lockupOptionsOpen || isInitialScanResult(result)) return

    const clearResult = window.setTimeout(() => {
      setResult(INITIAL_SCAN_RESULT)
    }, SCAN_RESULT_VISIBLE_MS)

    return () => window.clearTimeout(clearResult)
  }, [lockupOptionsOpen, result])

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
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-sticky) px-(--space-4) pb-(--space-4) transition-[left] duration-(--duration-normal) lg:px-(--space-6)"
        style={{ left: 'var(--app-sidebar-offset, 0rem)' }}
      >
        {isVisible ? (
          <AppCard
            className="pointer-events-auto mx-auto w-full max-w-[1760px] border border-base-300 bg-base-100 shadow-[var(--shadow-3)]"
            data-help-id="dashboard.scan-panel"
          >
            <AppCardContent style={{ padding: 'var(--space-3)' }}>
              <form
                className={cn(
                  'grid min-h-20 items-center gap-(--space-3) rounded-box border px-(--space-4) py-(--space-3) lg:grid-cols-[auto_minmax(0,1fr)_minmax(22rem,28rem)]',
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
                <div className="flex min-w-0 items-center gap-(--space-2) lg:justify-self-end">
                  <label className="input input-sm flex h-10 min-w-0 flex-1 items-center gap-(--space-2) border-base-300 bg-base-100">
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
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square shrink-0"
                    onClick={() => onVisibleChange(false)}
                    aria-label="Hide scanner bar"
                    title="Hide scanner bar"
                    data-testid={TID.dashboard.scan.hide}
                  >
                    <PanelBottomClose className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </AppCardContent>
          </AppCard>
        ) : (
          <div className="mx-auto flex w-full max-w-[1760px] justify-end">
            <button
              type="button"
              className="btn btn-info btn-sm pointer-events-auto gap-(--space-2) border-info/45 text-info-content shadow-[var(--shadow-2)]"
              onClick={() => onVisibleChange(true)}
              aria-label="Show scanner bar"
              title="Show scanner bar"
              data-testid={TID.dashboard.scan.show}
              data-help-id="dashboard.scan-panel.show"
            >
              <PanelBottomOpen className="h-4 w-4" />
              <span>Show scanner</span>
            </button>
          </div>
        )}
      </div>

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
