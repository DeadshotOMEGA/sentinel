'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { HostHotspotRecoveryStatus } from '@sentinel/contracts'
import { Activity, CheckCircle2, RotateCcw, Usb, Wifi, Wrench, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useHostHotspotRecovery } from '@/hooks/use-network-settings'
import { useSystemStatus } from '@/hooks/use-system-status'
import { cn } from '@/lib/utils'
import { TID } from '@/lib/test-ids'
import {
  HOST_HOTSPOT_ANTENNA_WAIT_SECONDS,
  HOST_HOTSPOT_REPAIR_STEPS,
  HOST_HOTSPOT_RESET_WATCH_SECONDS,
  getHostHotspotAntennaWaitLabel,
  getHostHotspotRepairStepState,
  getHostHotspotResetWatchLabel,
  isHostHotspotAntennaWaitActionDisabled,
  isHostHotspotResetWatchActionDisabled,
  type HostHotspotRepairStage,
  type HostHotspotRepairStepState,
} from './host-hotspot-repair-dialog.logic'

interface HostHotspotRepairDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRepairQueued?: () => Promise<void> | void
}

const SYSTEM_STATUS_REFRESH_DELAYS_MS = [2_000, 5_000, 10_000, 20_000] as const

const stepToneClasses: Record<HostHotspotRepairStepState, string> = {
  complete: 'step-success',
  active: 'step-warning',
  pending: '',
}

const instructionSurfaceClasses: Record<HostHotspotRepairStage, string> = {
  'check-wifi': 'border-info/40 bg-info-fadded text-info-fadded-content',
  'run-repair': 'border-info/40 bg-info-fadded text-info-fadded-content',
  'watch-reset': 'border-warning/45 bg-warning-fadded text-warning-fadded-content',
  'reset-antenna': 'border-warning/45 bg-warning-fadded text-warning-fadded-content',
  'retry-repair': 'border-info/40 bg-info-fadded text-info-fadded-content',
  complete: 'border-success/45 bg-success-fadded text-success-fadded-content',
}

