'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HelpCircle, Play, RotateCcw, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { MotionButton } from '@/components/ui/motion-button'
import { AppBadge, type AppBadgeStatus } from '@/components/ui/AppBadge'
import { AppCard } from '@/components/ui/AppCard'
import { createProcedureController } from '@/help/controller'
import { DriverJsProcedureDriver } from '@/help/driver-adapter'
import { subscribeHelpTourRequest } from '@/help/help-events'
import { loadProcedureProgress } from '@/help/persistence'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import type {
  ProcedureController,
  ProcedureDefinition,
  ProcedureEvent,
  ProcedureState,
  ProcedureStatus,
} from '@/help/types'

export interface ProcedureGroup {
  title: string
  summary: string
  procedureIds: string[]
}

interface ProcedureHelpLauncherProps {
  routeId: string
  routePath: string
  title: string
  intro: string
  procedureGroups: ProcedureGroup[]
  procedures: ProcedureDefinition[]
  minAccountLevel?: number
  testId?: string
  launcherClassName?: string
}

function getBadgeStatus(status?: ProcedureStatus): AppBadgeStatus {
  switch (status) {
    case 'completed':
      return 'success'
    case 'in_progress':
      return 'warning'
    case 'skipped':
      return 'neutral'
    case 'aborted':
      return 'error'
    default:
      return 'info'
  }
}

function getBadgeLabel(status?: ProcedureStatus): string {
  return status ? status.replace('_', ' ') : 'new'
}

