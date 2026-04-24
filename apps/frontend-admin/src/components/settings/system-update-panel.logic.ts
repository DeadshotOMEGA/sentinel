import type {
  SystemStatusResponse,
  SystemUpdateCheckpoint,
  SystemUpdateJob,
  SystemUpdateStatusResponse,
} from '@sentinel/contracts'

const RETRYABLE_STATUSES = new Set<SystemUpdateJob['status']>([
  'failed',
  'rollback_attempted',
  'rolled_back',
])

type PrimaryPhaseKey =
  | 'prepare_update'
  | 'protect_current_system'
  | 'install_release'
  | 'bring_services_back'
  | 'verify_and_finalize'

interface PrimaryPhaseDefinition {
  key: PrimaryPhaseKey
  label: string
  description: string
}

const PRIMARY_PHASES: readonly PrimaryPhaseDefinition[] = [
  {
    key: 'prepare_update',
    label: 'Prepare update',
    description: 'Confirm the requested release and gather trusted metadata.',
  },
  {
    key: 'protect_current_system',
    label: 'Protect current system',
    description: 'Create recovery assets before applying the new release.',
  },
  {
    key: 'install_release',
    label: 'Install release',
    description: 'Download, verify, and install the requested Sentinel package.',
  },
  {
    key: 'bring_services_back',
    label: 'Bring services back',
    description: 'Pull updated images and restart the Sentinel stack.',
  },
  {
    key: 'verify_and_finalize',
    label: 'Verify and finalize',
    description: 'Run health checks and final appliance recovery tasks.',
  },
] as const
export type SystemUpdatePhaseViewState = 'complete' | 'active' | 'pending'

export interface SystemUpdatePhaseView {
  key: PrimaryPhaseKey
  label: string
  description: string
  state: SystemUpdatePhaseViewState
  caption: string
}

export type SystemUpdateStatusAlertTone = 'info' | 'success' | 'warning' | 'error'
export type SystemUpdateIconKey =
  | 'check'
  | 'clock'
  | 'database'
  | 'download'
  | 'rotate'
  | 'shield'
  | 'tag'
  | 'terminal'
  | 'warning'
  | 'x'

export interface SystemUpdateStatusAlertView {
  tone: SystemUpdateStatusAlertTone
  heading: string
  message: string
  dismissKey: string | null
}

export interface SystemUpdateHeroView {
  tone: SystemUpdateStatusAlertTone
  icon: SystemUpdateIconKey
  headline: string
  message: string
  badge: string
}

export interface SystemUpdateKpiView {
  tone: SystemUpdateStatusAlertTone | 'neutral'
  icon: SystemUpdateIconKey
  label: string
  value: string
  detail: string
}

export interface SystemUpdateTimelineItem {
  key: string
  tone: SystemUpdateStatusAlertTone | 'neutral'
  icon: SystemUpdateIconKey
  timestamp: string | null
  title: string
  detail: string
}

export interface SystemUpdateTraceDisplay {
  content: string
  displayedLineCount: number
  filteredProgressLineCount: number
  rows: SystemUpdateTraceRow[]
  summaryItems: SystemUpdateTraceSummaryItem[]
  severityCounts: Record<SystemUpdateTraceSeverity, number>
}

export type SystemUpdateTraceSeverity = 'success' | 'warning' | 'error' | 'info'

export interface SystemUpdateTraceRow {
  key: string
  timestamp: string | null
  time: string
  source: string
  level: string
  stream: string | null
  severity: SystemUpdateTraceSeverity
  message: string
  detail: string | null
  raw: string
}

export interface SystemUpdateTraceSummaryItem {
  key: string
  timestamp: string | null
  time: string
  severity: SystemUpdateTraceSeverity
  title: string
  detail: string | null
}

