'use client'

import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  DoorOpen,
  RefreshCw,
  ScanLine,
  UserRoundPlus,
} from 'lucide-react'
import { KioskResponsibilityPrompt } from '@/components/kiosk/kiosk-responsibility-prompt'
import {
  VisitorSelfSigninFlow,
  type VisitorSelfSigninCompletion,
} from '@/components/kiosk/visitor-self-signin-flow'
import { LockupOptionsModal } from '@/components/lockup/lockup-options-modal'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { ButtonSpinner, LoadingSpinner } from '@/components/ui/loading-spinner'
import { Chip } from '@/components/ui/chip'
import { useAcceptDds, useDdsStatus, useKioskResponsibilityState } from '@/hooks/use-dds'
import { useCheckoutOptions, useLockupStatus, useOpenBuilding } from '@/hooks/use-lockup'
import { useCurrentDds, useTonightDutyWatch } from '@/hooks/use-schedules'
import { apiClient } from '@/lib/api-client'
import { invalidateDashboardQueries } from '@/lib/dashboard-query-invalidation'
import { TID } from '@/lib/test-ids'
import { cn } from '@/lib/utils'
import type { CheckinWithMemberResponse, CreateCheckinInput } from '@sentinel/contracts'

type ScanDirection = 'in' | 'out'
type ResultTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

interface ResultSnapshot {
  tone: ResultTone
  eyebrow: string
  title: string
  message: string
  memberName?: string
  direction?: ScanDirection
  serial?: string
  timestamp?: string
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

interface DisplayMember {
  rank: string
  firstName: string
  lastName: string
}

interface OperationalLead {
  roleLabel: 'Active DDS' | 'Scheduled DDS' | 'SWK' | 'DSWK'
  roleDescription: string
  member: DisplayMember | null
}

interface ReadinessWarning {
  key: 'unit-secured' | 'dds-pending'
  label: string
  message: string
}

type ScanMutationResult = SuccessfulScan | VisitorScan | LockupScan
type DutyWatchData = ReturnType<typeof useTonightDutyWatch>['data']
type ScheduledDdsData = ReturnType<typeof useCurrentDds>['data']
type LockupStatusData = ReturnType<typeof useLockupStatus>['data']

type CreateCheckinResult =
  | { kind: 'created'; checkin: CheckinWithMemberResponse }
  | { kind: 'lockup'; message: string }

const KIOSK_ID = 'DASHBOARD_KIOSK'
const BADGE_FOCUS_REQUEST_EVENT = 'kiosk-request-badge-focus'
const KIOSK_RESULT_RESET_MS = 5000
const MOTION_TIMING = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
}

