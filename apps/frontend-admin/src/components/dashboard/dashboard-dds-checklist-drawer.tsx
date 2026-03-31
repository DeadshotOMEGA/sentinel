'use client'

import Link from 'next/link'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BookOpenCheck, ChevronLeft, PanelRightOpen } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DdsChecklistCard } from '@/components/dds/dds-checklist-card'
import { useDdsPageContent } from '@/hooks/use-dds-page-content'
import { useDdsChecklist } from '@/hooks/use-dds-checklist'
import { useOperationalTimings } from '@/hooks/use-operational-timings'
import { useOperationalDateKey } from '@/hooks/use-operational-date-key'
import { TID } from '@/lib/test-ids'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'

interface DashboardDdsChecklistDrawerProps {
  children: ReactNode
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function DashboardDdsChecklistDrawer({ children }: DashboardDdsChecklistDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const member = useAuthStore((state) => state.member)
  const { data, isLoading, isError, error } = useDdsPageContent()
  const { data: timingsData } = useOperationalTimings({ enabled: true })
  const rolloverTime = timingsData?.settings.operational.dayRolloverTime ?? '03:00'
  const operationalDateKey = useOperationalDateKey(rolloverTime)
  const drawerZIndex = 'calc(var(--z-tooltip) + 1)'
  const floatingTabHeight = '2.5rem'
  const floatingTabRight = 'calc(-1 * var(--space-3))'
  const ddsTabTop = 'calc(4rem + var(--space-4) + var(--space-5) + 10px)'
  const kioskTabTop = `calc(${ddsTabTop} + ${floatingTabHeight} + 10px)`
  const floatingTabClassName =
    'fixed right-0 z-(--z-sticky) h-10 w-26 items-center justify-center gap-(--space-1) rounded-l-full rounded-r-none px-(--space-2) text-sm ring-1 ring-base-100/50'
  const floatingTabHover = shouldReduceMotion ? undefined : { x: -5, y: -2, scale: 1.03 }
  const floatingTabTap = shouldReduceMotion ? undefined : { x: -2, y: -1, scale: 0.98 }
  const floatingTabTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: 'easeOut' as const }

  const checklist = useDdsChecklist({
    checklistBlocks: data?.content.checklistBlocks ?? [],
    memberId: member?.id,
    dateKey: operationalDateKey,
  })
  const checklistCompletionPercent = clampPercent(checklist.completionPercent)
  const checklistProgressTip =
    checklist.totalTasks > 0
      ? `Checklist ${checklistCompletionPercent}% (${checklist.completedTasks}/${checklist.totalTasks})`
      : 'Checklist progress unavailable'
  const checklistProgressStyle = {
    '--value': checklistCompletionPercent,
    '--size': 'calc(var(--space-6) + var(--space-2))',
    '--thickness': 'calc(var(--space-1) - 1px)',
  } as CSSProperties

  return (
    <div className="drawer drawer-end overflow-visible">
      <input
        type="checkbox"
        className="drawer-toggle"
        checked={isOpen}
        onChange={(event) => setIsOpen(event.target.checked)}
        aria-hidden="true"
      />

      <div className="drawer-content overflow-visible">
        {children}

        {!isOpen ? (
          <motion.button
            type="button"
            className={cn('btn btn-sm btn-secondary text-white', floatingTabClassName)}
            whileHover={floatingTabHover}
            whileTap={floatingTabTap}
            transition={floatingTabTransition}
            style={{
              right: floatingTabRight,
              top: ddsTabTop,
              boxShadow:
                'var(--shadow-3), -12px 0 22px -12px color-mix(in oklab, var(--color-neutral) 80%, transparent), 0 20px 28px -18px color-mix(in oklab, var(--color-neutral) 80%, transparent)',
            }}
            onClick={() => setIsOpen(true)}
            data-testid={TID.dashboard.ddsDrawer.open}
          >
            <span className="font-semibold tracking-wide">DDS</span>
            <div className="tooltip tooltip-left" data-tip={checklistProgressTip}>
              <div
                className="radial-progress shrink-0 text-white text-[0.6rem] font-semibold"
                style={checklistProgressStyle}
                aria-label={`Checklist completion ${checklistCompletionPercent}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={checklistCompletionPercent}
                role="progressbar"
              >
                {checklistCompletionPercent}%
              </div>
            </div>
          </motion.button>
        ) : null}

        <motion.button
          type="button"
          className={cn('btn btn-sm btn-secondary text-white', floatingTabClassName)}
          whileHover={floatingTabHover}
          whileTap={floatingTabTap}
          transition={floatingTabTransition}
          style={{
            right: floatingTabRight,
            top: kioskTabTop,
            boxShadow:
              'var(--shadow-3), -12px 0 22px -12px color-mix(in oklab, var(--color-neutral) 70%, transparent), 0 20px 28px -18px color-mix(in oklab, var(--color-neutral) 70%, transparent)',
          }}
          onClick={() => window.open('/kiosk', '_blank', 'noopener,noreferrer')}
          data-testid={TID.dashboard.kiosk.launchTab}
        >
          KIOSK
        </motion.button>
      </div>

      <div className="drawer-side pointer-events-none" style={{ zIndex: drawerZIndex }}>
        <label
          aria-label="close DDS checklist drawer"
          className={cn(
            'drawer-overlay fixed left-0 right-0 pointer-events-auto transition-opacity duration-(--duration-normal)',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            top: '4rem',
            height: 'calc(100dvh - 4rem)',
          }}
          onClick={() => setIsOpen(false)}
        />

        <aside
          className={cn(
            'pointer-events-auto fixed right-0 border-l border-base-300 bg-base-200 transition-transform duration-(--duration-normal)',
            isOpen ? 'translate-x-0' : 'translate-x-full'
          )}
          style={{
            top: '4rem',
            height: 'calc(100dvh - 4rem)',
            width: '30rem',
            maxWidth: 'calc(100vw - var(--space-8))',
            boxShadow: 'var(--shadow-3)',
            padding: 'var(--space-4)',
            display: 'grid',
            gap: 'var(--space-4)',
            alignContent: 'start',
            overflowY: 'auto',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <PanelRightOpen className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">DDS Checklist</h2>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setIsOpen(false)}
              data-testid={TID.dashboard.ddsDrawer.close}
            >
              <ChevronLeft className="h-4 w-4" />
              Close
            </button>
          </div>

          <Link
            href="/dds"
            className="btn btn-outline btn-primary btn-sm justify-start"
            data-testid={TID.dashboard.ddsDrawer.infoLink}
          >
            <BookOpenCheck className="h-4 w-4" />
            DDS Information
          </Link>

          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : isError || !data ? (
            <div className="alert alert-error alert-soft">
              <span>{error instanceof Error ? error.message : 'Failed to load DDS checklist'}</span>
            </div>
          ) : (
            <DdsChecklistCard
              checkoffMap={checklist.checkoffMap}
              checklistBlocks={data.content.checklistBlocks}
              completedTasks={checklist.completedTasks}
              completionPercent={checklist.completionPercent}
              onToggleTask={checklist.toggleTask}
              renderAsCard={false}
              totalTasks={checklist.totalTasks}
              showHeader={false}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