const HOTSPOT_WARNING_ISSUES = new Set<SystemStatusResponse['network']['issueCode']>([
  'telemetry_unavailable',
  'telemetry_stale',
  'hotspot_profile_missing',
  'approved_hotspot_adapter_missing',
  'scan_adapter_missing',
  'hotspot_not_visible',
])

const DOCKER_PROGRESS_LINE_PATTERN =
  /\bstderr:\s+[0-9a-f]{8,}\s+(?:Downloading|Extracting|Pulling fs layer|Download complete|Pull complete)\s+\S+\s*$/i
const READING_DATABASE_PROGRESS_LINE_PATTERN = /\bstdout:\s+\(Reading database \.\.\./
const TRACE_LINE_PATTERN = /^(\S+)\s+\[([^\]]+)]\s+\[([^\]]+)]\s+(?:(stdout|stderr):\s*)?(.*)$/
const SUCCESS_MESSAGE_PATTERN =
  /\b(backup complete|completed successfully|database healthy|health check passed|installed successfully|job completed|services restarted|update complete|updated to)\b/i
const SUMMARY_MESSAGE_PATTERN =
  /\b(backup|completed|database|failed|health|hotspot|installed|restarted|rollback|success|updated|warning)\b/i

function compareVersionTags(left: string, right: string): number {
  const parse = (tag: string): [number, number, number] => {
    const cleaned = tag.startsWith('v') ? tag.slice(1) : tag
    const [majorRaw, minorRaw, patchRaw] = cleaned.split('.')

    const major = Number.parseInt(majorRaw ?? '0', 10)
    const minor = Number.parseInt(minorRaw ?? '0', 10)
    const patch = Number.parseInt(patchRaw ?? '0', 10)

    return [
      Number.isNaN(major) ? 0 : major,
      Number.isNaN(minor) ? 0 : minor,
      Number.isNaN(patch) ? 0 : patch,
    ]
  }

  const leftParts = parse(left)
  const rightParts = parse(right)

  for (let index = 0; index < leftParts.length; index += 1) {
    const leftPart = leftParts[index]
    const rightPart = rightParts[index]
    if (leftPart === undefined || rightPart === undefined) {
      continue
    }

    const delta = leftPart - rightPart
    if (delta !== 0) {
      return delta
    }
  }

  return 0
}

export function formatSystemUpdateStatusLabel(status: SystemUpdateJob['status']): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

export function isSystemUpdateJobTerminal(job: SystemUpdateJob | null): boolean {
  if (!job) {
    return true
  }

  if (job.status === 'rollback_attempted') {
    return job.finishedAt !== null
  }

  return job.status === 'completed' || job.status === 'failed' || job.status === 'rolled_back'
}

export function isSystemUpdateJobFailure(job: SystemUpdateJob | null): boolean {
  if (!job) {
    return false
  }

  return (
    job.status === 'failed' || job.status === 'rollback_attempted' || job.status === 'rolled_back'
  )
}

export function getSystemUpdateResultAlertKey(job: SystemUpdateJob): string {
  return `${job.jobId}:${job.status}`
}

function getSystemUpdateStatusAlertTone(job: SystemUpdateJob): SystemUpdateStatusAlertTone {
  if (!isSystemUpdateJobTerminal(job)) {
    return job.phase.kind === 'recovery' ? 'warning' : 'info'
  }

  if (job.status === 'completed') {
    return 'success'
  }

  if (job.status === 'failed') {
    return 'error'
  }

  if (job.status === 'rollback_attempted' || job.status === 'rolled_back') {
    return 'warning'
  }

  return 'info'
}

