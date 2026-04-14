'use client'

/* global HTMLInputElement */

import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAcceptDds, useDdsStatus, useKioskResponsibilityState } from '@/hooks/use-dds'
import { useCheckoutOptions, useLockupStatus, useOpenBuilding } from '@/hooks/use-lockup'
import { useCurrentDds, useTonightDutyWatch } from '@/hooks/use-schedules'
import { useSystemStatus } from '@/hooks/use-system-status'
import { apiClient } from '@/lib/api-client'
import { invalidateDashboardQueries } from '@/lib/dashboard-query-invalidation'
import {
  ASSIGNMENT_SUMMARY_CACHE_MS,
  BADGE_FOCUS_REQUEST_EVENT,
  createEmptyAssignments,
  createMemberCheckin,
  extractErrorMessage,
  fetchAssignmentSummary,
  formatClockLabel,
  formatOperationalMemberName,
  formatTimestamp,
  getAssignmentBadges,
  getDutyWatchLead,
  getKioskConnectivityBadge,
  getScheduledDdsLead,
  INITIAL_RESULT,
  KIOSK_ID,
  KIOSK_RESULT_RESET_MS,
  resultToneToSurfaceClass,
  toneForDirection,
  toMemberName,
  type AssignmentBadge,
  type AssignmentSummary,
  type KioskHealthIndicator,
  type PendingLockupCheckout,
  type ReadinessWarning,
  type ResultPill,
  type ResultSnapshot,
  type ResponsibilityContext,
  type ScanDirection,
  type ScanMutationResult,
  type VisitorCompletionState,
} from './kiosk-domain'
import type { VisitorSelfSigninCompletion } from '@/components/kiosk/visitor-self-signin-flow'

