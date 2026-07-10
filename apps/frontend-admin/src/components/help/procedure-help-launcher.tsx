'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ElementRef, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import { BookOpenCheck, HelpCircle, Play, RotateCcw, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { MotionButton } from '@/components/ui/motion-button'
import { AppBadge, type AppBadgeStatus } from '@/components/ui/AppBadge'
import { AppCard } from '@/components/ui/AppCard'
import { createProcedureController } from '@/help/controller'
import { DriverJsProcedureDriver } from '@/help/driver-adapter'
import { subscribeHelpTourRequest, subscribeProcedureHelpOpen } from '@/help/help-events'
import { clearProcedureProgress, loadProcedureProgress } from '@/help/persistence'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import type {
  ProcedureController,
  ProcedureDefinition,
  ProcedureEvent,
  ProcedureProgress,
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
  showLauncherButton?: boolean
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

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
      return 'neutral'
  }
}

function getBadgeLabel(status?: ProcedureStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'in_progress':
      return 'In Progress'
    case 'skipped':
      return 'Skipped'
    case 'aborted':
      return 'Stopped'
    default:
      return 'Not Started'
  }
}

function getProgressLabel(progress: ProcedureProgress | undefined, stepCount: number): string {
  if (!progress) return `${stepCount} Steps`
  if (progress.status === 'in_progress') {
    return `Step ${Math.min(progress.stepIndex + 1, stepCount)} of ${stepCount}`
  }
  if (progress.status === 'completed') return `Completed ${stepCount} Steps`
  if (progress.status === 'skipped') return 'Skipped Before Completion'
  if (progress.status === 'aborted')
    return `Stopped at Step ${Math.min(progress.stepIndex + 1, stepCount)}`
  return `${stepCount} Steps`
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.matches(':disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.tabIndex !== -1
  )
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
  showLauncherButton = true,
}: ProcedureHelpLauncherProps) {
  const pathname = usePathname()
  const member = useAuthStore((state) => state.member)
  const [isOpen, setIsOpen] = useState(false)
  const controllerRef = useRef<ProcedureController | null>(null)
  const triggerRef = useRef<ElementRef<'button'> | null>(null)
  const panelRef = useRef<ElementRef<'div'> | null>(null)
  const closeButtonRef = useRef<ElementRef<'button'> | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [controllerState, setControllerState] = useState<ProcedureState>({
    procedureId: null,
    stepIndex: -1,
    status: 'idle',
  })
  const [, setProgressRevision] = useState(0)

  const isAllowed = (member?.accountLevel ?? 0) >= minAccountLevel
  const shouldRender = isAllowed && pathname.startsWith(routePath) && Boolean(member?.id)

  const progressByProcedure = new Map<string, ProcedureProgress>()

  if (member?.id) {
    for (const definition of procedures) {
      const saved = loadProcedureProgress(member.id, definition.id, definition.version)
      if (saved) {
        progressByProcedure.set(definition.id, saved)
      }
    }
  }

  const handleClose = useCallback(() => {
    setIsOpen(false)
    window.setTimeout(() => returnFocusRef.current?.focus(), 0)
  }, [])

  const handleOpen = useCallback(() => {
    returnFocusRef.current = triggerRef.current
    setIsOpen(true)
  }, [])

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

      if (isOpen) {
        returnFocusRef.current = null
        flushSync(() => setIsOpen(false))
      }

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
      setProgressRevision((current) => current + 1)
    },
    [isOpen]
  )

  const handleReset = (definition: ProcedureDefinition) => {
    if (!member?.id) return

    if (controllerState.procedureId === definition.id) {
      controllerRef.current?.dispose()
      setControllerState({
        procedureId: null,
        stepIndex: -1,
        status: 'idle',
      })
    }

    clearProcedureProgress(member.id, definition.id, definition.version)
    setProgressRevision((current) => current + 1)
  }

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

  useEffect(() => {
    if (!member?.id || !pathname.startsWith(routePath)) return

    return subscribeProcedureHelpOpen((detail) => {
      if (detail.routeId !== routeId) return
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      setIsOpen(true)
    })
  }, [member?.id, pathname, routeId, routePath])

  useEffect(() => {
    if (!isOpen) return

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 0)

    return () => window.clearTimeout(focusTimer)
  }, [isOpen])

  const handlePanelKeyDown = (event: ReactKeyboardEvent<ElementRef<'div'>>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
      return
    }

    if (event.key !== 'Tab') return

    const panel = panelRef.current
    if (!panel) return

    const focusableElements = getFocusableElements(panel)
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement?.focus()
      return
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement?.focus()
    }
  }

  if (!shouldRender) {
    return null
  }

  if (!isOpen && !showLauncherButton) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed left-3 right-3 z-(--z-popover) hidden sm:block sm:left-auto sm:right-6',
        isOpen ? 'top-20 sm:w-[34rem]' : 'bottom-3',
        !isOpen && (launcherClassName ?? 'sm:bottom-20')
      )}
      data-testid={testId}
    >
      {!isOpen && showLauncherButton && (
        <button
          type="button"
          ref={triggerRef}
          className="btn btn-info btn-sm gap-(--space-2) border-info/45 px-(--space-4) text-info-content shadow-[var(--shadow-2)] transition-shadow duration-(--duration-fast) hover:shadow-[var(--shadow-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info"
          onClick={handleOpen}
          aria-expanded={isOpen}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="font-semibold normal-case">{title}</span>
        </button>
      )}

      {isOpen && (
        <AppCard
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          onKeyDown={handlePanelKeyDown}
          className="w-full overflow-hidden border border-base-500 bg-base-200 shadow-xl"
        >
          <div className="border-b border-base-300 bg-base-100 px-(--space-4) py-(--space-3)">
            <div className="flex items-start justify-between gap-(--space-3)">
              <div className="flex min-w-0 items-start gap-(--space-3)">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-box bg-info-fadded text-info-fadded-content shadow-[var(--shadow-1)]">
                  <BookOpenCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-base-content/55">
                    Tutorial Library
                  </p>
                  <h2
                    id={titleId}
                    className="mt-(--space-1) text-base font-semibold leading-5 text-base-content"
                  >
                    {title}
                  </h2>
                  <p
                    id={descriptionId}
                    className="mt-(--space-1) text-xs leading-5 text-base-content/70"
                  >
                    {intro}
                  </p>
                </div>
              </div>
              <button
                type="button"
                ref={closeButtonRef}
                className="btn btn-ghost btn-square btn-sm shrink-0"
                onClick={handleClose}
                aria-label="Close Tutorials"
                aria-expanded={isOpen}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-base-200 p-(--space-3)">
            <div className="max-h-[min(36rem,calc(100vh-12rem))] space-y-(--space-3) overflow-y-auto pr-(--space-1)">
              {procedureGroups.map((group) => {
                const groupDefinitions = group.procedureIds
                  .map((procedureId) =>
                    procedures.find((procedure) => procedure.id === procedureId)
                  )
                  .filter((definition): definition is ProcedureDefinition => Boolean(definition))

                return (
                  <section
                    key={group.title}
                    className="rounded-box border border-base-300 bg-base-100 shadow-[var(--shadow-1)]"
                  >
                    <div className="border-b border-base-300 bg-base-300/45 px-(--space-3) py-(--space-3)">
                      <div className="flex items-start justify-between gap-(--space-3)">
                        <div className="min-w-0 space-y-(--space-1)">
                          <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-base-content/65">
                            {group.title}
                          </h3>
                          <p className="text-xs leading-5 text-base-content/70">{group.summary}</p>
                        </div>
                        <span className="badge badge-outline badge-sm shrink-0 border-base-400 bg-base-100 text-base-content/70">
                          {groupDefinitions.length} Tutorials
                        </span>
                      </div>
                    </div>
                    <ul className="divide-y divide-base-300/60">
                      {groupDefinitions.length === 0 && (
                        <li className="px-(--space-3) py-(--space-3) text-sm text-base-content/60">
                          No Tutorials Available.
                        </li>
                      )}
                      {groupDefinitions.map((definition) => {
                        const savedProgress = progressByProcedure.get(definition.id)
                        const savedStatus = savedProgress?.status
                        const isActive = controllerState.procedureId === definition.id
                        const canResume = savedStatus === 'in_progress'
                        const progressLabel = getProgressLabel(
                          savedProgress,
                          definition.steps.length
                        )

                        return (
                          <li
                            key={definition.id}
                            className={cn(
                              'grid gap-(--space-3) px-(--space-3) py-(--space-3) lg:grid-cols-[minmax(0,1fr)_auto]',
                              isActive && 'bg-primary-fadded/70'
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-(--space-2)">
                                <p className="text-sm font-semibold leading-5">
                                  {definition.title}
                                </p>
                                <AppBadge status={getBadgeStatus(savedStatus)} size="sm">
                                  {getBadgeLabel(savedStatus)}
                                </AppBadge>
                              </div>
                              <p className="mt-(--space-1) text-xs leading-5 text-base-content/65">
                                {definition.summary}
                              </p>
                              <p className="mt-(--space-1) text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-base-content/45">
                                {progressLabel}
                              </p>
                            </div>
                            <div className="flex items-center gap-(--space-2) lg:justify-end">
                              <MotionButton
                                className="btn btn-xs btn-primary min-w-20"
                                onClick={() =>
                                  void handleStart(definition.id, canResume ? 'resume' : 'start')
                                }
                              >
                                <Play className="h-3 w-3" />
                                {canResume ? 'Resume' : 'Start'}
                              </MotionButton>
                              {savedProgress && (
                                <MotionButton
                                  className="btn btn-xs btn-ghost"
                                  onClick={() => handleReset(definition)}
                                  aria-label={`Reset ${definition.title}`}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Reset
                                </MotionButton>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })}
            </div>
          </div>
        </AppCard>
      )}
    </div>
  )
}