export function HostHotspotRepairDialog({
  open,
  onOpenChange,
  onRepairQueued,
}: HostHotspotRepairDialogProps) {
  const queryClient = useQueryClient()
  const hostHotspotRecovery = useHostHotspotRecovery()
  const systemStatusQuery = useSystemStatus({
    enabled: open,
    refetchIntervalMs: open ? 2_000 : 30_000,
  })
  const recoveryStatus = systemStatusQuery.data?.network.hostHotspotRecovery ?? null
  const [stage, setStage] = useState<HostHotspotRepairStage>('check-wifi')
  const [resetWatchSecondsRemaining, setResetWatchSecondsRemaining] = useState(
    HOST_HOTSPOT_RESET_WATCH_SECONDS
  )
  const [antennaWaitStarted, setAntennaWaitStarted] = useState(false)
  const [antennaSecondsRemaining, setAntennaSecondsRemaining] = useState(
    HOST_HOTSPOT_ANTENNA_WAIT_SECONDS
  )
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null)

  const resetFlow = () => {
    setStage('check-wifi')
    setResetWatchSecondsRemaining(HOST_HOTSPOT_RESET_WATCH_SECONDS)
    setAntennaWaitStarted(false)
    setAntennaSecondsRemaining(HOST_HOTSPOT_ANTENNA_WAIT_SECONDS)
    setQueuedMessage(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetFlow()
    }

    onOpenChange(nextOpen)
  }

  useEffect(() => {
    if (!open || stage !== 'watch-reset' || resetWatchSecondsRemaining <= 0) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setResetWatchSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1_000)

    return () => window.clearTimeout(timeoutId)
  }, [open, resetWatchSecondsRemaining, stage])

  useEffect(() => {
    if (!open || stage !== 'reset-antenna' || !antennaWaitStarted || antennaSecondsRemaining <= 0) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setAntennaSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1_000)

    return () => window.clearTimeout(timeoutId)
  }, [antennaSecondsRemaining, antennaWaitStarted, open, stage])

  const antennaWaitState = {
    started: antennaWaitStarted,
    secondsRemaining: antennaSecondsRemaining,
  }
  const resetWatchState = {
    secondsRemaining: resetWatchSecondsRemaining,
  }
  const primaryDisabled =
    hostHotspotRecovery.isPending ||
    (stage === 'watch-reset' && isHostHotspotResetWatchActionDisabled(resetWatchState)) ||
    (stage === 'reset-antenna' && isHostHotspotAntennaWaitActionDisabled(antennaWaitState))

  const queueSystemStatusRefreshes = () => {
    SYSTEM_STATUS_REFRESH_DELAYS_MS.forEach((delayMs) => {
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['system-status'] })
      }, delayMs)
    })
  }

  const handleRepair = async (nextStage: HostHotspotRepairStage) => {
    try {
      const result = await hostHotspotRecovery.mutateAsync()
      setQueuedMessage(result.message)
      setStage(nextStage)
      queueSystemStatusRefreshes()
      toast.success(result.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to queue host hotspot recovery')
      return
    }

    try {
      await onRepairQueued?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Repair queued, but status refresh failed'
      )
    }
  }

  const handlePrimaryAction = () => {
    if (stage === 'check-wifi') {
      setStage('run-repair')
      return
    }

    if (stage === 'run-repair') {
      setResetWatchSecondsRemaining(HOST_HOTSPOT_RESET_WATCH_SECONDS)
      void handleRepair('watch-reset')
      return
    }

    if (stage === 'watch-reset') {
      if (recoveryStatus?.state === 'completed') {
        setStage('complete')
        return
      }

      setStage('reset-antenna')
      return
    }

    if (stage === 'reset-antenna') {
      if (!antennaWaitStarted) {
        setAntennaWaitStarted(true)
        setAntennaSecondsRemaining(HOST_HOTSPOT_ANTENNA_WAIT_SECONDS)
        return
      }

      if (antennaSecondsRemaining === 0) {
        setStage('retry-repair')
      }
      return
    }

    if (stage === 'retry-repair') {
      void handleRepair('complete')
      return
    }

    handleOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      dismissible={!hostHotspotRecovery.isPending}
    >
      <DialogContent
        size="lg"
        showCloseButton={!hostHotspotRecovery.isPending}
        testId={TID.hostHotspotRepair.dialog}
      >
        <DialogHeader className="mb-(--space-3) pr-(--space-10)">
          <DialogTitle className="flex items-center gap-(--space-2)">
            <Wrench aria-hidden="true" className="h-5 w-5 text-warning" />
            Repair host hotspot
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-(--space-4)" aria-live="polite">
          <ol className="steps steps-horizontal w-full" aria-label="Host hotspot repair steps">
            {HOST_HOTSPOT_REPAIR_STEPS.map((step) => {
              const state = getHostHotspotRepairStepState(stage, step.id)

              return (
                <li
                  key={step.id}
                  className={cn('step text-xs font-semibold', stepToneClasses[state])}
                  aria-current={state === 'active' ? 'step' : undefined}
                  data-state={state}
                  data-testid={TID.hostHotspotRepair.step(step.id)}
                >
                  <span className="max-w-28 leading-tight">{step.label}</span>
                </li>
              )
            })}
          </ol>

          <section
            className={cn(
              'rounded-box border-l-4 p-(--space-4) shadow-[var(--shadow-1)]',
              instructionSurfaceClasses[stage]
            )}
          >
            {renderInstruction(stage, {
              antennaSecondsRemaining,
              antennaWaitStarted,
              queuedMessage,
              recoveryStatus,
              resetWatchSecondsRemaining,
            })}
          </section>

          {renderRecoveryActivity(recoveryStatus, {
            isLoading: systemStatusQuery.isLoading,
            isError: systemStatusQuery.isError,
            queuedMessage,
            stage,
          })}
        </div>

        <DialogFooter className="items-center gap-(--space-2)">
          {stage !== 'complete' && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => handleOpenChange(false)}
              disabled={hostHotspotRecovery.isPending}
              data-testid={TID.hostHotspotRepair.close}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className={cn(
              'btn',
              stage === 'reset-antenna'
                ? 'btn-warning'
                : stage === 'complete'
                  ? 'btn-success'
                  : 'btn-primary'
            )}
            onClick={handlePrimaryAction}
            disabled={primaryDisabled}
            data-testid={TID.hostHotspotRepair.primary}
          >
            {hostHotspotRecovery.isPending && <LoadingSpinner size="xs" className="mr-2" />}
            {getPrimaryActionLabel(stage, {
              antennaSecondsRemaining,
              antennaWaitStarted,
              isPending: hostHotspotRecovery.isPending,
              recoveryStatus,
              resetWatchSecondsRemaining,
            })}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function renderInstruction(
  stage: HostHotspotRepairStage,
  input: {
    antennaSecondsRemaining: number
    antennaWaitStarted: boolean
    queuedMessage: string | null
    recoveryStatus: HostHotspotRecoveryStatus | null
    resetWatchSecondsRemaining: number
  }
) {
  if (stage === 'check-wifi') {
    return (
      <div className="flex items-start gap-(--space-3)">
        <InstructionIcon icon={Wifi} />
        <div className="min-w-0">
          <h4 className="font-bold">Keep the AP dongle for Sentinel</h4>
          <p className="mt-(--space-1) text-sm leading-relaxed">
            Sentinel will check whether the USB AP adapter is stuck on internet Wi-Fi and move that
            connection to the scan radio before restarting the hotspot.
          </p>
        </div>
      </div>
    )
  }

  if (stage === 'run-repair') {
    return (
      <div className="flex items-start gap-(--space-3)">
        <InstructionIcon icon={Wrench} />
        <div className="min-w-0">
          <h4 className="font-bold">Run the repair first</h4>
          <p className="mt-(--space-1) text-sm leading-relaxed">
            Click Run repair. Sentinel will queue the host action that reserves the AP dongle,
            rebuilds the managed hotspot profile, and restarts the hotspot.
          </p>
        </div>
      </div>
    )
  }

  if (stage === 'reset-antenna') {
    const body =
      input.antennaWaitStarted && input.antennaSecondsRemaining === 0
        ? 'Plug the Wi-Fi antenna back in, then continue.'
        : input.antennaWaitStarted
          ? 'Keep the Wi-Fi antenna disconnected until the timer finishes.'
          : 'If the hotspot is still not available, disconnect the Wi-Fi antenna from the host laptop, then start the wait.'

    return (
      <div className="flex items-start gap-(--space-3)">
        <InstructionIcon icon={Usb} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-(--space-2)">
            <h4 className="font-bold">Reset the Wi-Fi antenna</h4>
            {input.antennaWaitStarted && input.antennaSecondsRemaining > 0 && (
              <AppBadge status="warning" size="sm">
                {input.antennaSecondsRemaining}s
              </AppBadge>
            )}
          </div>
          <p className="mt-(--space-1) text-sm leading-relaxed">{body}</p>
        </div>
      </div>
    )
  }

  if (stage === 'watch-reset') {
    const isComplete = input.recoveryStatus?.state === 'completed'
    const isFailed = input.recoveryStatus?.state === 'failed'
    const body = isComplete
      ? 'The host reports that recovery finished. Check System Status and close this repair flow if the hotspot is healthy.'
      : isFailed
        ? 'The host finished the reset attempt but still needs attention. Let the timer finish, then re-seat the antenna only if needed.'
        : 'Sentinel is resetting the USB AP dongle now. Do not unplug it yet; the adapter may disappear and come back after about 10 seconds.'

    return (
      <div className="flex items-start gap-(--space-3)">
        <InstructionIcon icon={Activity} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-(--space-2)">
            <h4 className="font-bold">Watch the USB reset</h4>
            {!isComplete && input.resetWatchSecondsRemaining > 0 && (
              <AppBadge status="warning" size="sm">
                {input.resetWatchSecondsRemaining}s
              </AppBadge>
            )}
            {isComplete && (
              <AppBadge status="success" size="sm">
                Complete
              </AppBadge>
            )}
          </div>
          <p className="mt-(--space-1) text-sm leading-relaxed">{body}</p>
        </div>
      </div>
    )
  }

  if (stage === 'retry-repair') {
    return (
      <div className="flex items-start gap-(--space-3)">
        <InstructionIcon icon={RotateCcw} />
        <div className="min-w-0">
          <h4 className="font-bold">Run the repair again</h4>
          <p className="mt-(--space-1) text-sm leading-relaxed">
            With the antenna plugged back in, click Run repair again so the host can bind the
            hotspot to the adapter.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-(--space-3)">
      <InstructionIcon icon={CheckCircle2} />
      <div className="min-w-0">
        <h4 className="font-bold">Final repair queued</h4>
        <p className="mt-(--space-1) text-sm leading-relaxed">
          Give the host about 20 seconds. Sentinel will refresh network status automatically.
        </p>
        {input.queuedMessage && (
          <p className="mt-(--space-2) font-mono text-xs leading-relaxed text-current opacity-75">
            {input.queuedMessage}
          </p>
        )}
      </div>
    </div>
  )
}

function renderRecoveryActivity(
  recoveryStatus: HostHotspotRecoveryStatus | null,
  input: {
    isLoading: boolean
    isError: boolean
    queuedMessage: string | null
    stage: HostHotspotRepairStage
  }
) {
  if (!recoveryStatus && !input.queuedMessage && input.stage !== 'watch-reset') {
    return null
  }

  const statusTone = getRecoveryStatusTone(recoveryStatus)
  const message =
    recoveryStatus?.message ??
    input.queuedMessage ??
    (input.isLoading
      ? 'Checking host hotspot recovery status.'
      : 'Waiting for host recovery status.')
  const progressValue = getRecoveryProgressValue(recoveryStatus)

  return (
    <section
      className="rounded-box border border-base-300 bg-base-200 p-(--space-3) text-sm text-base-content shadow-inner"
      aria-label="Host hotspot recovery activity"
    >
      <div className="flex flex-wrap items-center justify-between gap-(--space-2)">
        <div className="flex min-w-0 items-center gap-(--space-2)">
          <Activity
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0',
              recoveryStatus?.state === 'running' ? 'text-warning' : 'text-base-content/60'
            )}
          />
          <p className="truncate font-semibold">{formatRecoveryStage(recoveryStatus?.stage)}</p>
        </div>
        <AppBadge status={statusTone} size="sm" pulse={recoveryStatus?.state === 'running'}>
          {formatRecoveryState(recoveryStatus?.state, input.isError)}
        </AppBadge>
      </div>

      <progress
        className={cn(
          'progress mt-(--space-3) h-2 w-full',
          recoveryStatus?.state === 'completed'
            ? 'progress-success'
            : recoveryStatus?.state === 'failed'
              ? 'progress-error'
              : 'progress-warning'
        )}
        value={progressValue}
        max={100}
        aria-label="Host hotspot recovery progress"
      />

      <p className="mt-(--space-2) leading-relaxed">{message}</p>

      {recoveryStatus && (
        <dl className="mt-(--space-2) grid grid-cols-2 gap-x-(--space-3) gap-y-(--space-1) text-xs text-base-content/70">
          <RecoveryDetail label="AP dongle" value={recoveryStatus.hotspotDevice} />
          <RecoveryDetail label="USB device" value={recoveryStatus.usbDevice} />
          <RecoveryDetail label="Scan radio" value={recoveryStatus.scanDevice} />
          <RecoveryDetail
            label="Updated"
            value={formatRelativeTimestamp(recoveryStatus.updatedAt)}
          />
        </dl>
      )}
    </section>
  )
}

