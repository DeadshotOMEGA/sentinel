'use client'

import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock3,
  IdCard,
  ScanLine,
  Shield,
  UserRoundPlus,
} from 'lucide-react'
import {
  VisitorSelfSigninFlow,
  type VisitorSelfSigninCompletion,
} from '@/components/kiosk/visitor-self-signin-flow'
import { LockupOptionsModal } from '@/components/lockup/lockup-options-modal'
import { KioskResponsibilityPrompt } from '@/components/kiosk/kiosk-responsibility-prompt'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { useAcceptDds, useDdsStatus, useKioskResponsibilityState } from '@/hooks/use-dds'
import { useCheckoutOptions, useLockupStatus, useOpenBuilding } from '@/hooks/use-lockup'
import { usePresentPeople } from '@/hooks/use-present-people'
import { useCurrentDds, useTonightDutyWatch } from '@/hooks/use-schedules'
import { apiClient } from '@/lib/api-client'
import { invalidateDashboardQueries } from '@/lib/dashboard-query-invalidation'
import { TID } from '@/lib/test-ids'
import type { CheckinWithMemberResponse, CreateCheckinInput } from '@sentinel/contracts'

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

interface ResponsibilityContext {
  memberId: string
  memberName: string
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

interface VisitorCompletionState extends VisitorSelfSigninCompletion {
  completedAt: string
}

type ScanMutationResult = SuccessfulScan | VisitorScan | LockupScan

type CreateCheckinResult =
  | { kind: 'created'; checkin: CheckinWithMemberResponse }
  | { kind: 'lockup'; message: string }

interface KioskCheckinScreenProps {
  isActive: boolean
  onClose?: () => void
  mode?: 'embedded' | 'standalone'
}

interface FocusableRef {
  focus: () => void
}

interface DisplayMember {
  rank: string
  firstName: string
  lastName: string
}

interface OperationalLead {
  roleLabel: 'DDS' | 'SWK' | 'DSWK' | 'Scheduled DDS'
  roleDescription: string
  tone: 'primary' | 'secondary' | 'warning'
  member: DisplayMember | null
}

type DutyWatchData = ReturnType<typeof useTonightDutyWatch>['data']
type LockupStatusData = ReturnType<typeof useLockupStatus>['data']
type ScheduledDdsData = ReturnType<typeof useCurrentDds>['data']

const KIOSK_ID = 'DASHBOARD_KIOSK'
const LOOKAHEAD_WEEKS = 8
const VISITOR_RESULT_RESET_MS = 15000

const INITIAL_SCREEN_STATE: ScreenState = {
  status: 'neutral',
  title: 'Ready for next badge',
  message:
    'Members scan now for check-in or check-out. Visitors use Start Visitor Sign-In for the guided touch process.',
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

function formatOperationalMemberName(member: DisplayMember | null): string | null {
  if (!member) return null
  return `${member.rank} ${member.lastName}, ${member.firstName}`
}

function toMemberName(checkin: CheckinWithMemberResponse, fallback: string): string {
  if (!checkin.member) return fallback
  return formatOperationalMemberName(checkin.member) ?? fallback
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

function getScheduledDdsLead(scheduledDds: ScheduledDdsData | undefined): OperationalLead | null {
  const member = scheduledDds?.dds?.member ?? null
  if (!member) return null

  return {
    roleLabel: 'Scheduled DDS',
    roleDescription: 'Scheduled today',
    tone: 'warning',
    member,
  }
}

function getDutyWatchLead(
  dutyWatch: DutyWatchData,
  lockupStatus: LockupStatusData
): OperationalLead | null {
  if (!dutyWatch?.isDutyWatchNight || !lockupStatus?.currentHolder) return null

  const matchedAssignment =
    dutyWatch.team.find(
      (assignment) =>
        assignment.member.id === lockupStatus.currentHolder?.id &&
        (assignment.position?.code === 'SWK' || assignment.position?.code === 'DSWK') &&
        assignment.status !== 'released'
    ) ?? null

  if (!matchedAssignment?.position) return null

  const roleLabel = matchedAssignment.position.code === 'SWK' ? 'SWK' : 'DSWK'

  return {
    roleLabel,
    roleDescription: 'Current duty-watch lockup holder',
    tone: 'secondary',
    member: matchedAssignment.member,
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

export function KioskCheckinScreen({
  isActive,
  onClose,
  mode = 'embedded',
}: KioskCheckinScreenProps) {
  const inputRef = useRef<FocusableRef | null>(null)
  const queryClient = useQueryClient()
  const prefersReducedMotion = useReducedMotion()
  const [now, setNow] = useState(() => new Date())
  const [serial, setSerial] = useState('')
  const [screenState, setScreenState] = useState<ScreenState>(INITIAL_SCREEN_STATE)
  const [showLockupOptions, setShowLockupOptions] = useState(false)
  const [pendingLockup, setPendingLockup] = useState<PendingLockupCheckout | null>(null)
  const [responsibilityContext, setResponsibilityContext] = useState<ResponsibilityContext | null>(
    null
  )
  const [responsibilityDismissed, setResponsibilityDismissed] = useState(false)
  const [responsibilityError, setResponsibilityError] = useState<string | null>(null)
  const [visitorFlowActive, setVisitorFlowActive] = useState(false)
  const [visitorCompletion, setVisitorCompletion] = useState<VisitorCompletionState | null>(null)

  const { data: checkoutOptions, isLoading: loadingCheckoutOptions } = useCheckoutOptions(
    pendingLockup?.memberId ?? ''
  )
  const { data: liveDdsStatus } = useDdsStatus()
  const { data: liveLockupStatus } = useLockupStatus()
  const { data: presentPeopleData } = usePresentPeople()
  const { data: scheduledDds } = useCurrentDds()
  const { data: tonightDutyWatch } = useTonightDutyWatch()
  const responsibilityStateQuery = useKioskResponsibilityState(
    responsibilityContext?.memberId ?? '',
    Boolean(responsibilityContext)
  )
  const acceptDdsMutation = useAcceptDds()
  const openBuildingMutation = useOpenBuilding()

  const resetResponsibilityState = () => {
    startTransition(() => {
      setResponsibilityContext(null)
      setResponsibilityDismissed(false)
      setResponsibilityError(null)
    })
  }

  const resetKioskState = () => {
    startTransition(() => {
      setSerial('')
      setScreenState(INITIAL_SCREEN_STATE)
      setShowLockupOptions(false)
      setPendingLockup(null)
      setResponsibilityContext(null)
      setResponsibilityDismissed(false)
      setResponsibilityError(null)
      setVisitorFlowActive(false)
      setVisitorCompletion(null)
    })
  }

  const refocusBadgeInput = () => {
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const invalidateKioskQueries = () => {
    void Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['checkins'] }),
      queryClient.invalidateQueries({ queryKey: ['recent-checkins'] }),
      invalidateDashboardQueries(queryClient),
    ])
  }

  const liveNeedsDds = !liveDdsStatus?.assignment || liveDdsStatus.assignment.status !== 'active'
  const liveNeedsBuildingOpen = liveLockupStatus?.buildingStatus === 'secured'
  const presentMemberCount = (presentPeopleData?.people ?? []).filter(
    (person) => person.type === 'member'
  ).length
  const showUnresolvedStandby = presentMemberCount > 0 && (liveNeedsDds || liveNeedsBuildingOpen)
  const responsibilityPromptVisible = Boolean(
    responsibilityContext &&
    responsibilityStateQuery.data?.shouldPrompt &&
    !responsibilityDismissed &&
    !pendingLockup
  )
  const responsibilityPending = acceptDdsMutation.isPending || openBuildingMutation.isPending
  const unresolvedMessage =
    liveNeedsBuildingOpen && liveNeedsDds
      ? 'Building still secured and DDS still unclaimed. Next qualified member please scan.'
      : liveNeedsDds
        ? 'Building is open. DDS still needs to be accepted for today.'
        : 'Building still needs to be opened for today.'

  const dutyWatchLead = getDutyWatchLead(tonightDutyWatch, liveLockupStatus)
  const activeDdsLead: OperationalLead | null =
    liveDdsStatus?.assignment?.status === 'active'
      ? {
          roleLabel: 'DDS',
          roleDescription: 'Current active DDS',
          tone: 'primary',
          member: liveDdsStatus.assignment.member,
        }
      : null
  const scheduledDdsLead = getScheduledDdsLead(scheduledDds)
  const headerLead = liveNeedsDds ? scheduledDdsLead : (dutyWatchLead ?? activeDdsLead)
  const headerLeadName = formatOperationalMemberName(headerLead?.member ?? null)
  const liveOpsMessage =
    liveNeedsBuildingOpen && liveNeedsDds
      ? 'Building is still secured and DDS is still unclaimed.'
      : liveNeedsBuildingOpen
        ? 'Building still needs to be opened for today.'
        : liveNeedsDds
          ? 'DDS still needs to be accepted for today.'
          : headerLead?.roleLabel === 'SWK' || headerLead?.roleLabel === 'DSWK'
            ? 'Duty Watch has assumed the active watch lead for tonight.'
            : 'Building is open and today’s DDS is active.'

  useEffect(() => {
    if (!isActive) return
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [isActive])

  useEffect(() => {
    if (!isActive) {
      resetKioskState()
      return
    }

    refocusBadgeInput()
  }, [isActive])

  useEffect(() => {
    if (!responsibilityContext) return
    if (!responsibilityStateQuery.data) return

    if (!responsibilityStateQuery.data.shouldPrompt) {
      resetResponsibilityState()
    }
  }, [responsibilityContext, responsibilityStateQuery.data])

  useEffect(() => {
    if (!responsibilityContext) return
    if (!liveNeedsDds && !liveNeedsBuildingOpen) {
      resetResponsibilityState()
    }
  }, [responsibilityContext, liveNeedsBuildingOpen, liveNeedsDds])

  useEffect(() => {
    if (!visitorCompletion) return

    const timer = window.setTimeout(() => {
      setVisitorCompletion(null)
      setScreenState(INITIAL_SCREEN_STATE)
      refocusBadgeInput()
    }, VISITOR_RESULT_RESET_MS)

    return () => window.clearTimeout(timer)
  }, [visitorCompletion])

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
            'This badge is not assigned to a member. Visitors must use the guided self sign-in panel below or see staff for assistance.',
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
      setVisitorCompletion(null)
      refocusBadgeInput()
      setResponsibilityError(null)
      setResponsibilityDismissed(false)
      setResponsibilityContext(null)

      if (result.type === 'visitor') {
        setPendingLockup(null)
        setShowLockupOptions(false)
        setScreenState({
          status: 'warning',
          title: 'Guided Visitor Sign-In Required',
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
      if (result.direction === 'in') {
        setResponsibilityContext({
          memberId: result.memberId,
          memberName: result.memberName,
        })
      }
      setScreenState({
        status: 'success',
        title: result.direction === 'in' ? 'Check-In Complete' : 'Check-Out Complete',
        message: `Recorded at ${formatTime(result.timestamp)}.`,
        memberName: result.memberName,
        direction: result.direction,
        serial: result.serial,
        scannedAt: result.timestamp,
        insights,
      })

      invalidateKioskQueries()
    },
    onError: (error) => {
      setSerial('')
      setPendingLockup(null)
      setShowLockupOptions(false)
      setResponsibilityContext(null)
      setResponsibilityDismissed(false)
      setResponsibilityError(null)
      setVisitorCompletion(null)
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
    if (
      isActive &&
      !showLockupOptions &&
      !visitorFlowActive &&
      !scanMutation.isPending &&
      !visitorCompletion
    ) {
      refocusBadgeInput()
    }
  }, [isActive, showLockupOptions, visitorFlowActive, visitorCompletion, scanMutation.isPending])

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
      invalidateKioskQueries()
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
        title: 'Check-Out Complete',
        message: `Recorded at ${formatTime(createResult.checkin.timestamp)}.`,
        memberName: toMemberName(createResult.checkin, checkoutContext.memberName),
        direction: 'out',
        serial: checkoutContext.serial,
        scannedAt: createResult.checkin.timestamp,
        insights,
      })
      refocusBadgeInput()
      invalidateKioskQueries()
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

  const handleResponsibilitySubmit = async (selection: {
    openBuilding: boolean
    takeDds: boolean
  }) => {
    if (!responsibilityContext) return

    setResponsibilityError(null)

    try {
      if (selection.takeDds) {
        await acceptDdsMutation.mutateAsync(responsibilityContext.memberId)
        setScreenState({
          status: 'success',
          title: 'DDS Accepted',
          message: `${responsibilityContext.memberName} is now today's DDS and the building has been opened.`,
          memberName: responsibilityContext.memberName,
          direction: 'in',
          scannedAt: new Date().toISOString(),
        })
        setResponsibilityContext(null)
        setResponsibilityDismissed(false)
      } else if (selection.openBuilding) {
        await openBuildingMutation.mutateAsync({
          memberId: responsibilityContext.memberId,
        })
        setScreenState({
          status: 'success',
          title: 'Building Opened',
          message: `${responsibilityContext.memberName} opened the building. DDS still needs to be accepted for today.`,
          memberName: responsibilityContext.memberName,
          direction: 'in',
          scannedAt: new Date().toISOString(),
        })
        setResponsibilityDismissed(true)
      }

      invalidateKioskQueries()
      await responsibilityStateQuery.refetch()
    } catch (error) {
      setResponsibilityError(
        error instanceof Error ? error.message : 'Failed to update building responsibility.'
      )
    }
  }

  const handleResponsibilityDecline = () => {
    setResponsibilityDismissed(true)
    setResponsibilityError(null)

    if (responsibilityContext) {
      setScreenState({
        status: 'warning',
        title: 'Responsibility Still Needed',
        message: `${responsibilityContext.memberName} checked IN. The next qualified member will be asked to open the building or take DDS.`,
        memberName: responsibilityContext.memberName,
        direction: 'in',
        scannedAt: new Date().toISOString(),
      })
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

  const displayStatus: ScreenStatus = visitorCompletion
    ? 'success'
    : visitorFlowActive
      ? 'neutral'
      : screenState.status
  const displayBadgeStatus =
    displayStatus === 'success'
      ? 'success'
      : displayStatus === 'warning'
        ? 'warning'
        : displayStatus === 'error'
          ? 'error'
          : 'info'
  const statusSurfaceClass =
    displayStatus === 'success'
      ? 'bg-success-fadded text-success-fadded-content border-success/30'
      : displayStatus === 'warning'
        ? 'bg-warning-fadded text-base-content border-warning/30'
        : displayStatus === 'error'
          ? 'bg-error-fadded text-error-fadded-content border-error/30'
          : 'bg-base-100 text-base-content border-base-300'
  const statusAccentClass =
    displayStatus === 'success'
      ? 'border-l-success'
      : displayStatus === 'warning'
        ? 'border-l-warning'
        : displayStatus === 'error'
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
    !visitorFlowActive &&
    !visitorCompletion &&
    screenState.status === 'neutral' &&
    !screenState.memberName &&
    !screenState.scannedAt

  const heroCardStatus =
    scanMutation.isPending || visitorFlowActive || visitorCompletion
      ? visitorCompletion
        ? 'success'
        : 'info'
      : screenState.status === 'neutral'
        ? 'info'
        : badgeStatus

  const contentContainerClass =
    mode === 'standalone' ? 'h-dvh flex flex-col bg-base-100' : 'h-full flex flex-col bg-base-100'

  const resultKey = scanMutation.isPending
    ? 'pending'
    : visitorCompletion
      ? `visitor-complete-${visitorCompletion.completedAt}`
      : visitorFlowActive
        ? 'visitor-active'
        : `${screenState.status}-${screenState.scannedAt ?? 'idle'}-${screenState.direction ?? 'na'}-${screenState.title}`

  const displayTitle = visitorCompletion
    ? visitorCompletion.title
    : visitorFlowActive
      ? 'Visitor Self Sign-In Active'
      : screenState.title
  const displayMessage = visitorCompletion
    ? visitorCompletion.message
    : visitorFlowActive
      ? 'Complete the guided visitor steps below. Member scanning resumes as soon as this flow is cancelled or finished.'
      : screenState.message
  const displayMemberName = visitorCompletion
    ? undefined
    : visitorFlowActive
      ? undefined
      : screenState.memberName
  const displaySerial = visitorCompletion
    ? undefined
    : visitorFlowActive
      ? undefined
      : screenState.serial
  const displayTimestamp = visitorCompletion?.completedAt ?? screenState.scannedAt
  const displayDirection = visitorCompletion
    ? undefined
    : visitorFlowActive
      ? undefined
      : screenState.direction
  const flowChipColor = visitorFlowActive || visitorCompletion ? 'secondary' : 'primary'

  return (
    <>
      <div className={`${contentContainerClass} relative`}>
        <header className="border-b border-base-300 bg-base-100/95 px-4 py-4 shadow-sm lg:px-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="rounded-full border border-primary/20 bg-primary-fadded p-3 text-primary-fadded-content shadow-sm">
                <ScanLine className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.18em] text-base-content/55 uppercase">
                  Front Entrance
                </p>
                <h1 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">
                  Front Entrance Kiosk
                </h1>
                <p className="mt-2 max-w-4xl text-base text-base-content/80 sm:text-lg">
                  Members scan here for immediate check-in or check-out. Visitors use the guided
                  inline self sign-in flow below.
                </p>

                <div className="mt-4 rounded-box border border-base-300 bg-base-200/65 px-4 py-3">
                  {(liveNeedsBuildingOpen || liveNeedsDds) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {liveNeedsBuildingOpen && (
                        <AppBadge status="warning" size="md" pulse>
                          BUILDING SECURED
                        </AppBadge>
                      )}
                      {liveNeedsDds && (
                        <AppBadge status="warning" size="md" pulse>
                          DDS NOT ACCEPTED
                        </AppBadge>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-start gap-3">
                    {headerLead ? (
                      <>
                        <Chip
                          variant="faded"
                          color={headerLead.tone}
                          size="sm"
                          className="uppercase tracking-[0.14em]"
                        >
                          {headerLead.roleLabel}
                        </Chip>
                        <div className="min-w-0">
                          <p className="text-lg font-semibold leading-tight text-base-content sm:text-xl">
                            {headerLeadName ?? 'No assigned member'}
                          </p>
                          <p className="mt-1 text-sm text-base-content/65">
                            {headerLead.roleDescription}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-base-content/80">
                          No scheduled DDS found
                        </p>
                        <p className="mt-1 text-xs text-base-content/60">
                          Update today&apos;s DDS assignment to restore a clear operational lead.
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-base-content/70">{liveOpsMessage}</p>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-start justify-between gap-2 xl:w-auto xl:justify-end">
              <div className="rounded-box border border-base-300 bg-base-200/70 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-base-content/55">
                  Operational Time
                </p>
                <p
                  suppressHydrationWarning
                  className="mt-1 font-mono text-xs leading-tight text-base-content/80 sm:text-sm"
                >
                  {clockLabel}
                </p>
                <p className="mt-2 text-[0.7rem] uppercase tracking-[0.2em] text-base-content/45">
                  {KIOSK_ID}
                </p>
              </div>
              {onClose && mode === 'embedded' && (
                <button type="button" className="btn btn-ghost btn-sm self-start" onClick={onClose}>
                  Close Kiosk
                </button>
              )}
            </div>
          </div>
        </header>

        <div
          className={`grid flex-1 min-h-0 ${
            visitorFlowActive ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[minmax(0,1.72fr)_23rem]'
          }`}
        >
          <section className="flex min-h-0 flex-col gap-4 overflow-y-auto bg-base-100 p-4 lg:p-6">
            <AppCard
              variant="elevated"
              status={heroCardStatus}
              className="overflow-hidden border border-base-300"
            >
              <AppCardHeader className="gap-4 border-b border-base-300 bg-base-100/80 p-4 lg:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip
                    variant="faded"
                    color={flowChipColor}
                    size="sm"
                    className="uppercase tracking-[0.14em]"
                  >
                    {visitorFlowActive || visitorCompletion ? 'Visitor Flow' : 'Member Scan'}
                  </Chip>
                  <AppBadge status={heroCardStatus} size="md">
                    {scanMutation.isPending
                      ? 'SCANNING'
                      : visitorCompletion
                        ? 'VISITOR COMPLETE'
                        : visitorFlowActive
                          ? 'VISITOR IN PROGRESS'
                          : isReadyState
                            ? 'READY TO SCAN'
                            : 'LIVE RESULT'}
                  </AppBadge>
                </div>

                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full border border-primary/20 bg-primary-fadded p-3 text-primary-fadded-content">
                      <IdCard className="h-8 w-8" />
                    </div>
                    <div className="min-w-0">
                      <AppCardTitle className="font-display text-2xl leading-tight sm:text-3xl">
                        {visitorFlowActive || visitorCompletion
                          ? 'Scan result remains visible while visitors use the kiosk'
                          : 'Scan badge to check in or out'}
                      </AppCardTitle>
                      <AppCardDescription className="mt-1 text-sm sm:text-base">
                        {visitorFlowActive || visitorCompletion
                          ? 'The upper result surface handles visitor guidance and completion instructions while the lower panel owns the visitor workflow.'
                          : 'Member identity, outcome, and timing appear here immediately after every successful scan.'}
                      </AppCardDescription>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm text-base-content/75 sm:grid-cols-2">
                    <div className="rounded-box border border-base-300 bg-base-100 px-3 py-2">
                      Members
                      <p className="font-semibold text-base-content">
                        One scan records entry or departure instantly.
                      </p>
                    </div>
                    <div className="rounded-box border border-base-300 bg-base-100 px-3 py-2">
                      Visitors
                      <p className="font-semibold text-base-content">
                        Use the inline guided sign-in panel below.
                      </p>
                    </div>
                  </div>
                </div>
              </AppCardHeader>

              <AppCardContent className="flex flex-col gap-0 p-0">
                <div className="border-b border-base-300 bg-base-200/50 px-4 py-4 lg:px-5">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      if (scanMutation.isPending || visitorFlowActive) return
                      setPendingLockup(null)
                      setShowLockupOptions(false)
                      scanMutation.mutate(serial)
                    }}
                    className="rounded-box border border-base-300 bg-base-100 p-3 transition-shadow focus-within:ring-2 focus-within:ring-primary/30"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <fieldset className="fieldset flex-1">
                        <legend className="fieldset-legend text-sm font-semibold text-base-content">
                          Manual Badge Serial
                        </legend>
                        <input
                          ref={(node) => {
                            inputRef.current = node
                          }}
                          type="text"
                          className="input input-bordered input-md h-11 w-full font-mono text-sm tracking-[0.12em] uppercase placeholder:normal-case placeholder:tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:text-base"
                          placeholder={
                            visitorFlowActive
                              ? 'Visitor sign-in active...'
                              : 'Enter serial only if scanner fails...'
                          }
                          value={serial}
                          autoComplete="off"
                          onChange={(event) => setSerial(event.target.value)}
                          disabled={scanMutation.isPending || visitorFlowActive}
                          data-testid={TID.dashboard.kiosk.badgeInput}
                        />
                        <p className="label text-xs text-base-content/65">
                          {visitorFlowActive
                            ? 'Member scanning is paused while the visitor sign-in flow is active.'
                            : 'Scanner reads badges automatically. Type here only for manual fallback, then press Enter or use the button.'}
                        </p>
                      </fieldset>

                      <div className="flex justify-start sm:justify-end">
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm w-full font-semibold tracking-[0.08em] sm:btn-md sm:min-w-40 sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 disabled:btn-disabled"
                          disabled={scanMutation.isPending || visitorFlowActive || !serial.trim()}
                          data-testid={TID.dashboard.kiosk.scanSubmit}
                        >
                          {scanMutation.isPending && <ButtonSpinner />}
                          Submit Manually
                        </button>
                      </div>
                    </div>
                  </form>

                  {showUnresolvedStandby && !responsibilityPromptVisible && (
                    <div
                      role="alert"
                      className="alert alert-warning alert-soft mt-3 border border-warning/30"
                    >
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span className="text-sm font-medium">{unresolvedMessage}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 lg:p-5">
                  <div
                    className={`rounded-box border border-base-300 border-l-[10px] ${statusSurfaceClass} ${statusAccentClass}`}
                    role={displayStatus === 'error' ? 'alert' : 'status'}
                    aria-live={
                      displayStatus === 'error' || displayStatus === 'warning'
                        ? 'assertive'
                        : 'polite'
                    }
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {scanMutation.isPending ? (
                        <motion.div
                          key={resultKey}
                          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
                          transition={{ duration: prefersReducedMotion ? 0.01 : 0.25 }}
                          className="flex min-h-80 flex-col justify-center gap-4 px-6 py-8 lg:min-h-96 lg:px-8"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <AppBadge status="info" size="lg" pulse className="tracking-[0.15em]">
                              SCANNING
                            </AppBadge>
                          </div>
                          <p className="font-display text-4xl leading-tight sm:text-5xl">
                            Reading badge...
                          </p>
                          <p className="max-w-2xl text-base font-medium opacity-85 sm:text-lg">
                            Hold the card steady over the scanner until the kiosk confirms the
                            result.
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={resultKey}
                          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
                          transition={{ duration: prefersReducedMotion ? 0.01 : 0.28 }}
                          className="flex min-h-80 flex-col justify-center gap-6 px-6 py-8 lg:min-h-96 lg:px-8"
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <AppBadge
                              status={displayStatus === 'neutral' ? 'neutral' : displayBadgeStatus}
                              size="lg"
                              className={displayStatus === 'neutral' ? 'badge-outline' : undefined}
                            >
                              {displayStatus === 'neutral' ? 'READY' : displayStatus.toUpperCase()}
                            </AppBadge>
                            {displayDirection && (
                              <AppBadge
                                status={displayDirection === 'in' ? 'success' : 'error'}
                                size="lg"
                              >
                                {displayDirection.toUpperCase()}
                              </AppBadge>
                            )}
                            {displayTimestamp && (
                              <span className="rounded-box border border-base-300/70 bg-base-100/85 px-3 py-1.5 font-mono text-xs opacity-90">
                                {formatDateTime(displayTimestamp)}
                              </span>
                            )}
                          </div>

                          <div className="max-w-3xl">
                            <p className="font-display text-[2.5rem] leading-tight break-words sm:text-[3.25rem]">
                              {displayTitle}
                            </p>
                            {displayMemberName && (
                              <p className="mt-3 text-2xl font-semibold leading-tight break-words sm:text-[2.2rem]">
                                {displayMemberName}
                              </p>
                            )}
                            <p className="mt-4 text-base leading-relaxed font-medium sm:text-xl break-words">
                              {displayMessage}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-start gap-3">
                            {displaySerial && (
                              <div className="rounded-box border border-base-300/60 bg-base-100/85 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-55">
                                  Badge Serial
                                </p>
                                <p className="mt-2 max-w-full break-all font-mono text-sm opacity-90">
                                  {displaySerial}
                                </p>
                              </div>
                            )}

                            {(visitorFlowActive || visitorCompletion) && (
                              <div className="rounded-box border border-base-300/60 bg-base-100/85 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-55">
                                  Next Step
                                </p>
                                <p className="mt-2 text-sm font-semibold text-base-content">
                                  {visitorCompletion
                                    ? visitorCompletion.actionLabel
                                    : 'Complete the inline visitor details below'}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

            <AnimatePresence mode="wait" initial={false}>
              {visitorFlowActive ? (
                <motion.div
                  key="visitor-active"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
                  transition={{ duration: prefersReducedMotion ? 0.01 : 0.25 }}
                  className="min-h-0 flex flex-col"
                >
                  <AppCard
                    variant="elevated"
                    status="info"
                    className="min-h-0 flex flex-1 flex-col border border-base-300"
                  >
                    <AppCardHeader className="gap-3 border-b border-base-300 bg-info-fadded/30 p-4 lg:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip
                          variant="faded"
                          color="secondary"
                          size="sm"
                          className="uppercase tracking-[0.14em]"
                        >
                          Visitor Flow
                        </Chip>
                        <AppBadge status="info" size="md">
                          ACTIVE
                        </AppBadge>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="rounded-full border border-secondary/20 bg-secondary-fadded p-3 text-secondary-fadded-content">
                          <UserRoundPlus className="h-8 w-8" />
                        </div>
                        <div className="min-w-0">
                          <AppCardTitle className="font-display text-2xl leading-tight sm:text-3xl">
                            Visitor Self Sign-In
                          </AppCardTitle>
                          <AppCardDescription className="mt-1 text-sm sm:text-base">
                            Complete the guided visitor details below. The scan-result surface above
                            will confirm the outcome and next instruction once the visitor is signed
                            in.
                          </AppCardDescription>
                        </div>
                      </div>
                    </AppCardHeader>

                    <AppCardContent className="min-h-0 flex flex-1 flex-col p-4 lg:p-5">
                      <VisitorSelfSigninFlow
                        kioskId={KIOSK_ID}
                        layout="inline"
                        onCancel={() => setVisitorFlowActive(false)}
                        onComplete={(completion) => {
                          setVisitorFlowActive(false)
                          setVisitorCompletion({
                            ...completion,
                            completedAt: new Date().toISOString(),
                          })
                          setScreenState(INITIAL_SCREEN_STATE)
                        }}
                      />
                    </AppCardContent>
                  </AppCard>
                </motion.div>
              ) : (
                <motion.div
                  key="visitor-idle"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
                  transition={{ duration: prefersReducedMotion ? 0.01 : 0.25 }}
                >
                  <AppCard status="info" className="border border-base-300 bg-info-fadded/20">
                    <AppCardHeader className="gap-3 p-4 pb-3 lg:p-5 lg:pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip
                          variant="faded"
                          color="secondary"
                          size="sm"
                          className="uppercase tracking-[0.14em]"
                        >
                          Visitor Flow
                        </Chip>
                        <AppBadge status="info" size="md">
                          READY
                        </AppBadge>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="rounded-full border border-secondary/20 bg-secondary-fadded p-3 text-secondary-fadded-content">
                          <UserRoundPlus className="h-8 w-8" />
                        </div>
                        <div className="min-w-0">
                          <AppCardTitle className="font-display text-2xl leading-tight sm:text-3xl">
                            Visitor Self Sign-In
                          </AppCardTitle>
                          <AppCardDescription className="mt-1 text-sm sm:text-base">
                            Start the guided visitor flow inline. The right rail collapses out of
                            the way while the visitor is using the kiosk.
                          </AppCardDescription>
                        </div>
                      </div>
                    </AppCardHeader>

                    <AppCardContent className="flex flex-col gap-4 p-4 pt-0 lg:p-5 lg:pt-0">
                      <button
                        type="button"
                        className="btn btn-secondary btn-xl h-16 w-full justify-between"
                        onClick={() => {
                          setVisitorCompletion(null)
                          setVisitorFlowActive(true)
                        }}
                      >
                        <span className="text-left">Start Visitor Sign-In</span>
                        <ChevronRight className="h-6 w-6" />
                      </button>

                      <div className="grid gap-2 text-sm text-base-content/75 sm:grid-cols-3">
                        <p className="rounded-box bg-base-100 px-3 py-2">Guest and family visits</p>
                        <p className="rounded-box bg-base-100 px-3 py-2">
                          Military and recruiting visits
                        </p>
                        <p className="rounded-box bg-base-100 px-3 py-2">
                          Contractor and service access
                        </p>
                      </div>
                    </AppCardContent>
                  </AppCard>
                </motion.div>
              )}
            </AnimatePresence>

            {pendingLockup && loadingCheckoutOptions && (
              <div className="alert alert-warning alert-soft text-base-content text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Loading lockup options for {pendingLockup.memberName}...</span>
              </div>
            )}
          </section>

          <AnimatePresence initial={false}>
            {!visitorFlowActive && (
              <motion.aside
                key="kiosk-right-rail"
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.22 }}
                className="min-h-0 overflow-y-auto border-t border-base-300 bg-base-200/60 p-4 lg:p-5 xl:border-t-0 xl:border-l"
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <AppCard className="border border-base-300 bg-base-100">
                    <AppCardHeader className="gap-2 p-4 pb-3">
                      <AppCardTitle className="font-display flex items-center gap-2 text-lg">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        Duty Commitments
                      </AppCardTitle>
                    </AppCardHeader>
                    <AppCardContent className="flex flex-col gap-3 p-4 pt-0">
                      {!screenState.memberName ? (
                        <div className="space-y-2 text-sm leading-snug text-base-content/70">
                          <p>DDS and Duty Watch commitments show here after a member scan.</p>
                          <p className="rounded-box bg-info-fadded px-3 py-2 text-info-fadded-content">
                            Visitors use the self sign-in flow or ask the duty desk for help.
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
                                  <p className="font-semibold">DDS</p>
                                  <p className="text-base-content/80">
                                    {assignments.upcomingDdsWeeks.join(' | ')}
                                  </p>
                                </div>
                              )}

                              {assignments.upcomingDutyWatchWeeks.length > 0 && (
                                <div>
                                  <p className="font-semibold">Duty Watch</p>
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
                    </AppCardContent>
                  </AppCard>

                  <AppCard className="border border-base-300 bg-base-100">
                    <AppCardHeader className="gap-2 p-4 pb-3">
                      <AppCardTitle className="font-display flex items-center gap-2 text-lg">
                        <Shield className="h-5 w-5 text-warning" />
                        Scan Health
                      </AppCardTitle>
                    </AppCardHeader>
                    <AppCardContent className="p-4 pt-0">
                      {screenState.memberName ? (
                        screenState.insights && screenState.insights.recentIssues.length > 0 ? (
                          <ul className="space-y-2 text-sm leading-snug">
                            {screenState.insights.recentIssues.map((issue) => (
                              <li
                                key={issue}
                                className="rounded-box bg-warning-fadded px-3 py-2 text-base-content"
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
                          Integrity warnings and anomalies appear here after a scan.
                        </p>
                      )}
                    </AppCardContent>
                  </AppCard>

                  <AppCard className="border border-base-300 bg-base-100">
                    <AppCardHeader className="gap-2 p-4 pb-3">
                      <AppCardTitle className="font-display flex items-center gap-2 text-lg">
                        <Clock3 className="h-5 w-5 text-info" />
                        Last Scan / Visit to the Unit
                      </AppCardTitle>
                    </AppCardHeader>
                    <AppCardContent className="p-4 pt-0">
                      {screenState.memberName ? (
                        screenState.insights?.lastVisitAt ? (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55">
                              {lastVisitLabel}
                            </p>
                            <p className="mt-2 text-sm leading-snug font-medium">
                              {formatDateTime(screenState.insights.lastVisitAt)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm leading-snug text-base-content/70">
                            No prior unit visit found.
                          </p>
                        )
                      ) : (
                        <p className="text-sm leading-snug text-base-content/70">
                          Previous visit details appear after a member scan.
                        </p>
                      )}
                    </AppCardContent>
                  </AppCard>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {responsibilityPromptVisible && responsibilityStateQuery.data && (
          <KioskResponsibilityPrompt
            state={responsibilityStateQuery.data}
            isPending={responsibilityPending}
            errorMessage={responsibilityError}
            onDecline={handleResponsibilityDecline}
            onSubmit={handleResponsibilitySubmit}
          />
        )}
      </div>

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
