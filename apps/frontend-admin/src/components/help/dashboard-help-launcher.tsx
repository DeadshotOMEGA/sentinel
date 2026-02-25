'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HelpCircle, Play, RotateCcw } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { TID } from '@/lib/test-ids'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { createProcedureController } from '@/help/controller'
import { DriverJsProcedureDriver } from '@/help/driver-adapter'
import { dashboardProcedureDefinitions } from '@/help/dashboard-procedures'
import { subscribeHelpTourRequest } from '@/help/help-events'
import { loadProcedureProgress } from '@/help/persistence'
import type { ProcedureController, ProcedureEvent, ProcedureState } from '@/help/types'

function getBadgeClass(status?: string): string {
  switch (status) {
    case 'completed':
      return 'badge badge-success badge-outline'
    case 'in_progress':
      return 'badge badge-warning badge-outline'
    case 'skipped':
      return 'badge badge-secondary badge-outline'
    case 'aborted':
      return 'badge badge-error badge-outline'
    default:
      return 'badge badge-ghost'
  }
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

  const progressByProcedure = new Map<string, string>()
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
      className="fixed bottom-3 left-3 right-3 z-[70] hidden sm:block sm:bottom-6 sm:left-auto sm:right-6"
      data-testid={TID.dashboard.help.launcher}
    >
      <div className="card bg-base-100 border border-base-300 shadow-xl w-full sm:w-96">
        <div className="card-body p-3">
          <button
            className="btn btn-primary btn-sm justify-start"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            data-testid={TID.dashboard.help.toggle}
          >
            <HelpCircle className="h-4 w-4" />
            Dashboard Help Procedures
          </button>

          {isOpen && (
            <div className="mt-3 space-y-3" data-testid={TID.dashboard.help.panel}>
              <p className="text-xs text-base-content/70">
                Admin pilot: start, resume, or restart role-specific dashboard procedures.
              </p>

              <ul className="space-y-2">
                {dashboardProcedureDefinitions.map((definition) => {
                  const savedStatus = progressByProcedure.get(definition.id)
                  const isActive = controllerState.procedureId === definition.id
                  const canResume = savedStatus === 'in_progress'

                  return (
                    <li key={definition.id} className="rounded-lg border border-base-300 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{definition.title}</p>
                        <span className={getBadgeClass(savedStatus)}>{savedStatus ?? 'new'}</span>
                      </div>
                      <p className="text-xs text-base-content/70 mt-1">{definition.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={() =>
                            void handleStart(definition.id, canResume ? 'resume' : 'start')
                          }
                        >
                          <Play className="h-3 w-3" />
                          {canResume ? 'Resume' : 'Start'}
                        </button>
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={() => void handleStart(definition.id, 'restart')}
                        >
                          <RotateCcw className="h-3 w-3" /> Restart
                        </button>
                        {isActive && (
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => void handleSkip()}
                          >
                            Skip
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
