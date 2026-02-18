'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, Clock3, IdCard, ScanLine, Shield, Users } from 'lucide-react'
import { LockupOptionsModal } from '@/components/lockup/lockup-options-modal'
import { AppBadge } from '@/components/ui/AppBadge'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCheckoutOptions } from '@/hooks/use-lockup'
import { apiClient } from '@/lib/api-client'
import { TID } from '@/lib/test-ids'
import type { CheckinWithMemberResponse, CreateCheckinInput } from '@sentinel/contracts'

interface KioskCheckinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FocusableRef {
  focus: () => void
}

type ScanDirection = 'in' | 'out'
type ScreenStatus = 'neutral' | 'success' | 'warning' | 'error'

interface AssignmentSummary {
  isDdsThisWeek: boolean
  isDutyWatchTonight: boolean
  upcomingDdsWeeks: string[]
  upcomingDutyWatchWeeks: string[]
}

interface MemberInsights {
  lastVisitAt: string | null
  recentIssues: string[]
  assignments: AssignmentSummary
}

interface ScreenState {
  status: ScreenStatus
  title: string
  message: string
  memberName?: string
  direction?: ScanDirection
  serial?: string
  scannedAt?: string
  insights?: MemberInsights
}

interface PendingLockupCheckout {
  memberId: string
  memberName: string
  badgeId: string
  serial: string
}

interface SuccessfulScan {
  type: 'success'
  serial: string
  memberId: string
  memberName: string
  direction: ScanDirection
  timestamp: string
}

interface VisitorScan {
  type: 'visitor'
  serial: string
  message: string
}

interface LockupScan {
  type: 'lockup'
  serial: string
  memberId: string
  memberName: string
  badgeId: string
  message: string
}

type ScanMutationResult = SuccessfulScan | VisitorScan | LockupScan

type CreateCheckinResult =
  | { kind: 'created'; checkin: CheckinWithMemberResponse }
  | { kind: 'lockup'; message: string }

const KIOSK_ID = 'DASHBOARD_KIOSK'
const LOOKAHEAD_WEEKS = 8

