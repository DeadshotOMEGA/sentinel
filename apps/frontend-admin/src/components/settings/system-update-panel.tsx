'use client'

import { useState } from 'react'
import type { SystemUpdateJob, SystemUpdateJobStatus } from '@sentinel/contracts'
import { Download, ExternalLink, RefreshCw, RotateCcw, ServerCog, ShieldAlert } from 'lucide-react'
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
import { useStartSystemUpdate, useSystemUpdateStatus } from '@/hooks/use-system-update'
import { TID } from '@/lib/test-ids'
import { AccountLevel, useAuthStore } from '@/store/auth-store'

const PRIMARY_FLOW: readonly SystemUpdateJobStatus[] = [
  'requested',
  'authorized',
  'staging',
  'downloading',
  'verifying',
  'installing',
  'post_install',
  'restarting',
  'health_check',
  'completed',
]

const FAILURE_FLOW: readonly SystemUpdateJobStatus[] = [
  'failed',
  'rollback_attempted',
  'rolled_back',
]

function isTerminalStatus(status: SystemUpdateJobStatus): boolean {
  return (
    status === 'completed' ||
    status === 'failed' ||
    status === 'rollback_attempted' ||
    status === 'rolled_back'
  )
}

function isFailureStatus(status: SystemUpdateJobStatus): boolean {
  return status === 'failed' || status === 'rollback_attempted' || status === 'rolled_back'
}