function RecoveryDetail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold uppercase tracking-wide">{label}</dt>
      <dd className="truncate font-mono text-base-content">{value ?? 'Pending'}</dd>
    </div>
  )
}

function InstructionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-box bg-base-100/80 shadow-[var(--shadow-1)]">
      <Icon aria-hidden="true" className="h-5 w-5" />
    </span>
  )
}

function getPrimaryActionLabel(
  stage: HostHotspotRepairStage,
  input: {
    antennaSecondsRemaining: number
    antennaWaitStarted: boolean
    isPending: boolean
    recoveryStatus: HostHotspotRecoveryStatus | null
    resetWatchSecondsRemaining: number
  }
): string {
  if (input.isPending) {
    return stage === 'retry-repair' ? 'Queueing again...' : 'Queueing...'
  }

  if (stage === 'check-wifi') {
    return 'Continue'
  }

  if (stage === 'run-repair') {
    return 'Run repair'
  }

  if (stage === 'watch-reset') {
    if (input.recoveryStatus?.state === 'completed') {
      return 'Review complete'
    }

    return getHostHotspotResetWatchLabel({
      secondsRemaining: input.resetWatchSecondsRemaining,
    })
  }

  if (stage === 'reset-antenna') {
    return getHostHotspotAntennaWaitLabel({
      started: input.antennaWaitStarted,
      secondsRemaining: input.antennaSecondsRemaining,
    })
  }

  if (stage === 'retry-repair') {
    return 'Run repair again'
  }

  return 'Close'
}

