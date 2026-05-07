'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HelpCircle, Play, RotateCcw } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { MotionButton } from '@/components/ui/motion-button'
import { AppBadge, type AppBadgeStatus } from '@/components/ui/AppBadge'
import { AppCard } from '@/components/ui/AppCard'
import { TID } from '@/lib/test-ids'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { createProcedureController } from '@/help/controller'
import { DriverJsProcedureDriver } from '@/help/driver-adapter'
import { dashboardProcedureDefinitions } from '@/help/dashboard-procedures'
import { subscribeHelpTourRequest } from '@/help/help-events'
import { loadProcedureProgress } from '@/help/persistence'
import type {
  ProcedureController,
  ProcedureEvent,
  ProcedureState,
  ProcedureStatus,
} from '@/help/types'

interface ProcedureGroup {
  title: string
  summary: string
  procedureIds: string[]
}

const PROCEDURE_GROUPS: ProcedureGroup[] = [
  {
    title: 'Learn the dashboard',
    summary: 'Orientation and core status reading.',
    procedureIds: ['dashboard.admin.orientation.v2', 'dashboard.admin.status.v2'],
  },
  {
    title: 'Daily routine',
    summary: 'Start and end-of-day checks for Admin users.',
    procedureIds: ['dashboard.admin.daily-start.v1', 'dashboard.admin.daily-end.v1'],
  },
  {
    title: 'Control actions',
    summary: 'Presence review and safe operational changes.',
    procedureIds: ['dashboard.admin.presence.v1', 'dashboard.admin.actions.v2'],
  },
]

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

export function DashboardHelpLauncher() {
  const pathname = usePathname()
  const member = useAuthStore((state) => state.member)
  const [isOpen, setIsOpen] = useState(false)
  const controllerRef = useRef<ProcedureController | null>(null)
  const [controllerState, setControllerState] = useState<ProcedureState>({
    procedureId: null,
    stepIndex: -1,
    status: 'idle',
  })

  const isAdmin = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN
  const shouldRender = isAdmin && pathname === '/dashboard' && Boolean(member?.id)

  const progressByProcedure = new Map<string, ProcedureStatus>()
  if (member?.id) {
    for (const definition of dashboardProcedureDefinitions) {
      const saved = loadProcedureProgress(member.id, definition.id, definition.version)
      if (saved?.status) {
        progressByProcedure.set(definition.id, saved.status)
      }
    }
  }

  useEffect(() => {
    if (!member?.id || pathname !== '/dashboard') return

    const runtime = createProcedureController({
      procedures: dashboardProcedureDefinitions,
      context: {
        route: pathname,
        accountLevel: member.accountLevel,
        memberId: member.id,
        featureFlags: {
          dashboardPilotHelp: true,
        },
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
  }, [member?.accountLevel, member?.id, pathname])

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
    if (!member?.id || pathname !== '/dashboard') return

    return subscribeHelpTourRequest((detail) => {
      const controller = controllerRef.current
      if (!controller) return
      if (detail.routeId !== 'dashboard') return

      const definition = dashboardProcedureDefinitions.find(
        (procedure) => procedure.id === detail.procedureId
      )
      if (!definition) return

      const saved = loadProcedureProgress(member.id, definition.id, definition.version)
      const action = saved?.status === 'in_progress' ? 'resume' : 'start'

      void handleStart(definition.id, action)
    })
  }, [handleStart, member?.id, pathname])

  if (!shouldRender) {
    return null
  }

  return (
    <div
      className="fixed bottom-3 left-3 right-3 z-(--z-sticky) hidden sm:block sm:bottom-6 sm:left-auto sm:right-6"
      data-testid={TID.dashboard.help.launcher}
    >
      <AppCard className="w-full border border-base-300 bg-base-100 shadow-xl sm:w-[28rem]">
        <div className="p-(--space-3)">
          <MotionButton
            className="btn btn-primary btn-sm justify-start"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            data-testid={TID.dashboard.help.toggle}
          >
            <HelpCircle className="h-4 w-4" />
            Dashboard Help Procedures
          </MotionButton>

          {isOpen && (
            <div
              className="mt-(--space-3) space-y-(--space-3)"
              data-testid={TID.dashboard.help.panel}
            >
              <p className="text-xs leading-5 text-base-content/70">
                Choose the procedure that matches your task. Each step explains what to check and
                links to the deeper wiki page when more detail is needed.
              </p>

              <div className="max-h-[min(34rem,calc(100vh-12rem))] space-y-(--space-3) overflow-y-auto pr-(--space-1)">
                {PROCEDURE_GROUPS.map((group) => (
                  <section key={group.title} className="space-y-(--space-2)">
                    <div className="flex items-start justify-between gap-(--space-3)">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-base-content">{group.title}</h3>
                        <p className="text-xs leading-5 text-base-content/60">{group.summary}</p>
                      </div>
                    </div>
                    <ul className="space-y-(--space-2)">
                      {group.procedureIds.map((procedureId) => {
                        const definition = dashboardProcedureDefinitions.find(
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
          )}
        </div>
      </AppCard>
    </div>
  )
}