function getSystemUpdateStatusAlertHeading(
  job: SystemUpdateJob | null,
  updateAvailable: boolean
): string {
  if (job && !isSystemUpdateJobTerminal(job)) {
    if (job.phase.kind === 'recovery') {
      return 'Rollback in progress'
    }

    return `Updating to ${job.targetVersion}`
  }

  if (job?.status === 'rolled_back') {
    return `Update ${job.targetVersion} rolled back`
  }

  if (job?.status === 'rollback_attempted') {
    return 'Rollback needs operator attention'
  }

  if (job?.status === 'failed') {
    return `Update ${job.targetVersion} failed`
  }

  if (job?.status === 'completed') {
    return `Sentinel updated to ${job.targetVersion}`
  }

  if (updateAvailable) {
    return 'A newer Sentinel release is available'
  }

  return 'Sentinel is up to date'
}

export function getSystemUpdateStatusAlertView(input: {
  job: SystemUpdateJob | null
  updateAvailable: boolean
  dismissedResultAlertKeys: ReadonlySet<string>
  latestVersion: string | null
}): SystemUpdateStatusAlertView | null {
  const { job, updateAvailable, dismissedResultAlertKeys, latestVersion } = input

  if (job) {
    const dismissKey = isSystemUpdateJobTerminal(job) ? getSystemUpdateResultAlertKey(job) : null

    if (dismissKey && dismissedResultAlertKeys.has(dismissKey)) {
      return null
    }

    return {
      tone: getSystemUpdateStatusAlertTone(job),
      heading: getSystemUpdateStatusAlertHeading(job, updateAvailable),
      message: job.message,
      dismissKey,
    }
  }

  if (updateAvailable) {
    return {
      tone: 'info',
      heading: getSystemUpdateStatusAlertHeading(null, updateAvailable),
      message: latestVersion
        ? `Sentinel ${latestVersion} is available for this appliance.`
        : 'A newer stable Sentinel release is available for this appliance.',
      dismissKey: null,
    }
  }

  return null
}

export function hasHotspotWarning(systemStatus: SystemStatusResponse | null): boolean {
  const issueCode = systemStatus?.network.issueCode

  return issueCode ? HOTSPOT_WARNING_ISSUES.has(issueCode) : false
}

export function getUpdateHeroView(input: {
  status: Pick<
    SystemUpdateStatusResponse,
    'currentVersion' | 'latestVersion' | 'updateAvailable' | 'currentJob'
  >
}): SystemUpdateHeroView {
  const { status } = input
  const job = status.currentJob

  if (job && !isSystemUpdateJobTerminal(job)) {
    if (job.phase.kind === 'recovery') {
      return {
        tone: 'warning',
        icon: 'rotate',
        headline: 'Sentinel is recovering an update',
        message: job.message,
        badge: job.phase.label,
      }
    }

    return {
      tone: 'info',
      icon: 'download',
      headline: `Updating to ${job.targetVersion}`,
      message: job.checkpoint.detail,
      badge: job.phase.label,
    }
  }

  if (job?.status === 'completed') {
    return {
      tone: 'success',
      icon: 'check',
      headline: `Sentinel updated to ${job.targetVersion}`,
      message:
        'Version installed successfully. No action is needed until a newer release is published.',
      badge: 'Updated',
    }
  }

  if (job?.status === 'failed') {
    return {
      tone: 'error',
      icon: 'x',
      headline: `Update ${job.targetVersion} failed`,
      message: job.failureSummary ?? job.message,
      badge: 'Attention required',
    }
  }

  if (job?.status === 'rolled_back' || job?.status === 'rollback_attempted') {
    return {
      tone: 'warning',
      icon: 'rotate',
      headline:
        job.status === 'rolled_back'
          ? `Update ${job.targetVersion} rolled back`
          : 'Rollback needs operator attention',
      message: job.message,
      badge: 'Review',
    }
  }

  if (status.updateAvailable) {
    return {
      tone: 'info',
      icon: 'download',
      headline: 'A newer Sentinel release is available',
      message: status.latestVersion
        ? `Sentinel ${status.latestVersion} is ready for this appliance.`
        : 'A newer stable Sentinel release is ready for this appliance.',
      badge: 'Update available',
    }
  }

  return {
    tone: 'success',
    icon: 'check',
    headline: 'Sentinel is up to date',
    message: status.currentVersion
      ? `Version ${status.currentVersion} is installed successfully.`
      : 'The installed Sentinel version is current.',
    badge: 'Current',
  }
}

