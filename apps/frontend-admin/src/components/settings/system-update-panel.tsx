'use client'

import { useEffect, useRef, useState, type ComponentProps, type ComponentType } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CircleCheckBig,
  CircleX,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  RotateCcw,
  ServerCog,
  ShieldCheck,
  Tag,
  Terminal,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppAlert } from '@/components/ui/AppAlert'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  useRefreshSystemUpdateStatus,
  useStartSystemUpdate,
  useSystemUpdateStatus,
  useSystemUpdateTrace,
} from '@/hooks/use-system-update'
import { useHostHotspotRecovery } from '@/hooks/use-network-settings'
import { useSystemStatus } from '@/hooks/use-system-status'
import { TID } from '@/lib/test-ids'
import { AccountLevel, useAuthStore } from '@/store/auth-store'
import {
  formatSystemUpdateStatusLabel,
  getSystemHealthKpi,
  getPreferredUpdateTargetVersion,
  getSystemUpdatePhaseProgress,
  getSystemUpdateTraceDisplay,
  getUpdateHeroView,
  getUpdateTimelineItems,
  hasHotspotWarning,
  isSystemUpdateJobTerminal,
  shouldAutoOpenSystemUpdateTraceLog,
  type SystemUpdateIconKey,
  type SystemUpdateStatusAlertTone,
  type SystemUpdateTraceSeverity,
} from './system-update-panel.logic'

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Not yet recorded'
  }

  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return 'Unknown'
  }

  return timestamp.toLocaleString()
}

function formatReleaseNotesTimestamp(value: string | null): string {
  if (!value) {
    return 'Unknown'
  }

  return formatTimestamp(value)
}

function formatShortTimestamp(value: string | null): string {
  if (!value) {
    return 'Now'
  }

  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return 'Unknown'
  }

  return timestamp.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const toneSurfaceClasses: Record<SystemUpdateStatusAlertTone | 'neutral', string> = {
  success: 'border-2 border-success/55 bg-base-100 text-base-content',
  warning: 'bg-warning/15 text-base-content',
  error: 'bg-error/12 text-base-content',
  info: 'bg-info/12 text-base-content',
  neutral: 'bg-neutral/10 text-base-content',
}

const heroSurfaceClasses: Record<SystemUpdateStatusAlertTone, string> = {
  success:
    'border border-l-4 border-success/35 border-l-success bg-success/10 text-base-content shadow-[var(--shadow-3)]',
  warning:
    'border border-l-4 border-warning/45 border-l-warning bg-warning/15 text-base-content shadow-[var(--shadow-3)]',
  error:
    'border border-l-4 border-error/45 border-l-error bg-error/12 text-base-content shadow-[var(--shadow-3)]',
  info: 'border border-l-4 border-info/40 border-l-info bg-info/12 text-base-content shadow-[var(--shadow-3)]',
}

const toneBadgeStatus: Record<
  SystemUpdateStatusAlertTone | 'neutral',
  ComponentProps<typeof AppBadge>['status']
> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'neutral',
}

const toneDotClasses: Record<SystemUpdateStatusAlertTone | 'neutral', string> = {
  success: 'bg-success ring-success/25',
  warning: 'bg-warning ring-warning/35',
  error: 'bg-error ring-error/35',
  info: 'bg-info ring-info/25',
  neutral: 'bg-neutral ring-neutral/25',
}

const iconMap: Record<SystemUpdateIconKey, ComponentType<{ className?: string }>> = {
  check: CircleCheckBig,
  clock: Clock3,
  database: Database,
  download: Download,
  rotate: RotateCcw,
  shield: ShieldCheck,
  tag: Tag,
  terminal: Terminal,
  warning: TriangleAlert,
  x: CircleX,
}

const traceSeverityBadgeStatus: Record<
  SystemUpdateTraceSeverity,
  ComponentProps<typeof AppBadge>['status']
> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'neutral',
}

const traceSeverityRowClasses: Record<SystemUpdateTraceSeverity, string> = {
  success: 'border-l-success bg-success/10',
  warning: 'border-l-warning bg-warning/15',
  error: 'border-l-error bg-error/12',
  info: 'border-l-base-400 bg-base-100',
}

function renderIcon(icon: SystemUpdateIconKey, className: string) {
  const Icon = iconMap[icon]

  return <Icon aria-hidden="true" className={className} />
}

