'use client'

import { useEffect, useMemo, useState } from 'react'
import { HelpCircle, Play, RotateCcw } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { TID } from '@/lib/test-ids'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { createProcedureController } from '@/help/controller'
import { DriverJsProcedureDriver } from '@/help/driver-adapter'
import { dashboardProcedureDefinitions } from '@/help/dashboard-procedures'
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
  const [controller, setController] = useState<ProcedureController | null>(null)
  const [controllerState, setControllerState] = useState<ProcedureState>({
    procedureId: null,
    stepIndex: -1,
    status: 'idle',
  })
  const [lastEventAt, setLastEventAt] = useState<number>(Date.now())

  const isAdmin = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN

  const progressByProcedure = useMemo(() => {
    if (!member?.id) return new Map<string, string>()

    const progress = new Map<string, string>()
    for (const definition of dashboardProcedureDefinitions) {
      const saved = loadProcedureProgress(member.id, definition.id, definition.version)
      if (saved?.status) {
        progress.set(definition.id, saved.status)
      }
    }

    return progress
  }, [member?.id, lastEventAt])

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
        setLastEventAt(Date.now())
        setControllerState((prev) => ({
          ...prev,
          procedureId: event.procedureId,
          stepIndex: event.stepIndex ?? prev.stepIndex,
        }))
      },
    })

    setController(runtime)

    return () => {
      runtime.dispose()
      setController(null)
    }
  }, [member?.accountLevel, member?.id, pathname])

  if (!isAdmin || pathname !== '/dashboard' || !member?.id) {
    return null
  }

  const handleStart = async (procedureId: string, action: 'start' | 'resume' | 'restart') => {
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
    setLastEventAt(Date.now())
  }

  const handleSkip = async () => {
    if (!controller) return
    await controller.skip()
    setControllerState(controller.getState())
    setLastEventAt(Date.now())
  }

  return (
    <div className="fixed bottom-6 right-6 z-[70]" data-testid={TID.dashboard.help.launcher}>
      <div className="card bg-base-100 border border-base-300 shadow-xl w-96">
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