export function getSystemHealthKpi(input: {
  systemStatus: SystemStatusResponse | null
  isLoading: boolean
  isError: boolean
}): SystemUpdateKpiView {
  const { systemStatus, isLoading, isError } = input

  if (isLoading) {
    return {
      tone: 'neutral',
      icon: 'clock',
      label: 'System health',
      value: 'Checking',
      detail: 'Loading appliance health.',
    }
  }

  if (isError || !systemStatus) {
    return {
      tone: 'warning',
      icon: 'warning',
      label: 'System health',
      value: 'Unknown',
      detail: 'Unable to load system health.',
    }
  }

  if (systemStatus.overall.status === 'healthy') {
    return {
      tone: 'success',
      icon: 'shield',
      label: 'System health',
      value: systemStatus.overall.label,
      detail: systemStatus.network.message,
    }
  }

  if (systemStatus.overall.status === 'error') {
    return {
      tone: 'error',
      icon: 'x',
      label: 'System health',
      value: systemStatus.overall.label,
      detail: systemStatus.network.message,
    }
  }

  return {
    tone: 'warning',
    icon: 'warning',
    label: 'System health',
    value: systemStatus.overall.label,
    detail: systemStatus.network.message,
  }
}

export function getUpdateTimelineItems(input: {
  currentJob: SystemUpdateJob | null
  phaseProgress: readonly SystemUpdatePhaseView[]
  systemStatus: SystemStatusResponse | null
}): SystemUpdateTimelineItem[] {
  const { currentJob, phaseProgress, systemStatus } = input
  const items: SystemUpdateTimelineItem[] = []

  if (!currentJob) {
    items.push({
      key: 'idle',
      tone: 'success',
      icon: 'check',
      timestamp: null,
      title: 'No update running',
      detail: 'Sentinel will show update milestones here when an update starts.',
    })
  } else {
    items.push({
      key: 'requested',
      tone: 'info',
      icon: 'download',
      timestamp: currentJob.requestedAt,
      title: `Requested ${currentJob.targetVersion}`,
      detail: `Requested by ${currentJob.requestedBy.memberName}.`,
    })

    if (currentJob.startedAt) {
      items.push({
        key: 'started',
        tone: 'info',
        icon: 'clock',
        timestamp: currentJob.startedAt,
        title: 'Updater started',
        detail: 'The host appliance updater accepted the request.',
      })
    }

    if (!isSystemUpdateJobTerminal(currentJob)) {
      items.push({
        key: 'active-checkpoint',
        tone: currentJob.phase.kind === 'recovery' ? 'warning' : 'info',
        icon: currentJob.phase.kind === 'recovery' ? 'rotate' : 'terminal',
        timestamp: null,
        title: currentJob.checkpoint.label,
        detail: currentJob.checkpoint.detail,
      })
    } else {
      const finalTone = getSystemUpdateStatusAlertTone(currentJob)
      items.push({
        key: 'finished',
        tone: finalTone,
        icon: finalTone === 'success' ? 'check' : finalTone === 'error' ? 'x' : 'rotate',
        timestamp: currentJob.finishedAt ?? currentJob.startedAt,
        title: formatSystemUpdateStatusLabel(currentJob.status),
        detail: currentJob.failureSummary ?? currentJob.message,
      })
    }

    const completedPhase = [...phaseProgress].reverse().find((phase) => phase.state === 'complete')
    if (completedPhase && items.length < 4 && !isSystemUpdateJobTerminal(currentJob)) {
      items.splice(Math.max(items.length - 1, 1), 0, {
        key: `phase-${completedPhase.key}`,
        tone: 'success',
        icon: 'check',
        timestamp: null,
        title: completedPhase.label,
        detail: completedPhase.caption,
      })
    }
  }

  if (hasHotspotWarning(systemStatus)) {
    items.push({
      key: 'hotspot-warning',
      tone: 'warning',
      icon: 'warning',
      timestamp: systemStatus?.network.generatedAt ?? null,
      title: 'Hotspot profile needs attention',
      detail: systemStatus?.network.message ?? 'Review host hotspot recovery before field use.',
    })
  }

  return items.slice(0, 5)
}