const INITIAL_RESULT: ResultSnapshot = {
  tone: 'neutral',
  eyebrow: 'Scanner Ready',
  title: 'Awaiting next scan',
  message: 'The next badge result appears here automatically. Visitors tap Visitor Check-In.',
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

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatClockLabel(date: Date): string {
  return date.toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

function getScheduledDdsLead(scheduledDds: ScheduledDdsData | undefined): OperationalLead | null {
  const member = scheduledDds?.dds?.member ?? null
  if (!member) return null

  return {
    roleLabel: 'Scheduled DDS',
    roleDescription: 'Scheduled for today',
    member,
  }
}

function getDutyWatchLead(
  dutyWatch: DutyWatchData | undefined,
  lockupStatus: LockupStatusData | undefined
): OperationalLead | null {
  if (!dutyWatch?.isDutyWatchNight) return null

  const dutyWatchLead =
    dutyWatch.team.find(
      (assignment) =>
        assignment.isCheckedIn &&
        (assignment.position?.code === 'SWK' || assignment.position?.code === 'DSWK') &&
        assignment.status !== 'released'
    ) ??
    dutyWatch.team.find(
      (assignment) =>
        assignment.member.id === lockupStatus?.currentHolder?.id &&
        (assignment.position?.code === 'SWK' || assignment.position?.code === 'DSWK') &&
        assignment.status !== 'released'
    ) ??
    null

  if (!dutyWatchLead?.position) return null

  return {
    roleLabel: dutyWatchLead.position.code === 'SWK' ? 'SWK' : 'DSWK',
    roleDescription: 'Duty watch lead tonight',
    member: dutyWatchLead.member,
  }
}

function resultToneToBadgeStatus(
  tone: ResultTone
): 'neutral' | 'info' | 'success' | 'warning' | 'error' {
  if (tone === 'neutral') return 'neutral'
  return tone
}

function resultToneToSurfaceClass(tone: ResultTone): string {
  if (tone === 'success') {
    return 'border-success/35 bg-success-fadded text-success-fadded-content'
  }
  if (tone === 'warning') {
    return 'border-warning/35 bg-warning-fadded text-warning-fadded-content'
  }
  if (tone === 'error') {
    return 'border-error/35 bg-error-fadded text-error-fadded-content'
  }
  if (tone === 'info') {
    return 'border-info/35 bg-info-fadded text-info-fadded-content'
  }
  return 'border-base-300 bg-base-100 text-base-content'
}

function SkeletonStrip({ title }: { title: string }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-200/60 px-(--space-4) py-(--space-3)">
      <p className="text-xs uppercase tracking-[0.18em] text-base-content/45">{title}</p>
      <div className="mt-(--space-2) h-4 w-28 animate-pulse rounded-box bg-base-300" />
    </div>
  )
}

export function KioskCommandDeck() {
  const inputRef = useRef<{
    focus: (options?: { preventScroll?: boolean }) => void
  } | null>(null)
  const queryClient = useQueryClient()
  const prefersReducedMotion = useReducedMotion()
  const [now, setNow] = useState(() => new Date())
  const [serial, setSerial] = useState('')
  const [result, setResult] = useState<ResultSnapshot>(INITIAL_RESULT)
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
  const ddsStatusQuery = useDdsStatus()
  const lockupStatusQuery = useLockupStatus()
  const scheduledDdsQuery = useCurrentDds()
  const tonightDutyWatchQuery = useTonightDutyWatch()
  const responsibilityStateQuery = useKioskResponsibilityState(
    responsibilityContext?.memberId ?? '',
    Boolean(responsibilityContext)
  )
  const acceptDdsMutation = useAcceptDds()
  const openBuildingMutation = useOpenBuilding()

  const operationalQueries = [ddsStatusQuery, lockupStatusQuery]
  const allOperationalSettled = operationalQueries.every(
    (query) => !query.isLoading && !query.isFetching
  )
  const operationalErrorCount = operationalQueries.filter((query) => query.isError).length
  const fatalOperationalOutage =
    allOperationalSettled && operationalErrorCount === operationalQueries.length
  const degradedOperationalData =
    operationalErrorCount > 0 && operationalErrorCount < operationalQueries.length
  const loadingOperationalData =
    operationalQueries.some((query) => query.isLoading) && !allOperationalSettled

  const liveDdsStatus = ddsStatusQuery.data
  const liveLockupStatus = lockupStatusQuery.data
  const liveNeedsDds = !liveDdsStatus?.assignment || liveDdsStatus.assignment.status !== 'active'
  const liveNeedsBuildingOpen = liveLockupStatus?.buildingStatus === 'secured'
  const scheduledDdsLead = getScheduledDdsLead(scheduledDdsQuery.data)
  const dutyWatchLead = getDutyWatchLead(tonightDutyWatchQuery.data, liveLockupStatus)
  const activeDdsLead: OperationalLead | null =
    liveDdsStatus?.assignment?.status === 'active'
      ? {
          roleLabel: 'Active DDS',
          roleDescription: liveDdsStatus.isDdsOnSite ? 'On site today' : 'Currently off site',
          member: liveDdsStatus.assignment.member,
        }
      : null
  const leadDisplay = activeDdsLead
    ? liveDdsStatus?.isDdsOnSite
      ? activeDdsLead
      : (dutyWatchLead ?? activeDdsLead)
    : (scheduledDdsLead ?? dutyWatchLead)
  const responsibilityPromptVisible = Boolean(
    responsibilityContext &&
    responsibilityStateQuery.data?.shouldPrompt &&
    !responsibilityDismissed &&
    !pendingLockup
  )
  const responsibilityPending = acceptDdsMutation.isPending || openBuildingMutation.isPending
  const clockLabel = useMemo(() => formatClockLabel(now), [now])
  const leadDisplayName = formatOperationalMemberName(leadDisplay?.member ?? null)
  const leadDisplayLoading =
    !leadDisplay &&
    (scheduledDdsQuery.isLoading ||
      scheduledDdsQuery.isFetching ||
      tonightDutyWatchQuery.isLoading ||
      tonightDutyWatchQuery.isFetching)
  const readinessWarnings: ReadinessWarning[] = [
    ...(liveNeedsBuildingOpen
      ? [
          {
            key: 'unit-secured' as const,
            label: 'Unit Secured',
            message: 'Staff must open the unit before normal traffic can continue.',
          },
        ]
      : []),
    ...(liveNeedsDds
      ? [
          {
            key: 'dds-pending' as const,
            label: 'DDS Not Accepted',
            message: 'A qualified member still needs to accept DDS for today.',
          },
        ]
      : []),
  ]

  const resetResponsibilityState = () => {
    startTransition(() => {
      setResponsibilityContext(null)
      setResponsibilityDismissed(false)
      setResponsibilityError(null)
    })
  }

  const refocusBadgeInput = () => {
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)
  }

  const refreshOperationalData = async () => {
    await Promise.allSettled(operationalQueries.map((query) => query.refetch()))
  }

  const invalidateKioskQueries = () => {
    void Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['checkins'] }),
      queryClient.invalidateQueries({ queryKey: ['recent-checkins'] }),
      invalidateDashboardQueries(queryClient),
    ])
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

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
    const handleBadgeFocusRequest = () => {
      if (
        fatalOperationalOutage ||
        visitorFlowActive ||
        showLockupOptions ||
        responsibilityPromptVisible
      ) {
        return
      }

      refocusBadgeInput()
    }

    window.addEventListener(BADGE_FOCUS_REQUEST_EVENT, handleBadgeFocusRequest)
    return () => window.removeEventListener(BADGE_FOCUS_REQUEST_EVENT, handleBadgeFocusRequest)
  }, [fatalOperationalOutage, responsibilityPromptVisible, showLockupOptions, visitorFlowActive])

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
          message: 'This badge is not used for member scanning. Start visitor sign-in instead.',
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
    onSuccess: (scanResult) => {
      setSerial('')
      setVisitorCompletion(null)
      setResponsibilityError(null)
      setResponsibilityDismissed(false)
      setResponsibilityContext(null)

      if (scanResult.type === 'visitor') {
        setPendingLockup(null)
        setShowLockupOptions(false)
        setResult({
          tone: 'warning',
          eyebrow: 'Visitor Badge',
          title: 'Use visitor sign-in',
          message: scanResult.message,
          serial: scanResult.serial,
          timestamp: new Date().toISOString(),
        })
        refocusBadgeInput()
        return
      }

      if (scanResult.type === 'lockup') {
        setPendingLockup({
          memberId: scanResult.memberId,
          memberName: scanResult.memberName,
          badgeId: scanResult.badgeId,
          serial: scanResult.serial,
        })
        setShowLockupOptions(true)
        setResult({
          tone: 'warning',
          eyebrow: 'Lockup Hold',
          title: 'Lockup action required',
          message: scanResult.message,
          memberName: scanResult.memberName,
          direction: 'out',
          serial: scanResult.serial,
          timestamp: new Date().toISOString(),
        })
        refocusBadgeInput()
        return
      }

      if (scanResult.direction === 'in') {
        setResponsibilityContext({
          memberId: scanResult.memberId,
          memberName: scanResult.memberName,
        })
      }

      setPendingLockup(null)
      setShowLockupOptions(false)
      setResult({
        tone: 'success',
        eyebrow: scanResult.direction === 'in' ? 'Check-In Recorded' : 'Check-Out Recorded',
        title: scanResult.memberName,
        message: `${scanResult.direction === 'in' ? 'Arrived' : 'Departed'} at ${formatTimestamp(scanResult.timestamp)}.`,
        memberName: scanResult.memberName,
        direction: scanResult.direction,
        serial: scanResult.serial,
        timestamp: scanResult.timestamp,
      })
      invalidateKioskQueries()
      refocusBadgeInput()
    },
    onError: (error) => {
      setSerial('')
      setPendingLockup(null)
      setShowLockupOptions(false)
      setResponsibilityContext(null)
      setResponsibilityDismissed(false)
      setResponsibilityError(null)
      setVisitorCompletion(null)
      setResult({
        tone: 'error',
        eyebrow: 'Scan Rejected',
        title: 'Badge could not be accepted',
        message: error instanceof Error ? error.message : 'Badge scan failed.',
        timestamp: new Date().toISOString(),
      })
      refocusBadgeInput()
    },
  })

  useEffect(() => {
    const hasResultToReset = Boolean(visitorCompletion) || result.tone !== 'neutral'
    if (!hasResultToReset) return
    if (
      visitorFlowActive ||
      showLockupOptions ||
      responsibilityPromptVisible ||
      scanMutation.isPending
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      setVisitorCompletion(null)
      setResult(INITIAL_RESULT)
      refocusBadgeInput()
    }, KIOSK_RESULT_RESET_MS)

    return () => window.clearTimeout(timer)
  }, [
    result.tone,
    scanMutation.isPending,
    responsibilityPromptVisible,
    showLockupOptions,
    visitorCompletion,
    visitorFlowActive,
  ])

  const resultTone = visitorCompletion ? 'success' : visitorFlowActive ? 'info' : result.tone
  const stageBadgeStatus = resultToneToBadgeStatus(resultTone)
  const stageSurfaceClass = resultToneToSurfaceClass(resultTone)
  const scanningDisabled = scanMutation.isPending || visitorFlowActive || fatalOperationalOutage
  const visitorScanPromptVisible =
    !visitorFlowActive && !visitorCompletion && result.eyebrow === 'Visitor Badge'
  const resultTitle = visitorCompletion
    ? visitorCompletion.title
    : visitorFlowActive
      ? 'Member scan paused'
      : fatalOperationalOutage
        ? 'Kiosk services are unavailable'
        : result.title
  const resultMessage = visitorCompletion
    ? visitorCompletion.message
    : visitorFlowActive
      ? 'Visitor check-in is active on the right. Member scanning resumes when that flow is closed or finished.'
      : fatalOperationalOutage
        ? 'Live kiosk services are offline. Refresh the kiosk or use the hidden maintenance controls.'
        : result.message
  const resultEyebrow = visitorCompletion
    ? 'Visitor Complete'
    : visitorFlowActive
      ? 'Visitor Sign-In'
      : fatalOperationalOutage
        ? 'Service Outage'
        : result.eyebrow
  const resultTimestamp = visitorCompletion?.completedAt ?? result.timestamp
  const resultMemberName = visitorCompletion
    ? undefined
    : visitorFlowActive
      ? undefined
      : result.memberName
  const resultDirection = visitorCompletion
    ? undefined
    : visitorFlowActive
      ? undefined
      : result.direction
  const resultSerial = visitorCompletion ? undefined : visitorFlowActive ? undefined : result.serial
  const hasMeaningfulResult =
    visitorFlowActive ||
    Boolean(visitorCompletion) ||
    Boolean(resultTimestamp) ||
    result.tone !== 'neutral'
  const primaryActionLabel = visitorCompletion
    ? visitorCompletion.actionLabel
    : visitorFlowActive
      ? 'Finish visitor sign-in'
      : visitorScanPromptVisible
        ? 'Start visitor sign-in'
        : fatalOperationalOutage
          ? 'Refresh services'
          : 'Present badge to the external reader'

  useEffect(() => {
    if (showLockupOptions || visitorFlowActive || scanMutation.isPending) return
    refocusBadgeInput()
  }, [showLockupOptions, visitorFlowActive, scanMutation.isPending])

  const resolveLockupCheckout = async (action: 'transfer' | 'execute') => {
    if (!pendingLockup) return

    const checkoutContext = pendingLockup

    if (action === 'execute') {
      setPendingLockup(null)
      setShowLockupOptions(false)
      setResult({
        tone: 'success',
        eyebrow: 'Lockup Completed',
        title: `${checkoutContext.memberName} checked out`,
        message:
          'Building lockup was executed. All remaining people were checked out and the building is secured.',
        memberName: checkoutContext.memberName,
        direction: 'out',
        serial: checkoutContext.serial,
        timestamp: new Date().toISOString(),
      })
      invalidateKioskQueries()
      refocusBadgeInput()
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
        setResult({
          tone: 'warning',
          eyebrow: 'Lockup Hold',
          title: 'Lockup action required',
          message: createResult.message,
          memberName: checkoutContext.memberName,
          direction: 'out',
          serial: checkoutContext.serial,
          timestamp: new Date().toISOString(),
        })
        return
      }

      setPendingLockup(null)
      setShowLockupOptions(false)
      setResult({
        tone: 'success',
        eyebrow: 'Check-Out Recorded',
        title: toMemberName(createResult.checkin, checkoutContext.memberName),
        message: `Departed at ${formatTimestamp(createResult.checkin.timestamp)}.`,
        memberName: checkoutContext.memberName,
        direction: 'out',
        serial: checkoutContext.serial,
        timestamp: createResult.checkin.timestamp,
      })
      invalidateKioskQueries()
      refocusBadgeInput()
    } catch (error) {
      setPendingLockup(null)
      setShowLockupOptions(false)
      setResult({
        tone: 'error',
        eyebrow: 'Checkout Failed',
        title: 'Unable to finish checkout',
        message: error instanceof Error ? error.message : 'Failed to complete checkout.',
        memberName: checkoutContext.memberName,
        direction: 'out',
        serial: checkoutContext.serial,
        timestamp: new Date().toISOString(),
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
        setResult({
          tone: 'success',
          eyebrow: 'DDS Accepted',
          title: responsibilityContext.memberName,
          message: 'DDS is now active for today and the unit is open.',
          memberName: responsibilityContext.memberName,
          direction: 'in',
          timestamp: new Date().toISOString(),
        })
        setResponsibilityContext(null)
        setResponsibilityDismissed(false)
      } else if (selection.openBuilding) {
        await openBuildingMutation.mutateAsync({
          memberId: responsibilityContext.memberId,
        })
        setResult({
          tone: 'warning',
          eyebrow: 'Unit Opened',
          title: responsibilityContext.memberName,
          message: 'The unit is now open. DDS still needs to be accepted for today.',
          memberName: responsibilityContext.memberName,
          direction: 'in',
          timestamp: new Date().toISOString(),
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
      setResult({
        tone: 'warning',
        eyebrow: 'Responsibility Outstanding',
        title: responsibilityContext.memberName,
        message: 'Arrival was recorded, but the unit still needs to be opened or DDS accepted.',
        memberName: responsibilityContext.memberName,
        direction: 'in',
        timestamp: new Date().toISOString(),
      })
    }
  }

  const motionTransition = {
    duration: prefersReducedMotion ? 0.01 : MOTION_TIMING.slow,
  }

  return (
    <>
      <div className="relative flex h-full min-h-dvh flex-col overflow-hidden bg-base-300 text-base-content">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at top left, color-mix(in oklab, var(--color-primary) 7%, transparent) 0%, transparent 28%), linear-gradient(to right, color-mix(in oklab, var(--color-base-content) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-base-content) 6%, transparent) 1px, transparent 1px)',
            backgroundSize:
              'auto, var(--space-10) var(--space-10), var(--space-10) var(--space-10)',
          }}
        />

        <div className="relative z-[var(--z-base)] flex h-full min-h-0 flex-col gap-(--space-4) p-(--space-4) xl:p-(--space-5)">
          <header>
            <AppCard
              variant="elevated"
              status={fatalOperationalOutage ? 'error' : undefined}
              className="border border-base-300 bg-base-100/95 shadow-[var(--shadow-2)] backdrop-blur-sm"
            >
              <AppCardHeader className="gap-(--space-3)" style={{ padding: 'var(--space-5)' }}>
                <div className="flex flex-col gap-(--space-3) xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-4xl">
                    <div className="flex flex-wrap items-center gap-(--space-2)">
                      <Chip
                        variant="faded"
                        color="primary"
                        size="sm"
                        className="uppercase tracking-[0.16em]"
                      >
                        Front Entrance
                      </Chip>
                      <AppBadge
                        status={
                          fatalOperationalOutage ? 'error' : visitorFlowActive ? 'info' : 'neutral'
                        }
                      >
                        {fatalOperationalOutage
                          ? 'SERVICES DOWN'
                          : visitorFlowActive
                            ? 'VISITOR ACTIVE'
                            : 'KIOSK READY'}
                      </AppBadge>
                    </div>
                    <AppCardTitle className="mt-(--space-3) font-display text-3xl leading-tight text-base-content xl:text-4xl">
                      Front Entrance Kiosk
                    </AppCardTitle>
                    <AppCardDescription className="mt-(--space-2) max-w-3xl text-base leading-relaxed text-base-content/72">
                      Members use the external badge reader. Visitors check themselves in on this
                      screen.
                    </AppCardDescription>
                  </div>

                  <div className="grid gap-(--space-3) sm:grid-cols-2 xl:w-[36rem]">
                    <div className="rounded-box border border-base-300 bg-base-200/70 px-(--space-4) py-(--space-3)">
                      <div className="flex items-center gap-(--space-2)">
                        <Clock3 className="h-4 w-4 text-base-content/55" />
                        <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                          Local time
                        </p>
                      </div>
                      <p
                        suppressHydrationWarning
                        className="mt-(--space-2) font-mono text-sm leading-relaxed text-base-content/80"
                      >
                        {clockLabel}
                      </p>
                    </div>
                    <div className="rounded-box border border-base-300 bg-base-200/70 px-(--space-4) py-(--space-3)">
                      <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                        Today&apos;s lead
                      </p>
                      {leadDisplayLoading ? (
                        <div className="mt-(--space-2) h-4 w-28 animate-pulse rounded-box bg-base-300" />
                      ) : (
                        <>
                          <p className="mt-(--space-2) text-sm font-semibold leading-tight text-base-content">
                            {leadDisplay?.roleLabel ?? 'No live lead yet'}
                          </p>
                          <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/78">
                            {leadDisplayName ?? 'Waiting for the day’s assignment or watch lead.'}
                          </p>
                          {leadDisplay && (
                            <p className="mt-(--space-1) text-xs uppercase tracking-[0.16em] text-base-content/48">
                              {leadDisplay.roleDescription}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </AppCardHeader>

              {(loadingOperationalData ||
                fatalOperationalOutage ||
                degradedOperationalData ||
                readinessWarnings.length > 0) && (
                <AppCardContent
                  className="grid gap-(--space-3)"
                  style={{ padding: '0 var(--space-5) var(--space-5)' }}
                >
                  {fatalOperationalOutage ? (
                    <div role="alert" className="alert alert-error alert-soft">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Kiosk services are unavailable.</p>
                        <p className="text-sm">
                          Member scans and visitor sign-in are paused until the kiosk reconnects.
                        </p>
                      </div>
                    </div>
                  ) : degradedOperationalData ? (
                    <div role="alert" className="alert alert-warning alert-soft">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Status data is delayed.</p>
                        <p className="text-sm">
                          The kiosk can still be used, but readiness indicators may lag behind live
                          changes.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {loadingOperationalData ? (
                    <div className="grid gap-(--space-3) xl:grid-cols-2">
                      <SkeletonStrip title="Checking unit status" />
                      <SkeletonStrip title="Checking DDS status" />
                    </div>
                  ) : readinessWarnings.length > 0 ? (
                    <div className="grid gap-(--space-3) xl:grid-cols-2">
                      {readinessWarnings.map((warning) => {
                        const Icon = warning.key === 'unit-secured' ? DoorOpen : AlertTriangle

                        return (
                          <div
                            key={warning.key}
                            className="rounded-box border border-warning/45 bg-warning/18 p-(--space-3) text-base-content shadow-[var(--shadow-1)]"
                          >
                            <div className="flex items-start gap-(--space-3)">
                              <div className="rounded-box border border-warning/40 bg-warning/22 p-(--space-2) text-warning-content">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold leading-tight">
                                  {warning.label}
                                </p>
                                <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/78">
                                  {warning.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </AppCardContent>
              )}
            </AppCard>
          </header>

          <div className="grid min-h-0 flex-1 gap-(--space-4) xl:grid-cols-[minmax(0,1.55fr)_minmax(24rem,0.9fr)]">
            <section className="flex min-h-0 flex-col gap-(--space-4)">
              <AppCard
                variant="elevated"
                status={fatalOperationalOutage ? 'error' : stageBadgeStatus}
                className="flex min-h-0 flex-1 flex-col border border-base-300 bg-base-100/95 shadow-[var(--shadow-2)] backdrop-blur-sm"
              >
                <AppCardHeader
                  className="gap-(--space-3) border-b border-base-300"
                  style={{ padding: 'var(--space-4) var(--space-5)' }}
                >
                  <div className="grid gap-(--space-3) xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-(--space-2)">
                        <Chip
                          variant="faded"
                          color="primary"
                          size="sm"
                          className="uppercase tracking-[0.16em]"
                        >
                          Member Scan
                        </Chip>
                        <AppBadge status={stageBadgeStatus}>
                          {scanMutation.isPending
                            ? 'SCANNING'
                            : fatalOperationalOutage
                              ? 'PAUSED'
                              : visitorCompletion
                                ? 'VISITOR COMPLETE'
                                : visitorFlowActive
                                  ? 'VISITOR ACTIVE'
                                  : resultTone === 'neutral'
                                    ? 'READY'
                                    : resultTone.toUpperCase()}
                        </AppBadge>
                      </div>

                      <div className="mt-(--space-3) flex items-start gap-(--space-3)">
                        <div className="rounded-box border border-primary/20 bg-primary-fadded p-(--space-3) text-primary-fadded-content">
                          <ScanLine className="h-8 w-8" />
                        </div>
                        <div className="max-w-3xl">
                          <AppCardTitle className="font-display text-2xl leading-tight">
                            {visitorFlowActive
                              ? 'Member scan display paused'
                              : fatalOperationalOutage
                                ? 'Member scan display unavailable'
                                : 'Member scan display'}
                          </AppCardTitle>
                          <AppCardDescription className="mt-(--space-1) text-sm leading-relaxed text-base-content/72">
                            {visitorFlowActive
                              ? 'Finish visitor check-in before the next member badge scan.'
                              : fatalOperationalOutage
                                ? 'Refresh the kiosk services before scanning badges again.'
                                : 'This screen updates automatically after each member scan.'}
                          </AppCardDescription>
                        </div>
                      </div>
                    </div>

                    <div className="w-full rounded-box border border-base-300 bg-base-200/55 p-(--space-4)">
                      <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                        External reader
                      </p>
                      <p className="mt-(--space-2) text-base font-semibold leading-tight">
                        {fatalOperationalOutage
                          ? 'Unavailable'
                          : visitorFlowActive
                            ? 'Waiting for visitor check-in to finish'
                            : 'Ready for the next badge'}
                      </p>
                      <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/72">
                        {fatalOperationalOutage
                          ? 'The kiosk cannot accept scans until the live services reconnect.'
                          : visitorFlowActive
                            ? 'Members can continue scanning once the visitor flow closes.'
                            : 'Members do not need to touch the screen. Staff fallback stays below only if the reader fails.'}
                      </p>
                    </div>
                  </div>
                </AppCardHeader>

                <AppCardContent
                  className="flex min-h-0 flex-1 flex-col gap-(--space-4)"
                  style={{ padding: 'var(--space-4) var(--space-5) var(--space-5)' }}
                >
                  {degradedOperationalData && !fatalOperationalOutage && (
                    <div role="alert" className="alert alert-warning alert-soft">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Live status is delayed.</p>
                        <p className="text-sm">
                          Member scans still work, but the readiness notices may be slightly behind.
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      'relative flex min-h-0 overflow-hidden rounded-box border p-(--space-6) shadow-[var(--shadow-1)]',
                      stageSurfaceClass
                    )}
                    role={resultTone === 'error' ? 'alert' : 'status'}
                    aria-live={
                      resultTone === 'error' || resultTone === 'warning' ? 'assertive' : 'polite'
                    }
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 w-2"
                      style={{
                        background:
                          resultTone === 'success'
                            ? 'var(--color-success)'
                            : resultTone === 'warning'
                              ? 'var(--color-warning)'
                              : resultTone === 'error'
                                ? 'var(--color-error)'
                                : resultTone === 'info'
                                  ? 'var(--color-info)'
                                  : 'var(--color-primary-fadded)',
                      }}
                    />

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={[
                          visitorFlowActive ? 'visitor-active' : 'visitor-idle',
                          visitorCompletion?.completedAt ?? 'no-visitor-complete',
                          result.title,
                          result.timestamp ?? 'no-time',
                          scanMutation.isPending ? 'pending' : 'settled',
                          fatalOperationalOutage ? 'fatal' : 'live',
                        ].join(':')}
                        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -14 }}
                        transition={motionTransition}
                        className="flex min-h-full flex-1 flex-col justify-between gap-(--space-6) pl-(--space-3)"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-(--space-4)">
                          <div className="max-w-4xl">
                            <p className="text-xs uppercase tracking-[0.22em] opacity-70">
                              {scanMutation.isPending ? 'Reading badge' : resultEyebrow}
                            </p>
                            <h2
                              className={cn(
                                'mt-(--space-2) pb-(--space-1) font-display text-base-content',
                                visitorFlowActive
                                  ? 'text-4xl leading-tight'
                                  : 'text-5xl leading-tight'
                              )}
                            >
                              {scanMutation.isPending ? 'Reading badge…' : resultTitle}
                            </h2>
                            <p className="mt-(--space-4) text-lg leading-relaxed opacity-85">
                              {scanMutation.isPending
                                ? 'Keep the badge steady at the external reader until the kiosk confirms the result.'
                                : resultMessage}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-(--space-2)">
                            {(scanMutation.isPending ||
                              fatalOperationalOutage ||
                              visitorFlowActive ||
                              visitorCompletion ||
                              resultTone !== 'neutral') && (
                              <AppBadge
                                status={scanMutation.isPending ? 'info' : stageBadgeStatus}
                                size="lg"
                                pulse={scanMutation.isPending}
                              >
                                {scanMutation.isPending
                                  ? 'SCANNING'
                                  : fatalOperationalOutage
                                    ? 'OFFLINE'
                                    : visitorFlowActive
                                      ? 'VISITOR MODE'
                                      : visitorCompletion
                                        ? 'COMPLETE'
                                        : resultTone.toUpperCase()}
                              </AppBadge>
                            )}
                            {resultDirection && (
                              <AppBadge
                                status={resultDirection === 'in' ? 'success' : 'warning'}
                                size="lg"
                              >
                                {resultDirection === 'in' ? 'CHECKED IN' : 'CHECKED OUT'}
                              </AppBadge>
                            )}
                          </div>
                        </div>

                        {visitorFlowActive ? (
                          <div className="grid gap-(--space-3) xl:grid-cols-2">
                            <div className="rounded-box border border-current/15 bg-base-100/70 px-(--space-4) py-(--space-4) text-base-content">
                              <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                                Current mode
                              </p>
                              <p className="mt-(--space-2) text-xl font-semibold leading-tight">
                                Visitor sign-in in progress
                              </p>
                              <p className="mt-(--space-2) text-sm leading-relaxed text-base-content/70">
                                Keep the visitor on the right-hand panel until the flow completes.
                              </p>
                            </div>
                            <div className="rounded-box border border-current/15 bg-base-100/70 px-(--space-4) py-(--space-4) text-base-content">
                              <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                                Member scanning
                              </p>
                              <p className="mt-(--space-2) text-xl font-semibold leading-tight">
                                Paused
                              </p>
                              <p className="mt-(--space-2) text-sm leading-relaxed text-base-content/70">
                                Member scans resume after the visitor flow is cancelled or finished.
                              </p>
                            </div>
                          </div>
                        ) : hasMeaningfulResult ? (
                          <div className="grid gap-(--space-3) xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
                            <div className="rounded-box border border-current/15 bg-base-100/70 px-(--space-4) py-(--space-4) text-base-content">
                              <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                                Most recent event
                              </p>
                              <p className="mt-(--space-2) text-xl font-semibold leading-tight">
                                {resultTimestamp
                                  ? formatTimestamp(resultTimestamp)
                                  : 'Waiting for the next scan'}
                              </p>
                              <p className="mt-(--space-2) text-sm leading-relaxed text-base-content/70">
                                {resultMemberName
                                  ? `${resultMemberName}${resultSerial ? ` • ${resultSerial}` : ''}`
                                  : scanMutation.isPending
                                    ? 'Resolving badge and member record.'
                                    : 'No member interaction has been recorded yet in this session.'}
                              </p>
                            </div>

                            <div className="rounded-box border border-current/15 bg-base-100/70 px-(--space-4) py-(--space-4) text-base-content">
                              <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                                Next action
                              </p>
                              <p className="mt-(--space-2) text-xl font-semibold leading-tight">
                                {primaryActionLabel}
                              </p>
                              <p className="mt-(--space-2) text-sm leading-relaxed text-base-content/70">
                                {fatalOperationalOutage
                                  ? 'Use Refresh Status first. If the kiosk stays offline, use the hidden maintenance controls.'
                                  : visitorCompletion
                                    ? 'The kiosk will reset automatically, or the next badge scan can begin immediately.'
                                    : visitorScanPromptVisible
                                      ? 'Use the visitor panel to begin the guided check-in steps.'
                                      : 'Keep the page focused so staff can recover with manual entry if the scanner ever fails.'}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-(--space-3)">
                          {visitorScanPromptVisible && !fatalOperationalOutage && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-lg"
                              onClick={() => {
                                setVisitorCompletion(null)
                                setVisitorFlowActive(true)
                              }}
                            >
                              <UserRoundPlus className="h-5 w-5" />
                              Start visitor sign-in
                            </button>
                          )}

                          {(fatalOperationalOutage || degradedOperationalData) && (
                            <button
                              type="button"
                              className="btn btn-outline btn-lg"
                              onClick={() => void refreshOperationalData()}
                            >
                              <RefreshCw className="h-5 w-5" />
                              Refresh services
                            </button>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {visitorFlowActive ? (
                    <div className="rounded-box border border-base-300 bg-base-200/50 p-(--space-4)">
                      <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                        Member scanning
                      </p>
                      <p className="mt-(--space-2) text-lg font-semibold leading-tight">
                        Paused while visitor check-in is active
                      </p>
                      <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/70">
                        The scanner lane and manual fallback will return as soon as the visitor flow
                        closes.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (scanningDisabled) return
                        setPendingLockup(null)
                        setShowLockupOptions(false)
                        scanMutation.mutate(serial)
                      }}
                      className="mt-(--space-4) grid gap-(--space-4) rounded-box border border-base-300 bg-base-200/50 p-(--space-4) xl:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="space-y-(--space-3)">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                            Staff fallback only
                          </p>
                          <p className="mt-(--space-2) text-lg font-semibold leading-tight">
                            Only use this if the external reader fails
                          </p>
                          <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/70">
                            Staff can type or paste the badge number manually if the scanner needs
                            recovery.
                          </p>
                        </div>

                        <input
                          ref={(node) => {
                            inputRef.current = node
                          }}
                          type="text"
                          className="input input-lg h-14 w-full border-base-300 bg-base-100 font-mono text-base tracking-[0.14em] uppercase placeholder:normal-case placeholder:tracking-normal"
                          placeholder={
                            fatalOperationalOutage ? 'Services unavailable' : 'Badge number'
                          }
                          value={serial}
                          autoComplete="off"
                          onChange={(event) => setSerial(event.target.value)}
                          disabled={scanningDisabled}
                          data-testid={TID.dashboard.kiosk.badgeInput}
                        />
                      </div>

                      <div className="flex flex-col justify-end gap-(--space-2)">
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm min-w-32 self-start"
                          disabled={scanningDisabled || !serial.trim()}
                          data-testid={TID.dashboard.kiosk.scanSubmit}
                        >
                          {scanMutation.isPending && <ButtonSpinner />}
                          Submit number
                        </button>
                        <p className="text-sm text-base-content/60">
                          {fatalOperationalOutage
                            ? 'Scanning will return after the kiosk reconnects.'
                            : 'Members should use the external reader, not this button.'}
                        </p>
                        {!fatalOperationalOutage && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm justify-start px-0"
                            onClick={() => refocusBadgeInput()}
                          >
                            Re-focus scanner field
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </AppCardContent>
              </AppCard>

              {(loadingCheckoutOptions || pendingLockup) && (
                <AppCard
                  status="warning"
                  className="border border-base-300 bg-base-100/95 shadow-[var(--shadow-2)] backdrop-blur-sm"
                >
                  <AppCardHeader className="gap-(--space-3)" style={{ padding: 'var(--space-5)' }}>
                    <div className="flex items-center gap-(--space-3)">
                      <LoadingSpinner size="sm" className="text-warning" />
                      <div>
                        <AppCardTitle className="font-display text-2xl">
                          Lockup resolution
                        </AppCardTitle>
                        <AppCardDescription className="text-sm text-base-content/70">
                          Preparing the required checkout options.
                        </AppCardDescription>
                      </div>
                    </div>
                  </AppCardHeader>
                  <AppCardContent style={{ padding: '0 var(--space-5) var(--space-5)' }}>
                    <div className="alert alert-warning alert-soft">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span>
                        {pendingLockup
                          ? `Preparing lockup options for ${pendingLockup.memberName}.`
                          : 'Waiting for lockup state.'}
                      </span>
                    </div>
                  </AppCardContent>
                </AppCard>
              )}
            </section>

            <aside className="min-h-0">
              <AnimatePresence mode="wait" initial={false}>
                {visitorFlowActive ? (
                  <motion.div
                    key="visitor-flow-active"
                    initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -14 }}
                    transition={motionTransition}
                    className="h-full min-h-full"
                  >
                    <AppCard
                      status="info"
                      className="flex h-full min-h-0 flex-col border border-base-300 bg-base-100/95 shadow-[var(--shadow-2)] backdrop-blur-sm"
                    >
                      <AppCardHeader
                        className="gap-(--space-3) border-b border-base-300"
                        style={{ padding: 'var(--space-5)' }}
                      >
                        <div className="flex flex-wrap items-center gap-(--space-2)">
                          <Chip
                            variant="faded"
                            color="secondary"
                            size="sm"
                            className="uppercase tracking-[0.16em]"
                          >
                            Visitor Sign-In
                          </Chip>
                          <AppBadge status="info">ACTIVE</AppBadge>
                        </div>
                        <div className="flex items-start gap-(--space-3)">
                          <div className="rounded-box border border-secondary/20 bg-secondary-fadded p-(--space-3) text-secondary-fadded-content">
                            <UserRoundPlus className="h-7 w-7" />
                          </div>
                          <div>
                            <AppCardTitle className="font-display text-3xl leading-tight text-base-content">
                              Visitor check-in
                            </AppCardTitle>
                            <AppCardDescription className="mt-(--space-2) text-sm leading-relaxed text-base-content/72">
                              Complete your visitor check-in here. Member scan confirmations return
                              when this flow closes.
                            </AppCardDescription>
                          </div>
                        </div>
                      </AppCardHeader>

                      <AppCardContent
                        className="min-h-0 flex-1 overflow-y-auto"
                        style={{ padding: 'var(--space-5)' }}
                      >
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
                            setResult(INITIAL_RESULT)
                          }}
                        />
                      </AppCardContent>
                    </AppCard>
                  </motion.div>
                ) : (
                  <motion.div
                    key="visitor-flow-idle"
                    initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -14 }}
                    transition={motionTransition}
                    className="h-full min-h-full"
                  >
                    <AppCard
                      status="info"
                      className="flex h-full min-h-0 flex-col border border-base-300 bg-base-100/95 shadow-[var(--shadow-2)] backdrop-blur-sm"
                    >
                      <AppCardHeader
                        className="gap-(--space-4)"
                        style={{ padding: 'var(--space-5)' }}
                      >
                        <div className="flex flex-wrap items-center gap-(--space-2)">
                          <Chip
                            variant="faded"
                            color="secondary"
                            size="sm"
                            className="uppercase tracking-[0.16em]"
                          >
                            Visitor Sign-In
                          </Chip>
                          <AppBadge status="info">READY</AppBadge>
                        </div>

                        <div className="flex items-start gap-(--space-3)">
                          <div className="rounded-box border border-secondary/20 bg-secondary-fadded p-(--space-3) text-secondary-fadded-content">
                            <UserRoundPlus className="h-7 w-7" />
                          </div>
                          <div>
                            <AppCardTitle className="font-display text-3xl leading-tight text-base-content">
                              Visitor check-in
                            </AppCardTitle>
                            <AppCardDescription className="mt-(--space-2) text-base leading-relaxed text-base-content/72">
                              Visitors can check themselves in here for family, recruiting,
                              contractor, and invited guest visits.
                            </AppCardDescription>
                          </div>
                        </div>

                        <div className="grid gap-(--space-3)">
                          <div className="rounded-box border border-base-300 bg-base-200/50 px-(--space-4) py-(--space-3)">
                            <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                              Step 1
                            </p>
                            <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/75">
                              Enter your details and the reason for your visit.
                            </p>
                          </div>
                          <div className="rounded-box border border-base-300 bg-base-200/50 px-(--space-4) py-(--space-3)">
                            <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                              Step 2
                            </p>
                            <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/75">
                              Review your visit and complete your visitor check-in.
                            </p>
                          </div>
                        </div>
                      </AppCardHeader>

                      <AppCardContent
                        className="mt-auto"
                        style={{ padding: '0 var(--space-5) var(--space-5)' }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary btn-xl h-auto min-h-24 w-full justify-between"
                          onClick={() => {
                            setVisitorCompletion(null)
                            setVisitorFlowActive(true)
                          }}
                          disabled={fatalOperationalOutage}
                        >
                          <span className="text-left">
                            <span className="block text-lg font-semibold">
                              Start visitor check-in
                            </span>
                            <span className="mt-(--space-1) block text-sm font-normal opacity-80">
                              Begin the guided self check-in steps
                            </span>
                          </span>
                          <ChevronRight className="h-6 w-6" />
                        </button>
                      </AppCardContent>
                    </AppCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </aside>
          </div>
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