export function ProcedureHelpLauncher({
  routeId,
  routePath,
  title,
  intro,
  procedureGroups,
  procedures,
  minAccountLevel = 0,
  testId,
  launcherClassName,
}: ProcedureHelpLauncherProps) {
  const pathname = usePathname()
  const member = useAuthStore((state) => state.member)
  const [isOpen, setIsOpen] = useState(false)
  const controllerRef = useRef<ProcedureController | null>(null)
  const [controllerState, setControllerState] = useState<ProcedureState>({
    procedureId: null,
    stepIndex: -1,
    status: 'idle',
  })

  const isAllowed = (member?.accountLevel ?? 0) >= minAccountLevel
  const shouldRender = isAllowed && pathname.startsWith(routePath) && Boolean(member?.id)

  const progressByProcedure = new Map<string, ProcedureStatus>()
  if (member?.id) {
    for (const definition of procedures) {
      const saved = loadProcedureProgress(member.id, definition.id, definition.version)
      if (saved?.status) {
        progressByProcedure.set(definition.id, saved.status)
      }
    }
  }

  useEffect(() => {
    if (!member?.id || !pathname.startsWith(routePath)) return

    const runtime = createProcedureController({
      procedures,
      context: {
        route: routePath,
        accountLevel: member.accountLevel,
        memberId: member.id,
        featureFlags: {},
      },
      driver: new DriverJsProcedureDriver(),
      onEvent: (event: ProcedureEvent) => {
        setControllerState((prev) => ({
          ...prev,
          procedureId: event.procedureId,
          stepIndex: event.stepIndex ?? prev.stepIndex,
        }))
      },
    })

    controllerRef.current = runtime

    return () => {
      runtime.dispose()
      controllerRef.current = null
    }
  }, [member?.accountLevel, member?.id, pathname, procedures, routePath])

  const handleStart = useCallback(
    async (procedureId: string, action: 'start' | 'resume' | 'restart') => {
      const controller = controllerRef.current
      if (!controller) return

      if (action === 'start') {
        await controller.start(procedureId)
      }

      if (action === 'resume') {
        await controller.resume(procedureId)
      }

      if (action === 'restart') {
        await controller.restart(procedureId)
      }

      setControllerState(controller.getState())
    },
    []
  )

  const handleSkip = useCallback(async () => {
    const controller = controllerRef.current
    if (!controller) return
    await controller.skip()
    setControllerState(controller.getState())
  }, [])

  useEffect(() => {
    if (!member?.id || !pathname.startsWith(routePath)) return

    return subscribeHelpTourRequest((detail) => {
      const controller = controllerRef.current
      if (!controller) return
      if (detail.routeId !== routeId) return

      const definition = procedures.find((procedure) => procedure.id === detail.procedureId)
      if (!definition) return

      const saved = loadProcedureProgress(member.id, definition.id, definition.version)
      const action = saved?.status === 'in_progress' ? 'resume' : 'start'

      void handleStart(definition.id, action)
    })
  }, [handleStart, member?.id, pathname, procedures, routeId, routePath])

  if (!shouldRender) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-3 left-3 right-3 z-(--z-sticky) hidden sm:block sm:left-auto sm:right-6',
        launcherClassName ?? 'sm:bottom-20'
      )}
      data-testid={testId}
    >
      {!isOpen && (
        <MotionButton
          className="btn btn-info btn-sm gap-(--space-2) border-info/45 px-(--space-4) text-info-content shadow-[var(--shadow-2)] transition-shadow duration-(--duration-fast) hover:shadow-[var(--shadow-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="font-semibold normal-case">{title}</span>
        </MotionButton>
      )}

      {isOpen && (
        <AppCard
          status="info"
          className="w-full overflow-hidden border border-base-300 bg-base-100 shadow-xl sm:w-[30rem]"
        >
          <div className="bg-info-fadded px-(--space-4) py-(--space-3) text-info-fadded-content">
            <div className="flex items-start justify-between gap-(--space-3)">
              <div className="flex min-w-0 items-start gap-(--space-3)">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-box bg-base-100 text-info-fadded-content shadow-[var(--shadow-1)]">
                  <HelpCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold leading-5 text-base-content">{title}</h2>
                  <p className="mt-1 text-xs leading-5 text-info-fadded-content">{intro}</p>
                </div>
              </div>
              <MotionButton
                className="btn btn-ghost btn-square btn-sm shrink-0 text-info-fadded-content hover:bg-base-100/70"
                hoverPreset="micro"
                onClick={() => setIsOpen(false)}
                aria-label="Close procedures"
                aria-expanded={isOpen}
              >
                <X className="h-4 w-4" />
              </MotionButton>
            </div>
          </div>

          <div className="p-(--space-3)">
            <div className="space-y-(--space-3)">
              <div className="max-h-[min(34rem,calc(100vh-12rem))] space-y-(--space-3) overflow-y-auto pr-(--space-1)">
                {procedureGroups.map((group) => (
                  <section key={group.title} className="space-y-(--space-2)">
                    <div className="flex items-start justify-between gap-(--space-3)">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-base-content">{group.title}</h3>
                        <p className="text-xs leading-5 text-base-content/60">{group.summary}</p>
                      </div>
                    </div>
                    <ul className="space-y-(--space-2)">
                      {group.procedureIds.map((procedureId) => {
                        const definition = procedures.find(
                          (procedure) => procedure.id === procedureId
                        )
                        if (!definition) return null

                        const savedStatus = progressByProcedure.get(definition.id)
                        const isActive = controllerState.procedureId === definition.id
                        const canResume = savedStatus === 'in_progress'
                        const currentStep =
                          isActive && controllerState.stepIndex >= 0
                            ? controllerState.stepIndex + 1
                            : 0

                        return (
                          <li
                            key={definition.id}
                            className="rounded-box border border-base-300 bg-base-200/60 px-(--space-3) py-(--space-2)"
                          >
                            <div className="flex items-start justify-between gap-(--space-2)">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-5">
                                  {definition.title}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-base-content/65">
                                  {definition.summary}
                                </p>
                              </div>
                              <AppBadge status={getBadgeStatus(savedStatus)} size="sm">
                                {getBadgeLabel(savedStatus)}
                              </AppBadge>
                            </div>

                            {isActive && currentStep > 0 && (
                              <ul className="steps steps-horizontal mt-(--space-2) w-full text-[10px]">
                                <li className="step step-primary">Start</li>
                                <li className="step step-primary">
                                  {currentStep}/{definition.steps.length}
                                </li>
                                <li
                                  className={
                                    currentStep >= definition.steps.length
                                      ? 'step step-primary'
                                      : 'step'
                                  }
                                >
                                  Done
                                </li>
                              </ul>
                            )}

                            <div className="mt-(--space-2) flex flex-wrap gap-(--space-2)">
                              <MotionButton
                                className="btn btn-xs btn-primary"
                                onClick={() =>
                                  void handleStart(definition.id, canResume ? 'resume' : 'start')
                                }
                              >
                                <Play className="h-3 w-3" />
                                {canResume ? 'Resume' : 'Start'}
                              </MotionButton>
                              <MotionButton
                                className="btn btn-xs btn-outline"
                                onClick={() => void handleStart(definition.id, 'restart')}
                              >
                                <RotateCcw className="h-3 w-3" />
                                Restart
                              </MotionButton>
                              {isActive && (
                                <MotionButton
                                  className="btn btn-xs btn-ghost"
                                  onClick={() => void handleSkip()}
                                >
                                  Skip
                                </MotionButton>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </AppCard>
      )}
    </div>
  )
}