export function shouldAutoOpenSystemUpdateTraceLog(job: SystemUpdateJob | null): boolean {
  if (!job) {
    return false
  }

  return !isSystemUpdateJobTerminal(job) || isSystemUpdateJobFailure(job)
}

export function getSystemUpdateTraceDisplay(content: string): SystemUpdateTraceDisplay {
  if (content.length === 0) {
    return {
      content: '',
      displayedLineCount: 0,
      filteredProgressLineCount: 0,
      rows: [],
      summaryItems: [],
      severityCounts: {
        success: 0,
        warning: 0,
        error: 0,
        info: 0,
      },
    }
  }

  const lines = content.split(/\r?\n/)
  const visibleLines: string[] = []
  let filteredProgressLineCount = 0
  let pendingReadingDatabaseLine: string | null = null

  const flushReadingDatabaseLine = () => {
    if (pendingReadingDatabaseLine === null) {
      return
    }

    visibleLines.push(pendingReadingDatabaseLine)
    pendingReadingDatabaseLine = null
  }

  for (const line of lines) {
    if (DOCKER_PROGRESS_LINE_PATTERN.test(line)) {
      filteredProgressLineCount += 1
      continue
    }

    if (READING_DATABASE_PROGRESS_LINE_PATTERN.test(line)) {
      if (pendingReadingDatabaseLine !== null) {
        filteredProgressLineCount += 1
      }

      pendingReadingDatabaseLine = line
      continue
    }

    flushReadingDatabaseLine()
    visibleLines.push(line)
  }

  flushReadingDatabaseLine()

  return {
    content: visibleLines.join('\n'),
    displayedLineCount:
      visibleLines.length === 1 && visibleLines[0] === '' ? 0 : visibleLines.length,
    filteredProgressLineCount,
    ...buildSystemUpdateTraceViews(visibleLines),
  }
}

function buildSystemUpdateTraceViews(
  visibleLines: readonly string[]
): Pick<SystemUpdateTraceDisplay, 'rows' | 'summaryItems' | 'severityCounts'> {
  const rows: SystemUpdateTraceRow[] = []

  for (const line of visibleLines) {
    const parsedLine = parseSystemUpdateTraceLine(line, rows.length)
    if (parsedLine) {
      rows.push(parsedLine)
      continue
    }

    const previousRow = rows.at(-1)
    if (previousRow) {
      previousRow.detail = previousRow.detail ? `${previousRow.detail}\n${line}` : line
    }
  }

  const severityCounts: Record<SystemUpdateTraceSeverity, number> = {
    success: 0,
    warning: 0,
    error: 0,
    info: 0,
  }

  for (const row of rows) {
    severityCounts[row.severity] += 1
  }

  const summaryRows = rows
    .filter(
      (row) =>
        row.severity !== 'info' ||
        SUCCESS_MESSAGE_PATTERN.test(row.message) ||
        SUMMARY_MESSAGE_PATTERN.test(row.message)
    )
    .slice(-8)

  return {
    rows,
    summaryItems: summaryRows.map((row) => ({
      key: row.key,
      timestamp: row.timestamp,
      time: row.time,
      severity: row.severity,
      title: row.message,
      detail: row.detail ?? `source: ${row.source}${row.stream ? ` ${row.stream}` : ''}`,
    })),
    severityCounts,
  }
}