function formatStepLabel(status: SystemUpdateJobStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

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

function getPrimaryStepDescription(
  step: SystemUpdateJobStatus,
  currentJob: SystemUpdateJob | null
): string {
  if (!currentJob) {
    return step === 'completed' ? 'Sentinel returns to steady state after verification.' : 'Pending'
  }

  const currentIndex = PRIMARY_FLOW.indexOf(currentJob.status)
  const stepIndex = PRIMARY_FLOW.indexOf(step)
  const isActive = currentJob.status === step
  const isCompleted = currentIndex >= 0 && stepIndex <= currentIndex

  if (isActive) {
    return currentJob.message
  }

  if (isCompleted) {
    if (step === 'completed' && currentJob.status === 'completed') {
      return currentJob.message
    }

    return 'Completed'
  }

  return step === 'completed' ? 'Sentinel returns to steady state after verification.' : 'Pending'
}

function getCardStatus(job: SystemUpdateJob | null, updateAvailable: boolean) {
  if (job && isFailureStatus(job.status)) {
    return 'warning' as const
  }

  if (job && !isTerminalStatus(job.status)) {
    return 'info' as const
  }

  if (updateAvailable) {
    return 'info' as const
  }

  return 'success' as const
}

function getSummaryTone(job: SystemUpdateJob | null, updateAvailable: boolean) {
  if (job && isFailureStatus(job.status)) {
    return 'warning' as const
  }

  if (job && !isTerminalStatus(job.status)) {
    return 'info' as const
  }

  if (updateAvailable) {
    return 'info' as const
  }

  return 'success' as const
}

function getSummaryHeading(job: SystemUpdateJob | null, updateAvailable: boolean) {
  if (job && !isTerminalStatus(job.status)) {
    return `Update ${job.targetVersion} is ${formatStepLabel(job.status).toLowerCase()}`
  }

  if (job?.status === 'rolled_back') {
    return `Update ${job.targetVersion} rolled back`
  }

  if (job?.status === 'rollback_attempted') {
    return `Rollback needs operator attention`
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

function getTerminalJobBadgeStatus(status: SystemUpdateJobStatus) {
  switch (status) {
    case 'completed':
      return 'success'
    case 'failed':
      return 'error'
    case 'rollback_attempted':
    case 'rolled_back':
      return 'warning'
    default:
      return 'info'
  }
}

function getUpdateStateBadge(job: SystemUpdateJob | null, updateAvailable: boolean) {
  if (job) {
    if (job.status === 'completed') {
      return { status: 'success' as const, label: 'Completed' }
    }

    if (job.status === 'failed') {
      return { status: 'error' as const, label: 'Failed' }
    }

    if (job.status === 'rollback_attempted' || job.status === 'rolled_back') {
      return { status: 'warning' as const, label: formatStepLabel(job.status) }
    }

    return { status: 'info' as const, label: formatStepLabel(job.status) }
  }

  if (updateAvailable) {
    return { status: 'info' as const, label: 'Update available' }
  }

  return { status: 'success' as const, label: 'Current' }
}

function getNextActionGuidance(job: SystemUpdateJob | null, updateAvailable: boolean) {
  if (job && !isTerminalStatus(job.status)) {
    return 'The appliance updater is running on the host and will keep going if this page reconnects.'
  }

  if (job?.status === 'completed') {
    return 'No action is needed until a newer stable release is published.'
  }

  if (job?.status === 'rolled_back' || job?.status === 'rollback_attempted') {
    return 'Review the rollback result before starting another update.'
  }

  if (job?.status === 'failed') {
    return 'Review the last failure summary before retrying the update.'
  }

  if (updateAvailable) {
    return 'Review the latest stable release and start the update when you are ready.'
  }

  return 'No action is needed until a newer stable release is published.'
}

export function SystemUpdatePanel() {
  const member = useAuthStore((state) => state.member)
  const canStartUpdates = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN
  const [confirmOpen, setConfirmOpen] = useState(false)

  const systemUpdateQuery = useSystemUpdateStatus({
    enabled: Boolean(member),
    refetchIntervalMs: 5_000,
  })
  const startSystemUpdate = useStartSystemUpdate()

  const status = systemUpdateQuery.data ?? null
  const currentJob = status?.currentJob ?? null
  const hasActiveJob = currentJob ? !isTerminalStatus(currentJob.status) : false
  const canStartNow =
    canStartUpdates &&
    status?.updateAvailable === true &&
    status.latestVersion !== null &&
    !hasActiveJob &&
    !startSystemUpdate.isPending

  const handleStartUpdate = async () => {
    if (!status?.latestVersion) {
      return
    }

    try {
      const result = await startSystemUpdate.mutateAsync({
        targetVersion: status.latestVersion,
      })
      setConfirmOpen(false)
      toast.success(result.message)
      await systemUpdateQuery.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start system update')
    }
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
      <AppCard status="error">
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

  const summaryTone = getSummaryTone(currentJob, status.updateAvailable)
  const summaryHeading = getSummaryHeading(currentJob, status.updateAvailable)
  const showLiveProgress = currentJob ? !isTerminalStatus(currentJob.status) : false
  const updateStateBadge = getUpdateStateBadge(currentJob, status.updateAvailable)

  return (
    <div className="space-y-4" data-testid={TID.settings.updates.panel}>
      <AppCard variant="elevated" status={getCardStatus(currentJob, status.updateAvailable)}>
        <AppCardHeader>
          <div className="flex items-start justify-between gap-(--space-4)">
            <div className="space-y-(--space-1)">
              <AppCardTitle className="flex items-center gap-(--space-2)">
                <Download className="h-5 w-5" />
                Updates
              </AppCardTitle>
              <AppCardDescription>
                Start a trusted Sentinel appliance update and monitor progress even if the UI
                reconnects while services restart.
              </AppCardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-(--space-2)">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => void systemUpdateQuery.refetch()}
                disabled={systemUpdateQuery.isFetching}
                data-testid={TID.settings.updates.refresh}
              >
                {systemUpdateQuery.isFetching ? (
                  <LoadingSpinner size="xs" className="mr-2" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setConfirmOpen(true)}
                disabled={!canStartNow}
                data-testid={TID.settings.updates.start}
              >
                Update to {status.latestVersion ?? 'latest'}
              </button>
            </div>
          </div>
        </AppCardHeader>

        <AppCardContent className="space-y-4">
          <AppAlert tone={summaryTone} heading={summaryHeading}>
            {currentJob
              ? currentJob.message
              : status.updateAvailable
                ? `Sentinel ${status.latestVersion} is available for this appliance.`
                : 'No update is running, and the appliance is already on the latest known stable release.'}
          </AppAlert>

          {!canStartUpdates && (
            <AppAlert tone="warning" heading="Admin or Developer access required">
              You can view update status here, but only Admin or Developer accounts can start a new
              Sentinel update.
            </AppAlert>
          )}

          {currentJob?.status === 'rollback_attempted' && (
            <AppAlert tone="warning" heading="Rollback needs operator follow-up">
              Sentinel attempted a rollback but did not finish cleanly. Review the updater logs and
              appliance state before retrying another update.
            </AppAlert>
          )}

          <div className="stats stats-vertical w-full border border-base-300 bg-base-200 lg:stats-horizontal">
            <div className="stat">
              <div className="stat-title">Installed version</div>
              <div className="stat-value text-2xl font-mono text-base-content">
                {status.currentVersion ?? 'Unknown'}
              </div>
              <div className="stat-desc">Installed Sentinel package/runtime version</div>
            </div>
            <div className="stat">
              <div className="stat-title">Latest stable</div>
              <div className="stat-value text-2xl font-mono text-base-content">
                {status.latestVersion ?? 'Unknown'}
              </div>
              <div className="stat-desc">
                {status.latestReleaseUrl ? (
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
                  'Latest release lookup is best effort'
                )}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">Update state</div>
              <div className="mt-2">
                <AppBadge status={updateStateBadge.status}>{updateStateBadge.label}</AppBadge>
              </div>
              <div className="stat-desc mt-3">
                {currentJob
                  ? `Requested ${formatTimestamp(currentJob.requestedAt)}`
                  : status.updateAvailable
                    ? 'Ready to start from this page'
                    : 'No update currently running'}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
            <section className="rounded-box border border-base-300 bg-base-100 p-(--space-4)">
              <div>
                <h3 className="text-base font-semibold">Next action</h3>
                <p className="mt-1 text-sm text-base-content/70">
                  Start updates here and let the appliance finish them in the background, even if
                  this page reconnects while services restart.
                </p>
              </div>

              <dl className="mt-4 grid gap-(--space-3) text-sm sm:grid-cols-2">
                <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3)">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    Requested target
                  </dt>
                  <dd className="mt-1 font-mono text-base-content">
                    {currentJob?.targetVersion ?? status.latestVersion ?? 'Unknown'}
                  </dd>
                </div>
                <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3)">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    Guidance
                  </dt>
                  <dd className="mt-1 text-base-content">
                    {getNextActionGuidance(currentJob, status.updateAvailable)}
                  </dd>
                </div>
                <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3)">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    Requested by
                  </dt>
                  <dd className="mt-1 text-base-content">
                    {currentJob?.requestedBy.memberName ?? 'No active request'}
                  </dd>
                </div>
                <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3)">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    Last finished
                  </dt>
                  <dd className="mt-1 text-base-content">
                    {formatTimestamp(currentJob?.finishedAt ?? null)}
                  </dd>
                </div>
              </dl>

              {currentJob && (
                <div className="mt-4 rounded-box border border-base-300 bg-base-200 p-(--space-4)">
                  <div className="flex items-center gap-(--space-2)">
                    {isFailureStatus(currentJob.status) ? (
                      <ShieldAlert className="h-4 w-4 text-warning" />
                    ) : (
                      <ServerCog className="h-4 w-4 text-info" />
                    )}
                    <h4 className="text-sm font-semibold">
                      {hasActiveJob ? 'Current job details' : 'Latest job details'}
                    </h4>
                  </div>
                  <dl className="mt-3 grid gap-(--space-2) text-sm">
                    <div className="flex items-start justify-between gap-(--space-3)">
                      <dt className="text-base-content/60">Job ID</dt>
                      <dd className="font-mono text-right">{currentJob.jobId}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-(--space-3)">
                      <dt className="text-base-content/60">Requested</dt>
                      <dd className="text-right">{formatTimestamp(currentJob.requestedAt)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-(--space-3)">
                      <dt className="text-base-content/60">Started</dt>
                      <dd className="text-right">{formatTimestamp(currentJob.startedAt)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-(--space-3)">
                      <dt className="text-base-content/60">Status</dt>
                      <dd className="text-right">{formatStepLabel(currentJob.status)}</dd>
                    </div>
                  </dl>
                  {currentJob.failureSummary && (
                    <div className="mt-3 rounded-box border border-warning/35 bg-warning-fadded p-(--space-3) text-sm text-warning-fadded-content">
                      <div className="flex items-center gap-(--space-2)">
                        <ShieldAlert className="h-4 w-4" />
                        <span className="font-semibold">Sanitized failure summary</span>
                      </div>
                      <p className="mt-2">{currentJob.failureSummary}</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-box border border-base-300 bg-base-100 p-(--space-4)">
              <h3 className="text-base font-semibold">
                {showLiveProgress ? 'Progress' : 'Last run'}
              </h3>
              <p className="mt-1 text-sm text-base-content/70">
                {showLiveProgress
                  ? 'The updater persists job state on disk, so this view can reconnect after backend or browser restarts.'
                  : currentJob
                    ? 'The most recent finished update request stays visible here after the live progress timeline clears.'
                    : 'No update is running right now. Start a new request when a newer stable release is available.'}
              </p>

              {showLiveProgress ? (
                <>
                  <ul className="steps steps-vertical mt-4 w-full">
                    {PRIMARY_FLOW.map((step) => {
                      const currentIndex = currentJob ? PRIMARY_FLOW.indexOf(currentJob.status) : -1
                      const stepIndex = PRIMARY_FLOW.indexOf(step)
                      const isActive = currentJob?.status === step
                      const isCompleted = currentIndex >= 0 && stepIndex <= currentIndex

                      return (
                        <li
                          key={step}
                          className={`step ${isCompleted || isActive ? 'step-primary' : ''}`}
                        >
                          <div className="text-left">
                            <div className="font-medium">{formatStepLabel(step)}</div>
                            <div className="text-xs text-base-content/60">
                              {getPrimaryStepDescription(step, currentJob)}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>

                  {currentJob && isFailureStatus(currentJob.status) && (
                    <div className="mt-4 border-t border-base-300 pt-(--space-4)">
                      <h4 className="text-sm font-semibold">Recovery states</h4>
                      <ul className="steps steps-vertical mt-3 w-full">
                        {FAILURE_FLOW.map((step) => {
                          const currentIndex = FAILURE_FLOW.indexOf(currentJob.status)
                          const stepIndex = FAILURE_FLOW.indexOf(step)
                          const isCompleted = currentIndex >= 0 && stepIndex <= currentIndex

                          return (
                            <li key={step} className={`step ${isCompleted ? 'step-warning' : ''}`}>
                              <div className="text-left">
                                <div className="flex items-center gap-(--space-2)">
                                  {step === 'rolled_back' && <RotateCcw className="h-3.5 w-3.5" />}
                                  <span className="font-medium">{formatStepLabel(step)}</span>
                                </div>
                                <div className="text-xs text-base-content/60">
                                  {step === currentJob.status ? currentJob.message : 'Not reached'}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </>
              ) : currentJob ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-box border border-base-300 bg-base-200 p-(--space-4)">
                    <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
                      <div className="space-y-(--space-1)">
                        <p className="text-sm font-semibold">Most recent update request</p>
                        <p className="text-sm text-base-content/70">{currentJob.message}</p>
                      </div>
                      <AppBadge status={getTerminalJobBadgeStatus(currentJob.status)} size="sm">
                        {formatStepLabel(currentJob.status)}
                      </AppBadge>
                    </div>

                    <dl className="mt-4 grid gap-(--space-3) text-sm sm:grid-cols-2">
                      <div className="rounded-box border border-base-300 bg-base-100 p-(--space-3)">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                          Target version
                        </dt>
                        <dd className="mt-1 font-mono text-base-content">
                          {currentJob.targetVersion}
                        </dd>
                      </div>
                      <div className="rounded-box border border-base-300 bg-base-100 p-(--space-3)">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                          Finished
                        </dt>
                        <dd className="mt-1 text-base-content">
                          {formatTimestamp(currentJob.finishedAt ?? currentJob.startedAt)}
                        </dd>
                      </div>
                      <div className="rounded-box border border-base-300 bg-base-100 p-(--space-3)">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                          Requested by
                        </dt>
                        <dd className="mt-1 text-base-content">
                          {currentJob.requestedBy.memberName}
                        </dd>
                      </div>
                      <div className="rounded-box border border-base-300 bg-base-100 p-(--space-3)">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                          Next action
                        </dt>
                        <dd className="mt-1 text-base-content">
                          {currentJob.status === 'completed'
                            ? 'No action needed.'
                            : currentJob.status === 'rolled_back'
                              ? 'Review the appliance before retrying another update.'
                              : 'Review the failure summary and updater logs before retrying.'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {currentJob.failureSummary && (
                    <AppAlert
                      tone={currentJob.status === 'failed' ? 'error' : 'warning'}
                      heading="Last run summary"
                    >
                      {currentJob.failureSummary}
                    </AppAlert>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-box border border-base-300 bg-base-200 p-(--space-4) text-sm text-base-content/70">
                  No update is currently running. When a newer stable release is available, start it
                  here and this panel will switch to a live progress timeline.
                </div>
              )}
            </section>
          </div>
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
              {status.latestVersion ?? 'the latest stable release'}. The UI may reconnect while
              services restart, but the update will keep running on the appliance.
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
              <div className="mt-1 font-mono">{status.latestVersion ?? 'Unknown'}</div>
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
                `Start update to ${status.latestVersion ?? 'latest'}`
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