const INITIAL_SCREEN_STATE: ScreenState = {
  status: 'neutral',
  title: 'Welcome Aboard',
  message:
    'Members: scan your badge to check in or out. Visitors: please report to the Quartermaster desk.',
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getWeekStartMonday(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const day = copy.getDay()
  const delta = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + delta)
  return copy
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function formatDateTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatWeekLabel(weekStartDate: string, currentWeekStart: string): string {
  if (weekStartDate === currentWeekStart) return 'This week'
  return `Week of ${parseIsoDate(weekStartDate).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }
  return fallback
}

function toMemberName(checkin: CheckinWithMemberResponse, fallback: string): string {
  if (!checkin.member) return fallback
  return `${checkin.member.rank} ${checkin.member.firstName} ${checkin.member.lastName}`
}

function findLastVisitAt(checkins: CheckinWithMemberResponse[]): string | null {
  const previousIn = checkins.slice(1).find((entry) => entry.direction === 'in')
  return previousIn?.timestamp ?? null
}

function analyzeRecentScanIssues(checkins: CheckinWithMemberResponse[]): string[] {
  const recent = checkins.slice(0, 6)
  const issues: string[] = []

  if (recent.length === 0) return issues

  const hasManualOrOverride = recent
    .slice(1)
    .some((entry) => entry.method && entry.method !== 'badge')
  if (hasManualOrOverride) {
    issues.push('Recent manual or override entries were detected.')
  }

  const hasDirectionAnomaly = recent.some(
    (entry, index) => index > 0 && entry.direction === recent[index - 1]?.direction
  )
  if (hasDirectionAnomaly) {
    issues.push('Back-to-back identical directions were found in recent scans.')
  }

  const newestTimestamp = Date.parse(recent[0].timestamp)
  if (Number.isFinite(newestTimestamp)) {
    const rapidScans = recent.filter((entry) => {
      const timestamp = Date.parse(entry.timestamp)
      return Number.isFinite(timestamp) && newestTimestamp - timestamp <= 15 * 60 * 1000
    }).length
    if (rapidScans >= 4) {
      issues.push('High scan volume detected in a short time window.')
    }
  }

  return issues.slice(0, 3)
}

function createEmptyAssignments(): AssignmentSummary {
  return {
    isDdsThisWeek: false,
    isDutyWatchTonight: false,
    upcomingDdsWeeks: [],
    upcomingDutyWatchWeeks: [],
  }
}

async function fetchAssignmentSummary(memberId: string): Promise<AssignmentSummary> {
  const currentWeekStart = getWeekStartMonday(new Date())
  const currentWeekIso = toLocalIsoDate(currentWeekStart)
  const weekStartDates = Array.from({ length: LOOKAHEAD_WEEKS }, (_, index) =>
    toLocalIsoDate(addDays(currentWeekStart, index * 7))
  )

  const [currentDdsResponse, tonightDutyWatchResponse, weeklySchedules] = await Promise.all([
    apiClient.schedules.getCurrentDdsFromSchedule(),
    apiClient.schedules.getTonightDutyWatch(),
    Promise.all(
      weekStartDates.map(async (date) => {
        const response = await apiClient.schedules.getSchedulesByWeek({
          params: { date },
        })
        if (response.status !== 200) return []
        return response.body.data
      })
    ),
  ])

  const flatSchedules = weeklySchedules.flat()
  const ddsWeekStarts = new Set<string>()
  const dutyWatchWeekStarts = new Set<string>()

  for (const schedule of flatSchedules) {
    const hasAssignment = schedule.assignments.some(
      (assignment) => assignment.member.id === memberId && assignment.status !== 'released'
    )

    if (!hasAssignment) continue

    if (schedule.dutyRole.code === 'DDS') {
      ddsWeekStarts.add(schedule.weekStartDate)
    }

    if (schedule.dutyRole.code === 'DUTY_WATCH') {
      dutyWatchWeekStarts.add(schedule.weekStartDate)
    }
  }

  const isDdsThisWeek =
    (currentDdsResponse.status === 200 &&
      currentDdsResponse.body.dds !== null &&
      currentDdsResponse.body.dds.member.id === memberId &&
      currentDdsResponse.body.dds.status !== 'released') ||
    ddsWeekStarts.has(currentWeekIso)

  const isDutyWatchTonight =
    tonightDutyWatchResponse.status === 200 &&
    tonightDutyWatchResponse.body.isDutyWatchNight &&
    tonightDutyWatchResponse.body.team.some(
      (member) => member.member.id === memberId && member.status !== 'released'
    )

  const upcomingDdsWeeks = Array.from(ddsWeekStarts)
    .sort()
    .filter((weekStart) => weekStart >= currentWeekIso)
    .map((weekStart) => formatWeekLabel(weekStart, currentWeekIso))

  const upcomingDutyWatchWeeks = Array.from(dutyWatchWeekStarts)
    .sort()
    .filter((weekStart) => weekStart >= currentWeekIso)
    .map((weekStart) => formatWeekLabel(weekStart, currentWeekIso))

  return {
    isDdsThisWeek,
    isDutyWatchTonight,
    upcomingDdsWeeks: upcomingDdsWeeks.slice(0, 4),
    upcomingDutyWatchWeeks: upcomingDutyWatchWeeks.slice(0, 4),
  }
}

async function buildMemberInsights(memberId: string): Promise<MemberInsights> {
  const assignmentsFallback = createEmptyAssignments()

  const [checkinsResponse, assignmentsResult] = await Promise.all([
    apiClient.checkins.getCheckins({
      query: {
        memberId,
        page: '1',
        limit: '12',
      },
    }),
    fetchAssignmentSummary(memberId).catch(() => assignmentsFallback),
  ])

  const recentCheckins = checkinsResponse.status === 200 ? checkinsResponse.body.checkins : []

  return {
    lastVisitAt: findLastVisitAt(recentCheckins),
    recentIssues: analyzeRecentScanIssues(recentCheckins),
    assignments: assignmentsResult,
  }
}

export function KioskCheckinModal({ open, onOpenChange }: KioskCheckinModalProps) {
  const inputRef = useRef<FocusableRef | null>(null)
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => new Date())
  const [serial, setSerial] = useState('')
  const [screenState, setScreenState] = useState<ScreenState>(INITIAL_SCREEN_STATE)
  const [showLockupOptions, setShowLockupOptions] = useState(false)
  const [pendingLockup, setPendingLockup] = useState<PendingLockupCheckout | null>(null)

  const { data: checkoutOptions, isLoading: loadingCheckoutOptions } = useCheckoutOptions(
    pendingLockup?.memberId ?? ''
  )

  const refocusBadgeInput = () => {
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (!open) {
      setSerial('')
      setScreenState(INITIAL_SCREEN_STATE)
      setShowLockupOptions(false)
      setPendingLockup(null)
      return
    }

    refocusBadgeInput()
  }, [open])

  const createMemberCheckin = async (payload: CreateCheckinInput): Promise<CreateCheckinResult> => {
    const createResponse = await apiClient.checkins.createCheckin({
      body: payload,
    })

    if (createResponse.status === 201) {
      return { kind: 'created', checkin: createResponse.body }
    }

    if (
      createResponse.status === 403 &&
      'error' in createResponse.body &&
      createResponse.body.error === 'LOCKUP_HELD'
    ) {
      return {
        kind: 'lockup',
        message: extractErrorMessage(
          createResponse.body,
          'Lockup responsibility must be transferred or executed before checkout.'
        ),
      }
    }

    throw new Error(extractErrorMessage(createResponse.body, 'Failed to create check-in record.'))
  }

  const scanMutation = useMutation({
    mutationFn: async (rawSerial: string): Promise<ScanMutationResult> => {
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
        throw new Error(`Badge is ${badge.status}. Please see staff for assistance.`)
      }

      if (badge.assignmentType === 'visitor') {
        return {
          type: 'visitor',
          serial: scannedSerial,
          message:
            'Visitor badge detected. Please proceed to the Quartermaster desk to complete visitor sign-in.',
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
        kioskId: KIOSK_ID,
        method: 'badge',
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
        type: 'success',
        serial: scannedSerial,
        memberId,
        memberName: toMemberName(createResult.checkin, memberName),
        direction: createResult.checkin.direction === 'out' ? 'out' : 'in',
        timestamp: createResult.checkin.timestamp,
      }
    },
    onSuccess: async (result) => {
      setSerial('')
      refocusBadgeInput()

      if (result.type === 'visitor') {
        setPendingLockup(null)
        setShowLockupOptions(false)
        setScreenState({
          status: 'warning',
          title: 'Welcome, Visitor',
          message: result.message,
          serial: result.serial,
          scannedAt: new Date().toISOString(),
        })
        return
      }

      if (result.type === 'lockup') {
        setPendingLockup({
          memberId: result.memberId,
          memberName: result.memberName,
          badgeId: result.badgeId,
          serial: result.serial,
        })
        setShowLockupOptions(true)
        setScreenState({
          status: 'warning',
          title: 'Lockup Action Required',
          message: result.message,
          memberName: result.memberName,
          direction: 'out',
          serial: result.serial,
          scannedAt: new Date().toISOString(),
        })
        return
      }

      const insights = await buildMemberInsights(result.memberId)
      setPendingLockup(null)
      setShowLockupOptions(false)
      setScreenState({
        status: 'success',
        title: result.direction === 'in' ? 'Welcome to the Unit' : 'Safe Travels',
        message: `${result.memberName} checked ${result.direction.toUpperCase()} at ${formatTime(result.timestamp)}.`,
        memberName: result.memberName,
        direction: result.direction,
        serial: result.serial,
        scannedAt: result.timestamp,
        insights,
      })

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['checkins'] }),
        queryClient.invalidateQueries({ queryKey: ['recent-checkins'] }),
        queryClient.invalidateQueries({ queryKey: ['presence'] }),
        queryClient.invalidateQueries({ queryKey: ['present-people'] }),
      ])
    },
    onError: (error) => {
      setSerial('')
      setPendingLockup(null)
      setShowLockupOptions(false)
      setScreenState({
        status: 'error',
        title: 'Scan Not Accepted',
        message: error instanceof Error ? error.message : 'Badge scan failed.',
        scannedAt: new Date().toISOString(),
      })
      refocusBadgeInput()
    },
  })

  useEffect(() => {
    if (open && !showLockupOptions && !scanMutation.isPending) {
      refocusBadgeInput()
    }
  }, [open, showLockupOptions, scanMutation.isPending])

  const resolveLockupCheckout = async (action: 'transfer' | 'execute') => {
    if (!pendingLockup) return
    const checkoutContext = pendingLockup

    if (action === 'execute') {
      const insights = await buildMemberInsights(checkoutContext.memberId)
      setPendingLockup(null)
      setShowLockupOptions(false)
      setScreenState({
        status: 'success',
        title: 'Lockup Completed',
        message: `${checkoutContext.memberName} has been checked OUT after lockup execution.`,
        memberName: checkoutContext.memberName,
        direction: 'out',
        serial: checkoutContext.serial,
        scannedAt: new Date().toISOString(),
        insights,
      })
      refocusBadgeInput()
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['checkins'] }),
        queryClient.invalidateQueries({ queryKey: ['recent-checkins'] }),
        queryClient.invalidateQueries({ queryKey: ['presence'] }),
        queryClient.invalidateQueries({ queryKey: ['present-people'] }),
      ])
      return
    }

    try {
      const createResult = await createMemberCheckin({
        memberId: checkoutContext.memberId,
        badgeId: checkoutContext.badgeId,
        direction: 'out',
        kioskId: KIOSK_ID,
        method: 'badge',
      })

      if (createResult.kind === 'lockup') {
        setShowLockupOptions(true)
        setScreenState({
          status: 'warning',
          title: 'Lockup Action Required',
          message: createResult.message,
          memberName: checkoutContext.memberName,
          direction: 'out',
          serial: checkoutContext.serial,
          scannedAt: new Date().toISOString(),
        })
        return
      }

      const insights = await buildMemberInsights(checkoutContext.memberId)
      setPendingLockup(null)
      setShowLockupOptions(false)
      setScreenState({
        status: 'success',
        title: 'Checkout Complete',
        message: `${checkoutContext.memberName} checked OUT at ${formatTime(createResult.checkin.timestamp)}.`,
        memberName: toMemberName(createResult.checkin, checkoutContext.memberName),
        direction: 'out',
        serial: checkoutContext.serial,
        scannedAt: createResult.checkin.timestamp,
        insights,
      })
      refocusBadgeInput()
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['checkins'] }),
        queryClient.invalidateQueries({ queryKey: ['recent-checkins'] }),
        queryClient.invalidateQueries({ queryKey: ['presence'] }),
        queryClient.invalidateQueries({ queryKey: ['present-people'] }),
      ])
    } catch (error) {
      setPendingLockup(null)
      setShowLockupOptions(false)
      setScreenState({
        status: 'error',
        title: 'Checkout Failed',
        message: error instanceof Error ? error.message : 'Failed to complete checkout.',
        memberName: checkoutContext.memberName,
        direction: 'out',
        serial: checkoutContext.serial,
        scannedAt: new Date().toISOString(),
      })
      refocusBadgeInput()
    }
  }

  const badgeStatus =
    screenState.status === 'success'
      ? 'success'
      : screenState.status === 'warning'
        ? 'warning'
        : screenState.status === 'error'
          ? 'error'
          : 'info'

  const statusSurfaceClass =
    screenState.status === 'success'
      ? 'bg-success-fadded text-success-fadded-content border-success/30'
      : screenState.status === 'warning'
        ? 'bg-warning-fadded text-warning-fadded-content border-warning/30'
        : screenState.status === 'error'
          ? 'bg-error-fadded text-error-fadded-content border-error/30'
          : 'bg-base-100 text-base-content border-base-300'
  const statusAccentClass =
    screenState.status === 'success'
      ? 'border-l-success'
      : screenState.status === 'warning'
        ? 'border-l-warning'
        : screenState.status === 'error'
          ? 'border-l-error'
          : 'border-l-primary/40'

  const assignments = screenState.insights?.assignments
  const hasUpcomingAssignments =
    !!assignments &&
    (assignments.upcomingDdsWeeks.length > 0 || assignments.upcomingDutyWatchWeeks.length > 0)

  const lastVisitLabel =
    screenState.direction === 'out' ? 'Current visit started' : 'Last unit visit'

  const clockLabel = useMemo(
    () =>
      now.toLocaleString('en-CA', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }),
    [now]
  )
  const isReadyState =
    !scanMutation.isPending &&
    screenState.status === 'neutral' &&
    !screenState.memberName &&
    !screenState.scannedAt

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="full"
          showCloseButton={false}
          className="max-h-[95vh] overflow-hidden p-0"
        >
          <div className="h-full flex flex-col bg-base-100">
            <DialogHeader className="mb-0 border-b border-base-300 bg-gradient-to-r from-base-200 via-base-200 to-base-100 p-4 lg:p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <DialogTitle className="font-display text-2xl sm:text-3xl flex items-center gap-3">
                    <ScanLine className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                    Front Entrance Kiosk
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm sm:text-base">
                    Welcome to the Unit. Scan your badge for check-in and check-out.
                  </DialogDescription>
                </div>

                <div className="flex w-full sm:w-auto items-start justify-between sm:justify-end gap-2">
                  <div className="rounded border border-base-300 bg-base-100 px-3 py-2 sm:px-4 text-right min-w-60">
                    <p className="text-xs uppercase tracking-wide text-base-content/60">
                      Operational Time
                    </p>
                    <p
                      suppressHydrationWarning
                      className="font-mono text-xs sm:text-sm leading-tight"
                    >
                      {clockLabel}
                    </p>
                    <p className="text-xs text-base-content/60 mt-1 tracking-wide">{KIOSK_ID}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm self-start"
                    onClick={() => onOpenChange(false)}
                  >
                    Close Kiosk
                  </button>
                </div>
              </div>
            </DialogHeader>

            <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1.45fr_1fr]">
              <section className="bg-base-100 p-4 lg:p-6 flex min-h-0 flex-col gap-4 overflow-y-auto lg:border-r lg:border-base-300">
                <div className="flex items-center gap-4">
                  <div className="rounded-full border border-primary/20 bg-primary-fadded p-4 text-primary-fadded-content">
                    <IdCard className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl">Badge Scan Portal</h3>
                    <p className="text-sm text-base-content/70">
                      Members scan once. Direction is detected automatically.
                    </p>
                  </div>
                </div>

                <div className="card card-border bg-base-100 shadow-sm">
                  <div className="card-body p-4">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (scanMutation.isPending) return
                        setPendingLockup(null)
                        setShowLockupOptions(false)
                        scanMutation.mutate(serial)
                      }}
                      className="space-y-2 focus-within:ring-2 focus-within:ring-primary/40 focus-within:ring-offset-2 focus-within:ring-offset-base-100 rounded-box p-1.5 transition-shadow"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                        <fieldset className="fieldset flex-1">
                          <legend className="fieldset-legend text-base">Badge Serial</legend>
                          <input
                            ref={(node) => {
                              inputRef.current = node
                            }}
                            type="text"
                            className="input input-bordered input-lg w-full font-mono text-xl tracking-wide uppercase placeholder:normal-case placeholder:tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                            placeholder="Scan or enter badge serial..."
                            value={serial}
                            autoComplete="off"
                            onChange={(event) => setSerial(event.target.value)}
                            disabled={scanMutation.isPending}
                            data-testid={TID.dashboard.kiosk.badgeInput}
                          />
                        </fieldset>

                        <button
                          type="submit"
                          className="btn btn-primary btn-lg min-w-44 disabled:btn-disabled font-semibold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
                          disabled={scanMutation.isPending || !serial.trim()}
                          data-testid={TID.dashboard.kiosk.scanSubmit}
                        >
                          {scanMutation.isPending && <ButtonSpinner />}
                          Scan Badge
                        </button>
                      </div>
                      <p className="text-xs text-base-content/65 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                        Scan a badge or type a serial, then press{' '}
                        <kbd className="kbd kbd-xs">Enter</kbd>.
                      </p>
                    </form>
                  </div>
                </div>

                <div
                  className={`card card-border border-l-8 rounded-box flex-1 ${isReadyState ? 'min-h-40 sm:min-h-44' : 'min-h-52 sm:min-h-56'} ${statusSurfaceClass} ${statusAccentClass}`}
                  role={screenState.status === 'error' ? 'alert' : 'status'}
                  aria-live={
                    screenState.status === 'error'
                      ? 'assertive'
                      : screenState.status === 'warning'
                        ? 'assertive'
                        : 'polite'
                  }
                >
                  {scanMutation.isPending ? (
                    <div className="card-body h-full flex flex-col items-start justify-center gap-3 p-5 sm:p-6">
                      <div className="flex items-center gap-2">
                        <AppBadge status="info" pulse className="tracking-wide">
                          SCANNING
                        </AppBadge>
                      </div>
                      <p className="font-display text-xl sm:text-2xl">Reading badge...</p>
                      <p className="text-sm opacity-85">
                        Please hold card steady over the scanner.
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`card-body h-full flex flex-col justify-center gap-4 ${
                        isReadyState ? 'p-4' : 'p-6'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <AppBadge
                          status={screenState.status === 'neutral' ? 'neutral' : badgeStatus}
                          size="md"
                          className={screenState.status === 'neutral' ? 'badge-outline' : undefined}
                        >
                          {screenState.status === 'neutral'
                            ? 'READY'
                            : screenState.status.toUpperCase()}
                        </AppBadge>
                        {screenState.direction && (
                          <AppBadge
                            status={screenState.direction === 'in' ? 'success' : 'error'}
                            size="md"
                          >
                            {screenState.direction.toUpperCase()}
                          </AppBadge>
                        )}
                        {screenState.scannedAt && (
                          <span className="font-mono text-xs opacity-90 rounded bg-base-100/80 border border-base-300/60 px-2 py-1">
                            {formatDateTime(screenState.scannedAt)}
                          </span>
                        )}
                      </div>

                      <div>
                        <p
                          className={`font-display leading-tight ${isReadyState ? 'text-[1.8rem] sm:text-[2.1rem]' : 'text-2xl sm:text-3xl'} break-words`}
                        >
                          {screenState.title}
                        </p>
                        {screenState.memberName && (
                          <p className="text-lg sm:text-xl font-semibold mt-1 leading-tight break-words">
                            {screenState.memberName}
                          </p>
                        )}
                        <p className="text-sm mt-3 leading-relaxed break-words font-medium">
                          {screenState.message}
                        </p>
                        {screenState.serial && (
                          <p className="font-mono text-xs mt-3 opacity-85 rounded bg-base-100/75 border border-base-300/50 inline-block px-2 py-1 break-all">
                            {screenState.serial}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {pendingLockup && loadingCheckoutOptions && (
                  <div className="alert alert-warning alert-soft text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Loading lockup options for {pendingLockup.memberName}...</span>
                  </div>
                )}
              </section>

              <aside className="bg-base-200 p-4 lg:p-5 flex min-h-0 flex-col gap-2.5 overflow-y-auto border-t border-base-300 lg:border-t-0">
                <div className="card card-border bg-base-100 shadow-sm">
                  <div className="card-body p-3.5">
                    <h4 className="card-title font-display text-lg leading-tight flex items-center gap-2 text-base-content">
                      <Clock3 className="h-5 w-5 text-info" />
                      {lastVisitLabel}
                    </h4>
                    {screenState.memberName ? (
                      screenState.insights?.lastVisitAt ? (
                        <p className="text-sm leading-snug font-medium">
                          {formatDateTime(screenState.insights.lastVisitAt)}
                        </p>
                      ) : (
                        <p className="text-sm leading-snug text-base-content/70">
                          No prior unit visit found.
                        </p>
                      )
                    ) : (
                      <p className="text-sm leading-snug text-base-content/70">
                        Scan a member badge to view previous visit details.
                      </p>
                    )}
                  </div>
                </div>

                <div className="card card-border bg-base-100 shadow-sm">
                  <div className="card-body p-3.5">
                    <h4 className="card-title font-display text-lg leading-tight flex items-center gap-2 text-base-content">
                      <Shield className="h-5 w-5 text-warning" />
                      Scan Health
                    </h4>
                    {screenState.memberName ? (
                      screenState.insights && screenState.insights.recentIssues.length > 0 ? (
                        <ul className="space-y-2 text-sm leading-snug">
                          {screenState.insights.recentIssues.map((issue) => (
                            <li
                              key={issue}
                              className="rounded bg-warning-fadded text-warning-fadded-content px-2 py-1"
                            >
                              {issue}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm leading-snug text-success">
                          No scan issues found recently.
                        </p>
                      )
                    ) : (
                      <p className="text-sm leading-snug text-base-content/70">
                        Scan integrity and anomalies appear here after a member scan.
                      </p>
                    )}
                  </div>
                </div>

                <div className="card card-border bg-base-100 shadow-sm">
                  <div className="card-body p-3.5">
                    <h4 className="card-title font-display text-lg leading-tight flex items-center gap-2 text-base-content">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      Duty Commitments
                    </h4>

                    {!screenState.memberName ? (
                      <div className="text-sm leading-snug text-base-content/70 space-y-2">
                        <p>Shows DDS and Duty Watch obligations for current/upcoming weeks.</p>
                        <p className="rounded bg-info-fadded text-info-fadded-content px-2 py-1">
                          Visitors are processed with staff assistance.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {assignments?.isDdsThisWeek ? (
                            <AppBadge status="success" size="sm">
                              DDS This Week
                            </AppBadge>
                          ) : (
                            <AppBadge status="neutral" size="sm">
                              DDS Not Assigned
                            </AppBadge>
                          )}

                          {assignments?.isDutyWatchTonight ? (
                            <AppBadge status="warning" size="sm" pulse>
                              Duty Watch Tonight
                            </AppBadge>
                          ) : (
                            <AppBadge status="neutral" size="sm">
                              No Duty Watch Tonight
                            </AppBadge>
                          )}
                        </div>

                        {hasUpcomingAssignments ? (
                          <div className="space-y-2 text-sm leading-snug">
                            {assignments.upcomingDdsWeeks.length > 0 && (
                              <div>
                                <p className="font-semibold">DDS:</p>
                                <p className="text-base-content/80">
                                  {assignments.upcomingDdsWeeks.join(' | ')}
                                </p>
                              </div>
                            )}

                            {assignments.upcomingDutyWatchWeeks.length > 0 && (
                              <div>
                                <p className="font-semibold">Duty Watch:</p>
                                <p className="text-base-content/80">
                                  {assignments.upcomingDutyWatchWeeks.join(' | ')}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm leading-snug text-base-content/70">
                            No current or upcoming duty assignments found.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="card card-border bg-base-100 shadow-sm">
                  <div className="card-body p-3.5">
                    <h4 className="card-title font-display text-lg leading-tight flex items-center gap-2 text-base-content">
                      <Users className="h-5 w-5 text-secondary" />
                      Assistance
                    </h4>
                    <p className="text-sm leading-snug text-base-content/80">
                      If your badge is damaged, inactive, or unassigned, please contact the duty
                      desk.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {pendingLockup && checkoutOptions && (
        <LockupOptionsModal
          open={showLockupOptions}
          onOpenChange={(nextOpen) => {
            setShowLockupOptions(nextOpen)
            if (!nextOpen) {
              setPendingLockup(null)
              refocusBadgeInput()
            }
          }}
          memberId={pendingLockup.memberId}
          memberName={pendingLockup.memberName}
          checkoutOptions={checkoutOptions}
          onCheckoutComplete={resolveLockupCheckout}
        />
      )}
    </>
  )
}