export function SystemUpdatePanel() {
  const member = useAuthStore((state) => state.member)
  const canStartUpdates = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN
  const searchParams = useSearchParams()
  const traceRequested = searchParams.get('trace') === 'open'
  const [isHydrated, setIsHydrated] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false)
  const [tracePanelOpen, setTracePanelOpen] = useState(traceRequested)
  const [traceView, setTraceView] = useState<'summary' | 'raw'>('summary')
  const [traceSeverityFilter, setTraceSeverityFilter] = useState<SystemUpdateTraceSeverity | 'all'>(
    'all'
  )
  const [traceSearch, setTraceSearch] = useState('')
  const traceContentRef = useRef<globalThis.HTMLPreElement | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsHydrated(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const systemUpdateQuery = useSystemUpdateStatus({
    enabled: isHydrated && Boolean(member),
    refetchIntervalMs: 5_000,
  })
  const systemStatusQuery = useSystemStatus({
    enabled: isHydrated && Boolean(member),
  })
  const startSystemUpdate = useStartSystemUpdate()
  const refreshSystemUpdate = useRefreshSystemUpdateStatus()
  const hostHotspotRecovery = useHostHotspotRecovery()

  const status = systemUpdateQuery.data ?? null
  const currentJob = status?.currentJob ?? null
  const awaitingSessionContext = !isHydrated || (!member && !status && !systemUpdateQuery.isError)
  const hasActiveJob = currentJob ? !isSystemUpdateJobTerminal(currentJob) : false
  const autoOpenTraceLog = shouldAutoOpenSystemUpdateTraceLog(currentJob)
  const preferredTargetVersion = status ? getPreferredUpdateTargetVersion(status, currentJob) : null
  const phaseProgress = getSystemUpdatePhaseProgress(currentJob)
  const cachedReleaseNotes = status?.latestReleaseNotes ?? null
  const retryingLastTarget =
    status !== null && status.latestVersion === null && preferredTargetVersion !== null
  const startActionLabel = hasActiveJob
    ? 'Update in progress'
    : !canStartUpdates
      ? 'Admin required'
      : preferredTargetVersion === null
        ? status?.latestVersion === null
          ? 'No update target'
          : 'Up to date'
        : retryingLastTarget
          ? `Retry ${preferredTargetVersion}`
          : `Update to ${preferredTargetVersion}`
  const confirmActionLabel =
    preferredTargetVersion === null
      ? 'Start update'
      : retryingLastTarget
        ? `Retry ${preferredTargetVersion}`
        : `Start update to ${preferredTargetVersion}`
  const canStartNow =
    canStartUpdates &&
    preferredTargetVersion !== null &&
    !hasActiveJob &&
    !startSystemUpdate.isPending
  const traceQuery = useSystemUpdateTrace({
    enabled: isHydrated && Boolean(member) && canStartUpdates && tracePanelOpen,
    refetchIntervalMs: tracePanelOpen && hasActiveJob ? 5_000 : false,
  })

  useEffect(() => {
    if (autoOpenTraceLog) {
      const timeoutId = window.setTimeout(() => {
        setTracePanelOpen(true)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    return undefined
  }, [autoOpenTraceLog, currentJob?.jobId, currentJob?.status])

  useEffect(() => {
    if (traceRequested) {
      const timeoutId = window.setTimeout(() => {
        setTracePanelOpen(true)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    return undefined
  }, [traceRequested])

  useEffect(() => {
    if (!tracePanelOpen || !traceQuery.data?.available) {
      return
    }

    const element = traceContentRef.current
    if (!element) {
      return
    }

    element.scrollTop = element.scrollHeight
  }, [tracePanelOpen, traceQuery.data?.available, traceQuery.data?.content])

  const handleRefresh = async () => {
    try {
      await refreshSystemUpdate.mutateAsync()
      if (tracePanelOpen && canStartUpdates) {
        await traceQuery.refetch()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh system update status')
    }
  }

  const handleStartUpdate = async () => {
    if (!preferredTargetVersion) {
      return
    }

    try {
      const result = await startSystemUpdate.mutateAsync({
        targetVersion: preferredTargetVersion,
      })
      setConfirmOpen(false)
      toast.success(result.message)
      await systemUpdateQuery.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start system update')
    }
  }

  const handleHostHotspotRecovery = async () => {
    try {
      const result = await hostHotspotRecovery.mutateAsync()
      toast.success(result.message)
      await systemStatusQuery.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to queue host hotspot recovery')
    }
  }

  const handleDownloadTrace = () => {
    if (!traceQuery.data?.available) {
      return
    }

    const blob = new globalThis.Blob([traceQuery.data.content], {
      type: 'text/plain;charset=utf-8',
    })
    const url = globalThis.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sentinel-update-trace.log'
    document.body.append(link)
    link.click()
    link.remove()
    globalThis.URL.revokeObjectURL(url)
  }

  if (awaitingSessionContext) {
    return (
      <AppCard>
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-(--space-2)">
            <ServerCog className="h-5 w-5" />
            Updates
          </AppCardTitle>
          <AppCardDescription>
            Restoring your authenticated Sentinel session before loading updater status.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent>
          <div className="flex items-center gap-(--space-3) text-sm text-base-content/70">
            <LoadingSpinner size="sm" className="text-base-content/60" />
            <span>Loading update progress from the appliance host.</span>
          </div>
        </AppCardContent>
      </AppCard>
    )
  }

  if (systemUpdateQuery.isLoading && !status) {
    return (
      <div className="flex items-center justify-center py-10">
        <LoadingSpinner size="md" className="text-base-content/60" />
      </div>
    )
  }

  if (systemUpdateQuery.isError || !status) {
    return (
      <AppCard>
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-(--space-2)">
            <ServerCog className="h-5 w-5" />
            Updates
          </AppCardTitle>
          <AppCardDescription>
            Unable to load Sentinel update status from the backend.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent>
          <AppAlert tone="error">
            {systemUpdateQuery.error instanceof Error
              ? systemUpdateQuery.error.message
              : 'Unknown error'}
          </AppAlert>
        </AppCardContent>
      </AppCard>
    )
  }

  const showLiveProgress = currentJob ? !isSystemUpdateJobTerminal(currentJob) : false
  const systemStatus = systemStatusQuery.data ?? null
  const heroView = getUpdateHeroView({ status })
  const systemHealthKpi = getSystemHealthKpi({
    systemStatus,
    isLoading: systemStatusQuery.isLoading,
    isError: systemStatusQuery.isError,
  })
  const timelineItems = getUpdateTimelineItems({
    currentJob,
    phaseProgress,
    systemStatus,
  })
  const traceDisplay = traceQuery.data?.available
    ? getSystemUpdateTraceDisplay(traceQuery.data.content)
    : null
  const normalizedTraceSearch = traceSearch.trim().toLowerCase()
  const filteredTraceRows =
    traceDisplay?.rows.filter((row) => {
      const matchesSeverity = traceSeverityFilter === 'all' || row.severity === traceSeverityFilter
      const matchesSearch =
        normalizedTraceSearch.length === 0 ||
        row.message.toLowerCase().includes(normalizedTraceSearch) ||
        row.detail?.toLowerCase().includes(normalizedTraceSearch) ||
        row.source.toLowerCase().includes(normalizedTraceSearch)

      return matchesSeverity && matchesSearch
    }) ?? []
  const filteredTraceSummaryItems =
    traceDisplay?.summaryItems.filter((item) => {
      const matchesSeverity = traceSeverityFilter === 'all' || item.severity === traceSeverityFilter
      const matchesSearch =
        normalizedTraceSearch.length === 0 ||
        item.title.toLowerCase().includes(normalizedTraceSearch) ||
        item.detail?.toLowerCase().includes(normalizedTraceSearch)

      return matchesSeverity && matchesSearch
    }) ?? []
  const hotspotNeedsAttention = hasHotspotWarning(systemStatus)
  const lastUpdateTime = currentJob
    ? (currentJob.finishedAt ?? currentJob.startedAt ?? currentJob.requestedAt)
    : null

  return (
    <div className="space-y-(--space-5)" data-testid={TID.settings.updates.panel}>
      <AppCard variant="elevated" className="overflow-hidden border-0 bg-base-300/35">
        <AppCardContent className="space-y-(--space-5) p-(--space-5)">
          <section
            aria-live="polite"
            className={`hero rounded-box ${heroSurfaceClasses[heroView.tone]}`}
          >
            <div className="hero-content w-full flex-col items-stretch justify-between gap-(--space-5) px-(--space-6) py-(--space-5) text-left xl:flex-row xl:items-center">
              <div className="flex min-w-0 items-start gap-(--space-4)">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-box bg-base-100 shadow-[var(--shadow-2)] ring-1 ring-base-content/10">
                  {renderIcon(heroView.icon, 'h-8 w-8')}
                </div>
                <div className="min-w-0 space-y-(--space-1)">
                  <div className="flex flex-wrap items-center gap-(--space-2)">
                    <h1 className="font-display text-4xl font-bold leading-tight text-base-content">
                      {heroView.headline}
                    </h1>
                    <AppBadge status={toneBadgeStatus[heroView.tone]} size="lg">
                      {heroView.badge}
                    </AppBadge>
                  </div>
                  <p className="max-w-3xl text-sm font-medium leading-relaxed text-base-content/70">
                    {heroView.message}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-(--space-2) rounded-box bg-base-100/70 p-1.5 shadow-[var(--shadow-1)] xl:ml-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-primary shadow-sm"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!canStartNow}
                  data-testid={TID.settings.updates.start}
                >
                  {startSystemUpdate.isPending ? (
                    <>
                      <LoadingSpinner size="xs" className="mr-2" />
                      Starting...
                    </>
                  ) : (
                    startActionLabel
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => void handleRefresh()}
                  disabled={systemUpdateQuery.isFetching || refreshSystemUpdate.isPending}
                  data-testid={TID.settings.updates.refresh}
                >
                  {systemUpdateQuery.isFetching || refreshSystemUpdate.isPending ? (
                    <LoadingSpinner size="xs" className="mr-2" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </button>
                {cachedReleaseNotes ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setReleaseNotesOpen(true)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Release notes
                  </button>
                ) : status.latestReleaseUrl ? (
                  <a
                    href={status.latestReleaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-ghost"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Release notes
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          {hotspotNeedsAttention && (
            <AppAlert
              tone="warning"
              heading="Hotspot profile needs attention"
              actions={
                canStartUpdates ? (
                  <button
                    type="button"
                    className="btn btn-xs btn-warning"
                    onClick={() => void handleHostHotspotRecovery()}
                    disabled={hostHotspotRecovery.isPending}
                  >
                    {hostHotspotRecovery.isPending ? 'Queueing...' : 'Repair hotspot'}
                  </button>
                ) : null
              }
            >
              {systemStatus?.network.message ??
                'Review the host hotspot before relying on field access.'}
            </AppAlert>
          )}

          {!canStartUpdates && (
            <AppAlert tone="warning" heading="Admin or Developer access required">
              You can view update status here, but only Admin or Developer accounts can start a new
              Sentinel update.
            </AppAlert>
          )}

          {retryingLastTarget && currentJob && (
            <AppAlert tone="info" heading="Retry target is still available">
              Latest release lookup is temporarily unavailable, but you can retry the last requested
              target {currentJob.targetVersion} from this page.
            </AppAlert>
          )}

          <section className="grid min-w-0 gap-(--space-3) xl:grid-cols-4">
            <div className="rounded-box border-l-4 border-neutral/35 bg-base-200/85 p-(--space-5) shadow-[var(--shadow-2)] xl:col-span-2">
              <div className="min-w-0">
                <p className="flex items-center gap-(--space-2) text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/55">
                  <Tag className="h-4 w-4" />
                  Installed version
                </p>
                <p className="mt-(--space-2) break-all font-mono text-5xl font-black leading-none text-base-content">
                  {status.currentVersion ?? 'Unknown'}
                </p>
                <div className="mt-(--space-2) flex w-fit flex-wrap items-center gap-(--space-2)">
                  <AppBadge status={status.updateAvailable ? 'info' : 'success'} size="sm">
                    {status.updateAvailable ? 'Update ready' : 'Current'}
                  </AppBadge>
                  <span className="text-xs font-medium text-base-content/62">
                    {status.updateAvailable
                      ? 'A newer stable release is ready.'
                      : 'Installed Sentinel package/runtime version.'}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`rounded-box p-(--space-5) shadow-[var(--shadow-2)] xl:col-span-2 ${toneSurfaceClasses[systemHealthKpi.tone]}`}
            >
              <div className="flex items-start gap-(--space-3)">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-box bg-base-100 shadow-[var(--shadow-1)]">
                  {renderIcon(systemHealthKpi.icon, 'h-6 w-6')}
                </div>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/50">
                    {systemHealthKpi.label}
                  </p>
                  <p className="mt-(--space-1) text-3xl font-bold leading-tight text-base-content">
                    {systemHealthKpi.value}
                  </p>
                  <p className="mt-(--space-1) text-xs font-medium text-base-content/58">
                    {systemHealthKpi.detail}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-box bg-base-100 p-(--space-4) shadow-[var(--shadow-1)] xl:col-span-2">
              <p className="flex items-center gap-(--space-2) text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/50">
                <Download className="h-4 w-4" />
                Latest stable
              </p>
              <p className="mt-(--space-2) break-all font-mono text-2xl font-bold text-base-content">
                {status.latestVersion ?? 'Unknown'}
              </p>
              <p className="mt-(--space-1) text-xs font-medium text-base-content/55">
                {cachedReleaseNotes ? (
                  <button
                    type="button"
                    className="link link-primary inline-flex items-center gap-1"
                    onClick={() => setReleaseNotesOpen(true)}
                  >
                    Cached release notes
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                ) : status.latestReleaseUrl ? (
                  <a
                    href={status.latestReleaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="link link-primary inline-flex items-center gap-1"
                  >
                    Release notes
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  'Latest release lookup is best effort.'
                )}
              </p>
            </div>

            <div className="rounded-box bg-base-100 p-(--space-4) shadow-[var(--shadow-1)] xl:col-span-2">
              <p className="flex items-center gap-(--space-2) text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/50">
                <Clock3 className="h-4 w-4" />
                Last update time
              </p>
              <p className="mt-(--space-2) font-mono text-2xl font-bold text-base-content">
                {lastUpdateTime ? formatShortTimestamp(lastUpdateTime) : 'No request'}
              </p>
              <p className="mt-(--space-1) text-xs font-medium text-base-content/55">
                {currentJob?.requestedBy.memberName ?? 'Idle appliance state.'}
              </p>
            </div>
          </section>

          {showLiveProgress && currentJob && (
            <section className="rounded-box bg-base-100 p-(--space-4) shadow-[var(--shadow-2)]">
              <div className="flex flex-wrap items-start justify-between gap-(--space-3) border-b border-base-300/55 pb-(--space-3)">
                <div>
                  <h2 className="text-lg font-bold text-base-content">Upgrade process</h2>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-base-content/55">
                    Live host-side progress for {currentJob.targetVersion}.
                  </p>
                </div>
                <AppBadge status="info" size="sm">
                  {currentJob.phase.label}
                </AppBadge>
              </div>

              <div className="overflow-x-auto py-(--space-3)">
                <ul className="steps steps-horizontal w-full">
                  {phaseProgress.map((phase) => (
                    <li
                      key={phase.key}
                      className={`step ${
                        phase.state === 'complete'
                          ? 'step-success'
                          : phase.state === 'active'
                            ? 'step-info'
                            : ''
                      }`}
                    >
                      <span className="max-w-36 text-center text-xs font-semibold leading-snug">
                        {phase.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-box bg-info/10 px-(--space-3) py-(--space-2) text-sm text-base-content shadow-inner">
                <div className="flex flex-wrap items-center gap-(--space-2)">
                  <Terminal className="h-4 w-4 text-info" />
                  <span className="font-semibold">{currentJob.checkpoint.label}</span>
                  <span className="text-xs uppercase tracking-wide text-base-content/55">
                    {currentJob.phase.order} of {currentJob.phase.total}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-base-content/65">
                  {currentJob.checkpoint.detail}
                </p>
              </div>
            </section>
          )}

          <div className="grid min-w-0 gap-(--space-4) xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
            <section className="min-w-0 rounded-box bg-base-100 p-(--space-2) shadow-[var(--shadow-2)]">
              <div className="flex flex-wrap items-start justify-between gap-(--space-3) border-b border-base-300/55 px-(--space-1) pb-(--space-2)">
                <div>
                  <h2 className="text-lg font-bold text-base-content">Update activity</h2>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-base-content/55">
                    Showing the most meaningful milestones. Full diagnostics stay in the trace log.
                  </p>
                </div>
                <AppBadge
                  status={showLiveProgress ? 'info' : currentJob ? 'neutral' : 'success'}
                  size="sm"
                >
                  {showLiveProgress ? 'In progress' : currentJob ? 'Last run' : 'Idle'}
                </AppBadge>
              </div>

              <ul className="timeline timeline-vertical timeline-compact mt-1">
                {timelineItems.map((item, index) => (
                  <li key={item.key} className="min-h-0">
                    {index > 0 && <hr className="bg-base-300/80" />}
                    <div className="timeline-start min-w-20 pr-(--space-2) pt-0 text-right font-mono text-[0.68rem] font-semibold leading-tight text-base-content/65">
                      {formatShortTimestamp(item.timestamp)}
                    </div>
                    <div className="timeline-middle">
                      <div
                        className={`grid h-4 w-4 place-items-center rounded-full ring-2 ${toneDotClasses[item.tone]}`}
                      />
                    </div>
                    <div className="timeline-end w-full min-w-0 pb-0 pl-(--space-2)">
                      <div className="w-full rounded-box bg-base-200/65 px-(--space-2) py-0.5">
                        <div className="flex min-w-0 items-start gap-(--space-2)">
                          {renderIcon(
                            item.icon,
                            'mt-0.5 h-3.5 w-3.5 shrink-0 text-base-content/70'
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold leading-tight text-base-content">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-xs font-medium leading-snug text-base-content/68">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < timelineItems.length - 1 && <hr className="bg-base-300/80" />}
                  </li>
                ))}
              </ul>

              {currentJob?.failureSummary && (
                <AppAlert tone="error" heading="Failure summary" className="mt-(--space-4)">
                  {currentJob.failureSummary}
                </AppAlert>
              )}
            </section>

            <section className="min-w-0 self-start rounded-box bg-base-100 p-(--space-4) shadow-[var(--shadow-2)]">
              <div className="flex flex-wrap items-start justify-between gap-(--space-3) border-b border-base-300/55 pb-(--space-3)">
                <div>
                  <h2 className="text-lg font-bold text-base-content">Recovery tools</h2>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-base-content/55">
                    Only host-supported actions are runnable from this page.
                  </p>
                </div>
                <AppBadge status="info" size="sm">
                  Prepared
                </AppBadge>
              </div>

              <div className="mt-(--space-3) flex flex-wrap gap-(--space-2) rounded-box bg-base-200/75 p-(--space-2)">
                <button
                  type="button"
                  className="btn btn-sm btn-primary shadow-sm"
                  onClick={() => void handleHostHotspotRecovery()}
                  disabled={!canStartUpdates || hostHotspotRecovery.isPending}
                >
                  {hostHotspotRecovery.isPending ? (
                    <LoadingSpinner size="xs" className="mr-2" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Repair hotspot
                </button>
                <button
                  type="button"
                  className="btn btn-sm border-base-300 bg-base-100 text-base-content/45"
                  disabled
                >
                  <Database className="mr-2 h-4 w-4" />
                  Backup now
                </button>
                <button
                  type="button"
                  className="btn btn-sm border-base-300 bg-base-100 text-base-content/45"
                  disabled
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Rollback
                </button>
                <button
                  type="button"
                  className="btn btn-sm border-base-300 bg-base-100 text-base-content/45"
                  disabled
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export DB
                </button>
              </div>
              <div className="mt-(--space-2) grid gap-(--space-1) text-xs font-medium leading-relaxed text-base-content/72">
                <p className="rounded-box bg-base-200/70 px-(--space-3) py-(--space-2)">
                  Updater-created recovery assets run automatically before install.
                </p>
                <p className="px-(--space-3)">
                  Manual backup, rollback, and database export are reserved for future appliance
                  APIs.
                </p>
              </div>

              {currentJob && (
                <details className="collapse collapse-arrow mt-(--space-3) bg-base-200/70">
                  <summary className="collapse-title text-sm font-semibold">Job details</summary>
                  <div className="collapse-content space-y-(--space-4)">
                    <dl className="grid gap-(--space-2) text-sm">
                      <div>
                        <dt className="text-base-content/60">Job ID</dt>
                        <dd className="break-all font-mono">{currentJob.jobId}</dd>
                      </div>
                      <div>
                        <dt className="text-base-content/60">Target version</dt>
                        <dd className="font-mono">{currentJob.targetVersion}</dd>
                      </div>
                      <div>
                        <dt className="text-base-content/60">Requested</dt>
                        <dd>{formatTimestamp(currentJob.requestedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-base-content/60">Started</dt>
                        <dd>{formatTimestamp(currentJob.startedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-base-content/60">Finished</dt>
                        <dd>{formatTimestamp(currentJob.finishedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-base-content/60">Status</dt>
                        <dd>{formatSystemUpdateStatusLabel(currentJob.status)}</dd>
                      </div>
                    </dl>
                  </div>
                </details>
              )}
            </section>
          </div>

          {canStartUpdates && (
            <section className="rounded-box bg-base-100 shadow-[var(--shadow-2)]">
              <details
                className="collapse collapse-arrow"
                open={tracePanelOpen}
                onToggle={(event) => {
                  setTracePanelOpen(event.currentTarget.open)
                }}
                data-testid={TID.settings.updates.tracePanel}
              >
                <summary className="collapse-title rounded-box border-l-4 border-neutral/35 bg-base-200/75 pr-(--space-12) shadow-[var(--shadow-1)]">
                  <div className="flex flex-wrap items-center justify-between gap-(--space-3)">
                    <div>
                      <h3 className="flex items-center gap-(--space-2) text-lg font-bold text-base-content">
                        <span className="grid h-8 w-8 place-items-center rounded-box bg-base-100 shadow-[var(--shadow-1)]">
                          <Terminal className="h-4 w-4 text-base-content/75" />
                        </span>
                        Update trace log
                      </h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-base-content/62">
                        Host-side diagnostics for the current or most recent update run.
                      </p>
                    </div>
                    <div className="mr-(--space-4) flex items-center gap-(--space-2)">
                      {hasActiveJob ? (
                        <AppBadge status="neutral" size="sm">
                          Live
                        </AppBadge>
                      ) : (
                        <AppBadge status="neutral" size="sm">
                          Manual refresh
                        </AppBadge>
                      )}
                    </div>
                  </div>
                </summary>

                <div className="collapse-content space-y-(--space-3) border-t border-base-300/55 bg-base-200/45 pt-(--space-3)">
                  <div className="flex flex-wrap items-center justify-between gap-(--space-3) rounded-box bg-base-100 px-(--space-3) py-(--space-2) shadow-[var(--shadow-1)]">
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                        Active trace path
                      </div>
                      <div className="font-mono text-xs break-all text-base-content/78">
                        {traceQuery.data?.path ?? '/var/lib/sentinel/updater/update-trace.log'}
                      </div>
                      <div className="text-xs text-base-content/60">
                        {hasActiveJob
                          ? 'Auto-refresh shows the newest lines from the current update run.'
                          : 'Use refresh to load the most recent host-side update run.'}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => void traceQuery.refetch()}
                      disabled={traceQuery.isFetching}
                      data-testid={TID.settings.updates.traceRefresh}
                    >
                      {traceQuery.isFetching ? (
                        <LoadingSpinner size="xs" className="mr-2" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Refresh trace
                    </button>
                  </div>

                  {traceQuery.isLoading ? (
                    <div className="flex items-center justify-center rounded-box bg-base-100 px-(--space-4) py-(--space-6) shadow-inner">
                      <LoadingSpinner size="sm" className="text-base-content/60" />
                    </div>
                  ) : traceQuery.isError ? (
                    <AppAlert tone="warning" heading="Trace log unavailable">
                      {traceQuery.error instanceof Error
                        ? traceQuery.error.message
                        : 'Unable to load the update trace log right now.'}
                    </AppAlert>
                  ) : traceQuery.data?.available ? (
                    <div className="space-y-(--space-3)">
                      <div className="flex flex-wrap items-center justify-between gap-(--space-3) rounded-box bg-base-100 px-(--space-3) py-(--space-2) shadow-[var(--shadow-1)]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-(--space-2)">
                            <AppBadge
                              status={
                                (traceDisplay?.severityCounts.error ?? 0) > 0
                                  ? 'error'
                                  : (traceDisplay?.severityCounts.warning ?? 0) > 0
                                    ? 'warning'
                                    : 'success'
                              }
                              size="sm"
                            >
                              {(traceDisplay?.severityCounts.error ?? 0) > 0
                                ? 'Errors'
                                : (traceDisplay?.severityCounts.warning ?? 0) > 0
                                  ? 'Warnings'
                                  : 'Clean'}
                            </AppBadge>
                            <span className="text-xs font-medium text-base-content/65">
                              Last modified:{' '}
                              {traceQuery.data.lastModifiedAt
                                ? formatTimestamp(traceQuery.data.lastModifiedAt)
                                : 'Unknown'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-base-content/60">
                            {traceQuery.data.truncatedToLatestRun
                              ? `Showing latest run only (${traceDisplay?.displayedLineCount ?? traceQuery.data.displayedLineCount} of ${traceQuery.data.totalLineCount} lines)`
                              : `Showing ${traceDisplay?.displayedLineCount ?? traceQuery.data.displayedLineCount} lines`}
                            {traceDisplay && traceDisplay.filteredProgressLineCount > 0
                              ? ` · Filtered ${traceDisplay.filteredProgressLineCount} Docker progress lines`
                              : ''}
                            {traceQuery.data.filteredLineCount > 0
                              ? ` · Filtered ${traceQuery.data.filteredLineCount} noisy extraction lines`
                              : ''}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-(--space-2)">
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost"
                            onClick={handleDownloadTrace}
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            Raw log
                          </button>
                          <AppBadge status="success" size="sm">
                            {traceDisplay?.severityCounts.success ?? 0} ok
                          </AppBadge>
                          <AppBadge status="warning" size="sm">
                            {traceDisplay?.severityCounts.warning ?? 0} warn
                          </AppBadge>
                          <AppBadge status="error" size="sm">
                            {traceDisplay?.severityCounts.error ?? 0} error
                          </AppBadge>
                        </div>
                      </div>

                      <div role="tablist" className="tabs tabs-boxed w-fit bg-base-100 p-1">
                        <button
                          type="button"
                          role="tab"
                          className={`tab tab-sm ${traceView === 'summary' ? 'tab-active' : ''}`}
                          onClick={() => setTraceView('summary')}
                        >
                          Summary
                        </button>
                        <button
                          type="button"
                          role="tab"
                          className={`tab tab-sm ${traceView === 'raw' ? 'tab-active' : ''}`}
                          onClick={() => setTraceView('raw')}
                        >
                          Raw log
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-(--space-2)">
                        <input
                          type="search"
                          className="input input-sm input-bordered min-w-72 bg-base-100"
                          placeholder="Search trace"
                          value={traceSearch}
                          onChange={(event) => setTraceSearch(event.target.value)}
                        />
                        <select
                          className="select select-sm select-bordered bg-base-100"
                          value={traceSeverityFilter}
                          onChange={(event) =>
                            setTraceSeverityFilter(
                              event.target.value as SystemUpdateTraceSeverity | 'all'
                            )
                          }
                        >
                          <option value="all">All levels</option>
                          <option value="error">Errors</option>
                          <option value="warning">Warnings</option>
                          <option value="success">Success</option>
                          <option value="info">Info</option>
                        </select>
                      </div>

                      {traceView === 'summary' ? (
                        <div className="space-y-(--space-2)">
                          {filteredTraceSummaryItems.length > 0 ? (
                            filteredTraceSummaryItems.map((item) => (
                              <div
                                key={item.key}
                                className={`rounded-box border-l-4 px-(--space-3) py-(--space-2) shadow-[var(--shadow-1)] ${traceSeverityRowClasses[item.severity]}`}
                              >
                                <div className="flex min-w-0 items-start gap-(--space-3)">
                                  <span className="w-20 shrink-0 font-mono text-xs font-semibold text-base-content/65">
                                    {item.time}
                                  </span>
                                  <AppBadge
                                    status={traceSeverityBadgeStatus[item.severity]}
                                    size="sm"
                                  >
                                    {item.severity}
                                  </AppBadge>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-base-content">
                                      {item.title}
                                    </p>
                                    {item.detail ? (
                                      <p className="mt-0.5 text-xs text-base-content/60">
                                        {item.detail}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-box bg-base-100 p-(--space-4) text-sm text-base-content/65 shadow-inner">
                              No summary events match the current filters.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-(--space-2)">
                          {filteredTraceRows.length > 0 ? (
                            filteredTraceRows.map((row) => {
                              const hasStructuredDetail =
                                row.detail !== null &&
                                (row.detail.includes('{') || row.detail.includes('\n'))

                              return (
                                <div
                                  key={row.key}
                                  className={`rounded-box border-l-4 px-(--space-3) py-(--space-2) shadow-[var(--shadow-1)] ${traceSeverityRowClasses[row.severity]}`}
                                >
                                  <div className="grid min-w-0 gap-(--space-2) xl:grid-cols-[5rem_6rem_minmax(0,1fr)]">
                                    <span className="font-mono text-xs font-semibold text-base-content/65">
                                      {row.time}
                                    </span>
                                    <AppBadge
                                      status={traceSeverityBadgeStatus[row.severity]}
                                      size="sm"
                                      className="w-fit"
                                    >
                                      {row.level}
                                    </AppBadge>
                                    <div className="min-w-0">
                                      <p className="break-words text-sm font-medium text-base-content">
                                        {row.message}
                                      </p>
                                      <p className="mt-0.5 text-xs text-base-content/55">
                                        source: {row.source}
                                        {row.stream ? ` · ${row.stream}` : ''}
                                      </p>
                                      {row.detail && !hasStructuredDetail ? (
                                        <p className="mt-1 break-words text-xs text-base-content/65">
                                          {row.detail}
                                        </p>
                                      ) : null}
                                      {hasStructuredDetail ? (
                                        <details className="collapse collapse-arrow mt-(--space-2) bg-base-100/70">
                                          <summary className="collapse-title min-h-0 py-(--space-2) text-xs font-semibold">
                                            Diagnostic output
                                          </summary>
                                          <pre className="collapse-content whitespace-pre-wrap font-mono text-xs leading-relaxed text-base-content/75">
                                            {row.detail}
                                          </pre>
                                        </details>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div className="rounded-box bg-base-100 p-(--space-4) text-sm text-base-content/65 shadow-inner">
                              No trace rows match the current filters.
                            </div>
                          )}

                          <details className="collapse collapse-arrow bg-base-100">
                            <summary className="collapse-title text-sm font-semibold">
                              Filtered raw text
                            </summary>
                            <pre
                              ref={traceContentRef}
                              className="collapse-content max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-box bg-base-300/65 p-(--space-4) font-mono text-xs leading-relaxed text-base-content shadow-inner"
                              data-testid={TID.settings.updates.traceContent}
                            >
                              {traceDisplay?.content ?? traceQuery.data.content}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-box bg-base-100 p-(--space-4) text-sm text-base-content/70 shadow-inner">
                      No active trace log is available yet. Start an update from this page or run a
                      host-side update command to generate a fresh trace.
                    </div>
                  )}
                </div>
              </details>
            </section>
          )}
        </AppCardContent>
      </AppCard>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        dismissible={!startSystemUpdate.isPending}
      >
        <DialogContent size="md" testId={TID.settings.updates.confirmDialog}>
          <DialogHeader>
            <DialogTitle>Start Sentinel update</DialogTitle>
            <DialogDescription>
              This will ask the host appliance updater to install{' '}
              {preferredTargetVersion ?? 'the selected Sentinel release'}. The UI may reconnect
              while services restart, but the update will keep running on the appliance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3)">
              <div className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Current version
              </div>
              <div className="mt-1 font-mono">{status.currentVersion ?? 'Unknown'}</div>
            </div>
            <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3)">
              <div className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Target version
              </div>
              <div className="mt-1 font-mono">{preferredTargetVersion ?? 'Unknown'}</div>
            </div>
            <AppAlert tone="info">
              No root or sudo password should be requested here. Sentinel will hand the request to
              the dedicated appliance updater service.
            </AppAlert>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={startSystemUpdate.isPending}
              data-testid={TID.settings.updates.confirmCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleStartUpdate()}
              disabled={!canStartNow}
              data-testid={TID.settings.updates.confirmStart}
            >
              {startSystemUpdate.isPending ? (
                <>
                  <LoadingSpinner size="xs" className="mr-2" />
                  Starting...
                </>
              ) : (
                confirmActionLabel
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Release notes and changelog</DialogTitle>
            <DialogDescription>
              {cachedReleaseNotes
                ? `${cachedReleaseNotes.version} cached ${formatReleaseNotesTimestamp(cachedReleaseNotes.cachedAt)} for offline viewing.`
                : 'No cached release notes are available yet.'}
            </DialogDescription>
          </DialogHeader>

          {cachedReleaseNotes ? (
            <div className="space-y-3">
              <dl className="grid gap-(--space-3) text-sm sm:grid-cols-3">
                <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3)">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    Release
                  </dt>
                  <dd className="mt-1 font-mono">{cachedReleaseNotes.version}</dd>
                </div>
                <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3)">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    Published
                  </dt>
                  <dd className="mt-1">
                    {formatReleaseNotesTimestamp(cachedReleaseNotes.publishedAt)}
                  </dd>
                </div>
                <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3)">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    Cached
                  </dt>
                  <dd className="mt-1">
                    {formatReleaseNotesTimestamp(cachedReleaseNotes.cachedAt)}
                  </dd>
                </div>
              </dl>
              <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-box border border-base-300 bg-base-200 p-(--space-4) font-mono text-sm leading-relaxed text-base-content">
                {cachedReleaseNotes.body.trim() ||
                  'No release notes were published for this release.'}
              </pre>
            </div>
          ) : (
            <AppAlert tone="warning">
              Connect the Server to the internet and refresh update status once to cache release
              notes for offline use.
            </AppAlert>
          )}

          <DialogFooter>
            {cachedReleaseNotes?.url && (
              <a
                href={cachedReleaseNotes.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open online
              </a>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setReleaseNotesOpen(false)}
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
