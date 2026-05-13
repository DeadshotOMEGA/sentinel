'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, RotateCcw, Usb, Wifi, Wrench, type LucideIcon } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { TID } from '@/lib/test-ids'
import {
  HOST_HOTSPOT_ANTENNA_WAIT_SECONDS,
  HOST_HOTSPOT_REPAIR_STEPS,
  getHostHotspotAntennaWaitLabel,
  getHostHotspotRepairStepState,
  isHostHotspotAntennaWaitActionDisabled,
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
  const [stage, setStage] = useState<HostHotspotRepairStage>('check-wifi')
  const [antennaWaitStarted, setAntennaWaitStarted] = useState(false)
  const [antennaSecondsRemaining, setAntennaSecondsRemaining] = useState(
    HOST_HOTSPOT_ANTENNA_WAIT_SECONDS
  )
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null)

  const resetFlow = () => {
    setStage('check-wifi')
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
  const primaryDisabled =
    hostHotspotRecovery.isPending ||
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
      void handleRepair('reset-antenna')
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
            })}
          </section>
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