export function useKioskScreen() {
  const inputRef = useRef<HTMLInputElement | null>(null)
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
  const [assignmentSummary, setAssignmentSummary] = useState<AssignmentSummary | null>(null)
  const [assignmentSummaryMemberId, setAssignmentSummaryMemberId] = useState<string | null>(null)

  const { data: checkoutOptions, isLoading: loadingCheckoutOptions } = useCheckoutOptions(
    pendingLockup?.memberId ?? ''
  )
  const systemStatusQuery = useSystemStatus()
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
  const activeDdsLead =
    liveDdsStatus?.assignment?.status === 'active'
      ? {
          roleLabel: 'Active DDS' as const,
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
  const healthIndicator: KioskHealthIndicator = fatalOperationalOutage
    ? { tone: 'error', label: 'Offline', pulse: false }
    : loadingOperationalData
      ? { tone: 'info', label: 'Syncing', pulse: true }
      : degradedOperationalData
        ? { tone: 'warning', label: 'Delayed', pulse: false }
        : { tone: 'success', label: 'Live', pulse: true }
  const connectivityBadge = getKioskConnectivityBadge({
    systemStatus: systemStatusQuery.data ?? null,
    isLoading: systemStatusQuery.isLoading,
    isError: systemStatusQuery.isError,
  })

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
    await Promise.allSettled([
      ...operationalQueries.map((query) => query.refetch()),
      scheduledDdsQuery.refetch(),
      tonightDutyWatchQuery.refetch(),
    ])
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
          memberId: scanResult.memberId,
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
        tone: toneForDirection(scanResult.direction),
        eyebrow: scanResult.direction === 'in' ? 'Check-In Recorded' : 'Check-Out Recorded',
        title: scanResult.memberName,
        message: `${scanResult.direction === 'in' ? 'Arrived' : 'Departed'} at ${formatTimestamp(scanResult.timestamp)}.`,
        memberId: scanResult.memberId,
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

  useEffect(() => {
    const memberId = result.memberId

    if (!memberId || visitorFlowActive || visitorCompletion) {
      setAssignmentSummary(null)
      setAssignmentSummaryMemberId(null)
      return
    }

    let cancelled = false
    const queryKey = ['kiosk-assignment-summary', memberId] as const
    const cachedSummary = queryClient.getQueryData<AssignmentSummary>(queryKey)

    setAssignmentSummary(cachedSummary ?? null)
    setAssignmentSummaryMemberId(cachedSummary ? memberId : null)

    void queryClient
      .fetchQuery({
        queryKey,
        queryFn: () => fetchAssignmentSummary(memberId),
        staleTime: ASSIGNMENT_SUMMARY_CACHE_MS,
      })
      .then((summary) => {
        if (cancelled) return
        setAssignmentSummary(summary)
        setAssignmentSummaryMemberId(memberId)
      })
      .catch(() => {
        if (cancelled) return
        setAssignmentSummary(createEmptyAssignments())
        setAssignmentSummaryMemberId(memberId)
      })

    return () => {
      cancelled = true
    }
  }, [queryClient, result.memberId, result.timestamp, visitorCompletion, visitorFlowActive])

  const resultTone = visitorCompletion ? 'success' : visitorFlowActive ? 'info' : result.tone
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
  const resultMemberId = visitorCompletion
    ? undefined
    : visitorFlowActive
      ? undefined
      : result.memberId
  const resultDirection = visitorCompletion
    ? undefined
    : visitorFlowActive
      ? undefined
      : result.direction
  const resultPill: ResultPill | null = scanMutation.isPending
    ? { status: 'info', label: 'SCANNING', pulse: true }
    : resultDirection === 'in'
      ? { status: 'success', label: 'CHECKED IN', pulse: false }
      : resultDirection === 'out'
        ? { status: 'error', label: 'CHECKED OUT', pulse: false }
        : fatalOperationalOutage
          ? { status: 'error', label: 'OFFLINE', pulse: false }
          : resultTone === 'error'
            ? { status: 'error', label: 'ERROR', pulse: false }
            : resultTone === 'warning'
              ? { status: 'warning', label: 'ATTENTION', pulse: false }
              : visitorCompletion
                ? { status: 'success', label: 'COMPLETE', pulse: false }
                : null
  const hasTodayAssignment = Boolean(
    assignmentSummary && (assignmentSummary.isDdsToday || assignmentSummary.isDutyWatchToday)
  )
  const assignmentBadges: AssignmentBadge[] = getAssignmentBadges(
    resultMemberId &&
      assignmentSummaryMemberId === resultMemberId &&
      !visitorFlowActive &&
      !visitorCompletion
      ? assignmentSummary
      : null
  )

  useEffect(() => {
    if (showLockupOptions || visitorFlowActive || scanMutation.isPending) return
    refocusBadgeInput()
  }, [showLockupOptions, visitorFlowActive, scanMutation.isPending])

  const submitCurrentSerial = () => {
    if (scanningDisabled) return

    const liveSerial = inputRef.current?.value ?? serial
    if (!liveSerial.trim()) return

    setPendingLockup(null)
    setShowLockupOptions(false)
    scanMutation.mutate(liveSerial)
  }

  const resolveLockupCheckout = async (action: 'transfer' | 'execute') => {
    if (!pendingLockup) return

    const checkoutContext = pendingLockup

    if (action === 'execute') {
      setPendingLockup(null)
      setShowLockupOptions(false)
      setResult({
        tone: 'warning',
        eyebrow: 'Lockup Completed',
        title: `${checkoutContext.memberName} checked out`,
        message:
          'Building lockup was executed. All remaining people were checked out and the building is secured.',
        memberId: checkoutContext.memberId,
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
          memberId: checkoutContext.memberId,
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
        tone: 'warning',
        eyebrow: 'Check-Out Recorded',
        title: toMemberName(createResult.checkin, checkoutContext.memberName),
        message: `Departed at ${formatTimestamp(createResult.checkin.timestamp)}.`,
        memberId: checkoutContext.memberId,
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
        memberId: checkoutContext.memberId,
        memberName: checkoutContext.memberName,
        direction: 'out',
        serial: checkoutContext.serial,
        timestamp: new Date().toISOString(),
      })
      refocusBadgeInput()
    }
  }

  const handleResponsibilitySubmit = async (action: 'open_building' | 'accept_dds') => {
    if (!responsibilityContext) return

    setResponsibilityError(null)

    try {
      if (action === 'accept_dds') {
        await acceptDdsMutation.mutateAsync(responsibilityContext.memberId)
        setResult({
          tone: 'success',
          eyebrow: 'DDS Accepted',
          title: responsibilityContext.memberName,
          message: 'DDS is now active for today and the unit is open.',
          memberId: responsibilityContext.memberId,
          memberName: responsibilityContext.memberName,
          direction: 'in',
          timestamp: new Date().toISOString(),
        })
        setResponsibilityContext(null)
        setResponsibilityDismissed(false)
      } else if (action === 'open_building') {
        await openBuildingMutation.mutateAsync({
          memberId: responsibilityContext.memberId,
        })
        setResult({
          tone: 'warning',
          eyebrow: 'Unit Opened',
          title: responsibilityContext.memberName,
          message: 'The unit is now open. DDS still needs to be accepted for today.',
          memberId: responsibilityContext.memberId,
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
        memberId: responsibilityContext.memberId,
        memberName: responsibilityContext.memberName,
        direction: 'in',
        timestamp: new Date().toISOString(),
      })
    }
  }

  const handleVisitorFlowStart = () => {
    setVisitorCompletion(null)
    setVisitorFlowActive(true)
  }

  const handleVisitorFlowCancel = () => {
    setVisitorFlowActive(false)
  }

  const handleVisitorFlowComplete = (completion: VisitorSelfSigninCompletion) => {
    setVisitorFlowActive(false)
    setVisitorCompletion({
      ...completion,
      completedAt: new Date().toISOString(),
    })
    setResult(INITIAL_RESULT)
  }

  return {
    prefersReducedMotion,
    fatalOperationalOutage,
    visitorFlowActive,
    header: {
      fatalOperationalOutage,
      connectivityBadge,
      clockLabel,
      healthIndicator,
      leadDisplay,
      leadDisplayName,
      leadDisplayLoading,
      loadingOperationalData,
      degradedOperationalData,
      readinessWarnings,
    },
    memberPanel: {
      fatalOperationalOutage,
      degradedOperationalData,
      loadingCheckoutOptions,
      pendingLockup,
      resultTone,
      stageSurfaceClass,
      scanPending: scanMutation.isPending,
      resultEyebrow,
      resultTitle,
      resultMessage,
      assignmentBadges,
      hasTodayAssignment,
      resultPill,
      visitorScanPromptVisible,
      visitorFlowActive,
      scanningDisabled,
      serial,
      onSerialChange: setSerial,
      onSubmitScan: submitCurrentSerial,
      onStartVisitorFlow: handleVisitorFlowStart,
      onRefreshOperationalData: () => void refreshOperationalData(),
      onRefocusBadgeInput: refocusBadgeInput,
      registerBadgeInputRef: (node: HTMLInputElement | null) => {
        inputRef.current = node
      },
    },
    visitorRail: {
      active: visitorFlowActive,
      fatalOperationalOutage,
      onStart: handleVisitorFlowStart,
      onCancel: handleVisitorFlowCancel,
      onComplete: handleVisitorFlowComplete,
    },
    responsibilityPrompt:
      responsibilityPromptVisible && responsibilityStateQuery.data
        ? {
            state: responsibilityStateQuery.data,
            isPending: responsibilityPending,
            errorMessage: responsibilityError,
            onDecline: handleResponsibilityDecline,
            onSubmit: handleResponsibilitySubmit,
          }
        : null,
    lockupModal:
      pendingLockup && checkoutOptions
        ? {
            open: showLockupOptions,
            memberId: pendingLockup.memberId,
            memberName: pendingLockup.memberName,
            checkoutOptions,
            onOpenChange: (nextOpen: boolean) => {
              setShowLockupOptions(nextOpen)
              if (!nextOpen) {
                setPendingLockup(null)
                refocusBadgeInput()
              }
            },
            onCheckoutComplete: resolveLockupCheckout,
          }
        : null,
  }
}