function parseSystemUpdateTraceLine(line: string, index: number): SystemUpdateTraceRow | null {
  const match = TRACE_LINE_PATTERN.exec(line)
  if (!match) {
    return null
  }

  const [, timestamp = null, source = 'updater', level = 'INFO', stream = null, message = ''] =
    match
  const normalizedLevel = level.toUpperCase()
  const trimmedMessage = message.trim()

  return {
    key: `${timestamp ?? 'trace'}:${index}`,
    timestamp,
    time: formatSystemUpdateTraceTime(timestamp),
    source,
    level: normalizedLevel,
    stream,
    severity: getSystemUpdateTraceSeverity(normalizedLevel, trimmedMessage),
    message: trimmedMessage,
    detail: null,
    raw: line,
  }
}

function getSystemUpdateTraceSeverity(level: string, message: string): SystemUpdateTraceSeverity {
  if (
    level.includes('ERROR') ||
    level.includes('FAIL') ||
    /\b(failed|fatal|error)\b/i.test(message)
  ) {
    return 'error'
  }

  if (level.includes('WARN') || /\b(warning|degraded|attention)\b/i.test(message)) {
    return 'warning'
  }

  if (SUCCESS_MESSAGE_PATTERN.test(message)) {
    return 'success'
  }

  return 'info'
}

function formatSystemUpdateTraceTime(timestamp: string | null): string {
  if (!timestamp) {
    return '--:--:--'
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function findPrimaryPhaseIndex(job: SystemUpdateJob | null): number {
  if (!job) {
    return -1
  }

  if (job.phase.kind === 'primary') {
    return PRIMARY_PHASES.findIndex((phase) => phase.key === job.phase.key)
  }

  if (
    job.status === 'completed' ||
    job.status === 'rollback_attempted' ||
    job.status === 'rolled_back'
  ) {
    return PRIMARY_PHASES.length - 1
  }

  return -1
}

export function getSystemUpdatePhaseProgress(job: SystemUpdateJob | null): SystemUpdatePhaseView[] {
  const activeIndex = findPrimaryPhaseIndex(job)
  const isTerminal = isSystemUpdateJobTerminal(job)

  return PRIMARY_PHASES.map((phase, index) => {
    const isActive =
      job !== null && !isTerminal && job.phase.kind === 'primary' && phase.key === job.phase.key

    const isComplete =
      job !== null &&
      (job.status === 'completed'
        ? index <= activeIndex
        : job.phase.kind === 'recovery'
          ? index <= activeIndex
          : index < activeIndex)

    let caption = phase.description
    if (isActive) {
      caption = job.checkpoint.detail
    } else if (isComplete) {
      caption = 'Completed'
    }

    return {
      key: phase.key,
      label: phase.label,
      description: phase.description,
      state: isActive ? 'active' : isComplete ? 'complete' : 'pending',
      caption,
    }
  })
}

export function getSystemUpdateActiveCheckpoint(
  job: SystemUpdateJob | null
): SystemUpdateCheckpoint | null {
  return job?.checkpoint ?? null
}

export function getRetryableTargetVersion(
  currentJob: SystemUpdateJob | null,
  currentVersion: string | null
): string | null {
  if (!currentJob || !RETRYABLE_STATUSES.has(currentJob.status)) {
    return null
  }

  if (!currentVersion) {
    return currentJob.targetVersion
  }

  return compareVersionTags(currentJob.targetVersion, currentVersion) > 0
    ? currentJob.targetVersion
    : null
}

export function getPreferredUpdateTargetVersion(
  status: Pick<SystemUpdateStatusResponse, 'currentVersion' | 'latestVersion'>,
  currentJob: SystemUpdateJob | null
): string | null {
  if (status.latestVersion) {
    if (
      !status.currentVersion ||
      compareVersionTags(status.latestVersion, status.currentVersion) > 0
    ) {
      return status.latestVersion
    }
  }

  return getRetryableTargetVersion(currentJob, status.currentVersion)
}
