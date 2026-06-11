import type { SecurityAlertResponse } from '@sentinel/contracts'
import type { AppAlertTone } from '@/components/ui/AppAlert'

const LOCKUP_FOLLOW_UP_ALERT_TYPES = [
  'lockup_reminder',
  'lockup_not_executed',
  'building_not_secured',
  'member_missed_checkout',
  'duty_watch_missing',
  'duty_watch_not_checked_in',
] as const

type SecurityAlertSeverity = SecurityAlertResponse['severity']

type SecurityAlertSingleDisplayItem = {
  kind: 'single'
  id: string
  alert: SecurityAlertResponse
  latestCreatedAt: string
  severity: SecurityAlertSeverity
}

type SecurityAlertGroupDisplayItem = {
  kind: 'group'
  id: 'lockup-follow-up'
  alerts: SecurityAlertResponse[]
  label: string
  summary: string
  nextStep: string
  wikiSlug: string
  latestCreatedAt: string
  severity: SecurityAlertSeverity
}

export type SecurityAlertDisplayItem =
  | SecurityAlertSingleDisplayItem
  | SecurityAlertGroupDisplayItem

function isLockupFollowUpAlert(alert: SecurityAlertResponse): boolean {
  return LOCKUP_FOLLOW_UP_ALERT_TYPES.includes(
    alert.alertType as (typeof LOCKUP_FOLLOW_UP_ALERT_TYPES)[number]
  )
}

function getAlertTimestamp(alert: SecurityAlertResponse): number {
  const timestamp = new Date(alert.createdAt).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getSeverityRank(severity: SecurityAlertSeverity): number {
  if (severity === 'critical') {
    return 3
  }

  if (severity === 'warning') {
    return 2
  }

  return 1
}

function sortByPriority<T extends { latestCreatedAt: string; severity: SecurityAlertSeverity }>(
  items: T[]
): T[] {
  return items.sort((a, b) => {
    const severityDelta = getSeverityRank(b.severity) - getSeverityRank(a.severity)
    if (severityDelta !== 0) {
      return severityDelta
    }

    return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
  })
}

function getLatestCreatedAt(alerts: SecurityAlertResponse[]): string {
  return alerts.reduce((latest, alert) => {
    if (!latest) {
      return alert.createdAt
    }

    return getAlertTimestamp(alert) > new Date(latest).getTime() ? alert.createdAt : latest
  }, '')
}

function getHighestSeverity(alerts: SecurityAlertResponse[]): SecurityAlertSeverity {
  if (alerts.some((alert) => alert.severity === 'critical')) {
    return 'critical'
  }

  if (alerts.some((alert) => alert.severity === 'warning')) {
    return 'warning'
  }

  return 'info'
}

function buildLockupSummary(alerts: SecurityAlertResponse[]): string {
  const alertTypes = new Set(alerts.map((alert) => alert.alertType))
  const reasons: string[] = []

  if (
    alertTypes.has('lockup_not_executed') ||
    alertTypes.has('lockup_reminder') ||
    alertTypes.has('building_not_secured')
  ) {
    reasons.push('lockup was not completed')
  }

  if (alertTypes.has('duty_watch_missing') || alertTypes.has('duty_watch_not_checked_in')) {
    reasons.push('duty watch coverage needs review')
  }

  if (alertTypes.has('member_missed_checkout')) {
    reasons.push('checkout cleanup ran')
  }

  const reasonText =
    reasons.length > 0 ? reasons.join('; ') : 'related operational follow-up is required'

  return `${alerts.length} related DDS alerts: ${reasonText}.`
}

function buildLockupNextStep(alerts: SecurityAlertResponse[]): string {
  const alertTypes = new Set(alerts.map((alert) => alert.alertType))

  if (alertTypes.has('lockup_not_executed') || alertTypes.has('building_not_secured')) {
    return 'Confirm the real building state, correct duty/watch or checkout records, then acknowledge with a note.'
  }

  return 'Review the duty/watch handoff and attendance cleanup before acknowledging.'
}

export function getSecurityAlertTone(severity: SecurityAlertSeverity): AppAlertTone {
  if (severity === 'critical') {
    return 'error'
  }

  if (severity === 'warning') {
    return 'warning'
  }

  return 'info'
}

export function buildSecurityAlertDisplayItems(
  alerts: SecurityAlertResponse[]
): SecurityAlertDisplayItem[] {
  const lockupFollowUpAlerts: SecurityAlertResponse[] = []
  const displayItems: SecurityAlertDisplayItem[] = []

  alerts.forEach((alert) => {
    if (isLockupFollowUpAlert(alert)) {
      lockupFollowUpAlerts.push(alert)
      return
    }

    displayItems.push({
      kind: 'single',
      id: alert.id,
      alert,
      latestCreatedAt: alert.createdAt,
      severity: alert.severity,
    })
  })

  if (lockupFollowUpAlerts.length === 1) {
    const [alert] = lockupFollowUpAlerts
    displayItems.push({
      kind: 'single',
      id: alert.id,
      alert,
      latestCreatedAt: alert.createdAt,
      severity: alert.severity,
    })
  } else if (lockupFollowUpAlerts.length > 1) {
    const newestFirst = [...lockupFollowUpAlerts].sort(
      (a, b) => getAlertTimestamp(b) - getAlertTimestamp(a)
    )

    displayItems.push({
      kind: 'group',
      id: 'lockup-follow-up',
      alerts: newestFirst,
      label: 'DDS Lockup Follow-up',
      summary: buildLockupSummary(lockupFollowUpAlerts),
      nextStep: buildLockupNextStep(lockupFollowUpAlerts),
      wikiSlug: 'operations/dashboard/alerts/missed-lockup-follow-up',
      latestCreatedAt: getLatestCreatedAt(lockupFollowUpAlerts),
      severity: getHighestSeverity(lockupFollowUpAlerts),
    })
  }

  return sortByPriority(displayItems)
}