function getRecoveryStatusTone(
  recoveryStatus: HostHotspotRecoveryStatus | null
): 'success' | 'warning' | 'error' | 'neutral' {
  switch (recoveryStatus?.state) {
    case 'completed':
      return 'success'
    case 'failed':
      return 'error'
    case 'queued':
    case 'running':
      return 'warning'
    default:
      return 'neutral'
  }
}

function formatRecoveryState(
  state: HostHotspotRecoveryStatus['state'] | undefined,
  isError: boolean
): string {
  if (isError) {
    return 'Status unavailable'
  }

  switch (state) {
    case 'queued':
      return 'Queued'
    case 'running':
      return 'Running'
    case 'completed':
      return 'Complete'
    case 'failed':
      return 'Needs attention'
    default:
      return 'Checking'
  }
}

function formatRecoveryStage(stage: HostHotspotRecoveryStatus['stage'] | undefined): string {
  switch (stage) {
    case 'request_queued':
      return 'Waiting for host'
    case 'processing_request':
      return 'Starting repair'
    case 'moving_internet_wifi':
      return 'Moving internet Wi-Fi'
    case 'ensuring_profile':
      return 'Checking hotspot profile'
    case 'stopping_hotspot':
      return 'Stopping hotspot'
    case 'resetting_driver':
      return 'Resetting driver'
    case 'resetting_usb':
      return 'Resetting USB dongle'
    case 'waiting_for_adapter':
      return 'Waiting for adapter'
    case 'starting_hotspot':
      return 'Starting hotspot'
    case 'verifying_visibility':
      return 'Checking visibility'
    case 'completed':
      return 'Repair complete'
    case 'failed':
      return 'Repair needs attention'
    default:
      return 'Host activity'
  }
}

function getRecoveryProgressValue(recoveryStatus: HostHotspotRecoveryStatus | null): number {
  if (!recoveryStatus) {
    return 10
  }

  switch (recoveryStatus.stage) {
    case 'request_queued':
      return 10
    case 'processing_request':
      return 18
    case 'moving_internet_wifi':
      return 28
    case 'ensuring_profile':
      return 38
    case 'stopping_hotspot':
      return 48
    case 'resetting_driver':
    case 'resetting_usb':
      return 58
    case 'waiting_for_adapter':
      return 68
    case 'starting_hotspot':
      return 80
    case 'verifying_visibility':
      return 90
    case 'completed':
      return 100
    case 'failed':
      return 100
    default:
      return 10
  }
}

function formatRelativeTimestamp(value: string): string {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return 'unknown'
  }

  const elapsedSeconds = Math.max(0, Math.round((Date.now() - timestamp.getTime()) / 1_000))
  if (elapsedSeconds < 2) {
    return 'just now'
  }

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  return `${elapsedMinutes}m ago`
}
