'use client'

import { apiClient } from '@/lib/api-client'
import type { AppBadgeStatus } from '@/components/ui/AppBadge'
import type { VisitorSelfSigninCompletion } from '@/components/kiosk/visitor-self-signin-flow'
import type { CheckinWithMemberResponse, CreateCheckinInput } from '@sentinel/contracts'
import type { useCurrentDds, useTonightDutyWatch } from '@/hooks/use-schedules'
import type { useLockupStatus } from '@/hooks/use-lockup'

export type ScanDirection = 'in' | 'out'
export type ResultTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

export interface ResultSnapshot {
  tone: ResultTone
  eyebrow: string
  title: string
  message: string
  memberId?: string
  memberName?: string
  direction?: ScanDirection
  serial?: string
  timestamp?: string
}

export interface AssignmentSummary {
  isDdsToday: boolean
  isDutyWatchToday: boolean
  upcomingDdsWeeks: string[]
  upcomingDutyWatchWeeks: string[]
}

export interface AssignmentBadge {
  tone: 'success' | 'warning' | 'error'
  label: string
}

export interface ResultPill {
  status: AppBadgeStatus
  label: string
  pulse: boolean
}

export interface PendingLockupCheckout {
  memberId: string
  memberName: string
  badgeId: string
  serial: string
}

export interface ResponsibilityContext {
  memberId: string
  memberName: string
}

export interface SuccessfulScan {
  type: 'success'
  serial: string
  memberId: string
  memberName: string
  direction: ScanDirection
  timestamp: string
}

export interface VisitorScan {
  type: 'visitor'
  serial: string
  message: string
}

export interface LockupScan {
  type: 'lockup'
  serial: string
  memberId: string
  memberName: string
  badgeId: string
  message: string
}

export interface VisitorCompletionState extends VisitorSelfSigninCompletion {
  completedAt: string
}

export interface DisplayMember {
  rank: string
  firstName: string
  lastName: string
}

export interface OperationalLead {
  roleLabel: 'Active DDS' | 'Scheduled DDS' | 'SWK' | 'DSWK'
  roleDescription: string
  member: DisplayMember | null
}

export interface ReadinessWarning {
  key: 'unit-secured' | 'dds-pending'
  label: string
  message: string
}

export interface KioskHealthIndicator {
  tone: 'success' | 'warning' | 'error' | 'info'
  label: string
  pulse: boolean
}

export type ScanMutationResult = SuccessfulScan | VisitorScan | LockupScan
export type DutyWatchData = ReturnType<typeof useTonightDutyWatch>['data']
export type ScheduledDdsData = ReturnType<typeof useCurrentDds>['data']
export type LockupStatusData = ReturnType<typeof useLockupStatus>['data']

export type CreateCheckinResult =
  | { kind: 'created'; checkin: CheckinWithMemberResponse }
  | { kind: 'lockup'; message: string }

export const KIOSK_ID = 'DASHBOARD_KIOSK'
export const BADGE_FOCUS_REQUEST_EVENT = 'kiosk-request-badge-focus'
export const KIOSK_RESULT_RESET_MS = 5000
export const MOTION_TIMING = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
} as const

export const ASSIGNMENT_SUMMARY_CACHE_MS = 5 * 60 * 1000

export const INITIAL_RESULT: ResultSnapshot = {
  tone: 'neutral',
  eyebrow: 'Scanner Ready',
  title: 'Awaiting next scan',
  message: 'The next badge result appears here automatically. Visitors tap Visitor Check-In.',
}

export function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }
  return fallback
}

export function formatOperationalMemberName(member: DisplayMember | null): string | null {
  if (!member) return null
  return `${member.rank} ${member.lastName}, ${member.firstName}`
}

export function toMemberName(checkin: CheckinWithMemberResponse, fallback: string): string {
  if (!checkin.member) return fallback
  return formatOperationalMemberName(checkin.member) ?? fallback
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatAssignmentDateShort(weekStartDate: string): string {
  return parseIsoDate(weekStartDate).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatClockLabel(date: Date): string {
  return date.toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

export function toneForDirection(direction: ScanDirection): ResultTone {
  return direction === 'in' ? 'success' : 'warning'
}

export function createEmptyAssignments(): AssignmentSummary {
  return {
    isDdsToday: false,
    isDutyWatchToday: false,
    upcomingDdsWeeks: [],
    upcomingDutyWatchWeeks: [],
  }
}

export async function fetchAssignmentSummary(memberId: string): Promise<AssignmentSummary> {
  const response = await apiClient.schedules.getMemberAssignmentSummary({
    params: { memberId },
  })

  if (response.status !== 200) {
    throw new Error('Failed to fetch assignment summary.')
  }

  return {
    isDdsToday: response.body.isDdsToday,
    isDutyWatchToday: response.body.isDutyWatchToday,
    upcomingDdsWeeks: response.body.upcomingDdsWeeks,
    upcomingDutyWatchWeeks: response.body.upcomingDutyWatchWeeks,
  }
}

export function getScheduledDdsLead(
  scheduledDds: ScheduledDdsData | undefined
): OperationalLead | null {
  const member = scheduledDds?.dds?.member ?? null
  if (!member) return null

  return {
    roleLabel: 'Scheduled DDS',
    roleDescription: 'Scheduled for today',
    member,
  }
}

export function getDutyWatchLead(
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

export function getAssignmentBadges(summary: AssignmentSummary | null): AssignmentBadge[] {
  if (!summary) return []

  const badges: AssignmentBadge[] = []

  if (summary.isDdsToday) {
    badges.push({ tone: 'success', label: 'DDS TODAY' })
  }

  if (summary.isDutyWatchToday) {
    badges.push({ tone: 'warning', label: 'DUTY WATCH TONIGHT' })
  }

  if (badges.length > 0) {
    return badges
  }

  const nextAssignments = [
    ...(summary.upcomingDdsWeeks[0]
      ? [{ tone: 'success' as const, label: 'NEXT DDS', date: summary.upcomingDdsWeeks[0] }]
      : []),
    ...(summary.upcomingDutyWatchWeeks[0]
      ? [
          {
            tone: 'warning' as const,
            label: 'NEXT DUTY WATCH',
            date: summary.upcomingDutyWatchWeeks[0],
          },
        ]
      : []),
  ].sort((left, right) => left.date.localeCompare(right.date))

  if (nextAssignments.length === 0) {
    return []
  }

  const nextAssignment = nextAssignments[0]
  return [
    {
      tone: nextAssignment.tone,
      label: `${nextAssignment.label}: ${formatAssignmentDateShort(nextAssignment.date)}`,
    },
  ]
}

export function resultToneToSurfaceClass(tone: ResultTone): string {
  if (tone === 'success' || tone === 'warning' || tone === 'error' || tone === 'info') {
    return 'border-base-300 bg-base-100 text-base-content'
  }
  return 'border-base-300 bg-base-100 text-base-content'
}

export async function createMemberCheckin(
  payload: CreateCheckinInput
): Promise<CreateCheckinResult> {
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
