'use client'

/* global HTMLInputElement */

import type { RefCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, RefreshCw, UserRoundPlus } from 'lucide-react'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { ButtonSpinner, LoadingSpinner } from '@/components/ui/loading-spinner'
import { Chip } from '@/components/ui/chip'
import { TID } from '@/lib/test-ids'
import { cn } from '@/lib/utils'
import {
  MOTION_TIMING,
  type AssignmentBadge,
  type PendingLockupCheckout,
  type ResultPill,
  type ResultTone,
} from './kiosk-domain'

interface KioskMemberScanPanelProps {
  fatalOperationalOutage: boolean
  degradedOperationalData: boolean
  loadingCheckoutOptions: boolean
  pendingLockup: PendingLockupCheckout | null
  resultTone: ResultTone
  stageSurfaceClass: string
  scanPending: boolean
  resultEyebrow: string
  resultTitle: string
  resultMessage: string
  assignmentBadges: AssignmentBadge[]
  hasTodayAssignment: boolean
  resultPill: ResultPill | null
  visitorScanPromptVisible: boolean
  visitorFlowActive: boolean
  scanningDisabled: boolean
  serial: string
  shouldReduceMotion: boolean
  onSerialChange: (value: string) => void
  onSubmitScan: () => void
  onStartVisitorFlow: () => void
  onRefreshOperationalData: () => void
  onRefocusBadgeInput: () => void
  registerBadgeInputRef: RefCallback<HTMLInputElement>
}

export function KioskMemberScanPanel({
  fatalOperationalOutage,
  degradedOperationalData,
  loadingCheckoutOptions,
  pendingLockup,
  resultTone,
  stageSurfaceClass,
  scanPending,
  resultEyebrow,
  resultTitle,
  resultMessage,
  assignmentBadges,
  hasTodayAssignment,
  resultPill,
  visitorScanPromptVisible,
  visitorFlowActive,
  scanningDisabled,
  serial,
  shouldReduceMotion,
  onSerialChange,
  onSubmitScan,
  onStartVisitorFlow,
  onRefreshOperationalData,
  onRefocusBadgeInput,
  registerBadgeInputRef,
}: KioskMemberScanPanelProps) {
  const motionTransition = {
    duration: shouldReduceMotion ? 0.01 : MOTION_TIMING.slow,
  }

  return (
    <section className="flex min-h-0 flex-col gap-(--space-4)">
      <AppCard
        variant="elevated"
        status={fatalOperationalOutage ? 'error' : undefined}
        className="flex min-h-0 flex-1 flex-col border border-base-300 bg-base-100/95 shadow-[var(--shadow-2)] backdrop-blur-sm"
      >
        <AppCardHeader
          className="gap-(--space-2)"
          style={{ padding: 'var(--space-4) var(--space-5) 0' }}
        >
          <Chip variant="faded" color="primary" size="sm" className="uppercase tracking-[0.16em]">
            Member Scan
          </Chip>
        </AppCardHeader>

        <AppCardContent
          className="flex min-h-0 flex-1 flex-col gap-(--space-4)"
          style={{ padding: 'var(--space-4) var(--space-5) var(--space-5)' }}
        >
          {degradedOperationalData && !fatalOperationalOutage && (
            <div role="alert" className="alert alert-warning alert-soft">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Live status is delayed.</p>
                <p className="text-sm">
                  Member scans still work, but the readiness notices may be slightly behind.
                </p>
              </div>
            </div>
          )}

          <div
            className={cn(
              'relative rounded-box border p-(--space-5) shadow-[var(--shadow-1)]',
              stageSurfaceClass
            )}
            role={resultTone === 'error' ? 'alert' : 'status'}
            aria-live={resultTone === 'error' || resultTone === 'warning' ? 'assertive' : 'polite'}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-2"
              style={{
                background:
                  resultTone === 'success'
                    ? 'var(--color-success)'
                    : resultTone === 'warning'
                      ? 'var(--color-warning)'
                      : resultTone === 'error'
                        ? 'var(--color-error)'
                        : resultTone === 'info'
                          ? 'var(--color-info)'
                          : 'var(--color-primary-fadded)',
              }}
            />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={[
                  visitorFlowActive ? 'visitor-active' : 'visitor-idle',
                  resultTitle,
                  resultEyebrow,
                  scanPending ? 'pending' : 'settled',
                  fatalOperationalOutage ? 'fatal' : 'live',
                ].join(':')}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -14 }}
                transition={motionTransition}
                className="flex flex-col gap-(--space-5) pl-(--space-3)"
              >
                <div className="flex flex-wrap items-start justify-between gap-(--space-4)">
                  <div className="max-w-4xl">
                    <p className="text-xs uppercase tracking-[0.22em] opacity-70">
                      {scanPending ? 'Reading badge' : resultEyebrow}
                    </p>
                    <h2
                      className={cn(
                        'mt-(--space-2) pb-(--space-1) font-display text-base-content',
                        visitorFlowActive ? 'text-4xl leading-tight' : 'text-5xl leading-tight'
                      )}
                    >
                      {scanPending ? 'Reading badge…' : resultTitle}
                    </h2>
                    <p className="mt-(--space-4) text-lg leading-relaxed text-base-content/80">
                      {scanPending
                        ? 'Keep the badge steady at the external reader until the kiosk confirms the result.'
                        : resultMessage}
                    </p>
                    {assignmentBadges.length > 0 && (
                      <div className="mt-(--space-4) flex flex-wrap gap-(--space-2)">
                        {assignmentBadges.map((badge) => (
                          <span
                            key={badge.label}
                            className={cn(
                              'badge badge-outline badge-xl',
                              badge.tone === 'success' && 'badge-success',
                              badge.tone === 'warning' && 'badge-warning',
                              badge.tone === 'error' && 'badge-error',
                              hasTodayAssignment && 'font-semibold tracking-[0.08em]'
                            )}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-(--space-2)">
                    {resultPill && (
                      <AppBadge status={resultPill.status} size="lg" pulse={resultPill.pulse}>
                        {resultPill.label}
                      </AppBadge>
                    )}
                  </div>
                </div>

                {visitorFlowActive ? (
                  <div className="grid gap-(--space-3) xl:grid-cols-2">
                    <div className="rounded-box border border-current/15 bg-base-100/70 px-(--space-4) py-(--space-4) text-base-content">
                      <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                        Current mode
                      </p>
                      <p className="mt-(--space-2) text-xl font-semibold leading-tight">
                        Visitor sign-in in progress
                      </p>
                      <p className="mt-(--space-2) text-sm leading-relaxed text-base-content/70">
                        Keep the visitor on the right-hand panel until the flow completes.
                      </p>
                    </div>
                    <div className="rounded-box border border-current/15 bg-base-100/70 px-(--space-4) py-(--space-4) text-base-content">
                      <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                        Member scanning
                      </p>
                      <p className="mt-(--space-2) text-xl font-semibold leading-tight">Paused</p>
                      <p className="mt-(--space-2) text-sm leading-relaxed text-base-content/70">
                        Member scans resume after the visitor flow is cancelled or finished.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-(--space-3)">
                  {visitorScanPromptVisible && !fatalOperationalOutage && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-lg"
                      onClick={onStartVisitorFlow}
                    >
                      <UserRoundPlus className="h-5 w-5" />
                      Start visitor sign-in
                    </button>
                  )}

                  {(fatalOperationalOutage || degradedOperationalData) && (
                    <button
                      type="button"
                      className="btn btn-outline btn-lg"
                      onClick={onRefreshOperationalData}
                    >
                      <RefreshCw className="h-5 w-5" />
                      Refresh services
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {visitorFlowActive ? (
            <div className="rounded-box border border-base-300 bg-base-200/50 p-(--space-4)">
              <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                Member scanning
              </p>
              <p className="mt-(--space-2) text-lg font-semibold leading-tight">
                Paused while visitor check-in is active
              </p>
              <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/70">
                The scanner lane and manual fallback will return as soon as the visitor flow closes.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (scanningDisabled) return
                onSubmitScan()
              }}
              className="mt-(--space-4) grid gap-(--space-4) rounded-box border border-base-300 bg-base-200/50 p-(--space-4) xl:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="space-y-(--space-3)">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                    Staff fallback only
                  </p>
                  <p className="mt-(--space-2) text-lg font-semibold leading-tight">
                    Only use this if the external reader fails
                  </p>
                  <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/70">
                    Staff can type or paste the badge number manually if the scanner needs recovery.
                  </p>
                </div>

                <input
                  ref={registerBadgeInputRef}
                  type="text"
                  className="input input-lg h-14 w-full border-base-300 bg-base-100 font-mono text-base tracking-[0.14em] uppercase placeholder:normal-case placeholder:tracking-normal"
                  placeholder={fatalOperationalOutage ? 'Services unavailable' : 'Badge number'}
                  value={serial}
                  autoComplete="off"
                  onChange={(event) => onSerialChange(event.target.value)}
                  disabled={scanningDisabled}
                  data-testid={TID.dashboard.kiosk.badgeInput}
                />
              </div>

              <div className="flex flex-col justify-end gap-(--space-2)">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm min-w-32 self-start"
                  disabled={scanningDisabled}
                  data-testid={TID.dashboard.kiosk.scanSubmit}
                >
                  {scanPending && <ButtonSpinner />}
                  Submit number
                </button>
                <p className="text-sm text-base-content/60">
                  {fatalOperationalOutage
                    ? 'Scanning will return after the kiosk reconnects.'
                    : 'Members should use the external reader, not this button.'}
                </p>
                {!fatalOperationalOutage && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm justify-start px-0"
                    onClick={onRefocusBadgeInput}
                  >
                    Re-focus scanner field
                  </button>
                )}
              </div>
            </form>
          )}
        </AppCardContent>
      </AppCard>

      {(loadingCheckoutOptions || pendingLockup) && (
        <AppCard
          status="warning"
          className="border border-base-300 bg-base-100/95 shadow-[var(--shadow-2)] backdrop-blur-sm"
        >
          <AppCardHeader className="gap-(--space-3)" style={{ padding: 'var(--space-5)' }}>
            <div className="flex items-center gap-(--space-3)">
              <LoadingSpinner size="sm" className="text-warning" />
              <div>
                <AppCardTitle className="font-display text-2xl">Lockup resolution</AppCardTitle>
                <AppCardDescription className="text-sm text-base-content/70">
                  Preparing the required checkout options.
                </AppCardDescription>
              </div>
            </div>
          </AppCardHeader>
          <AppCardContent style={{ padding: '0 var(--space-5) var(--space-5)' }}>
            <div className="alert alert-warning alert-soft">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                {pendingLockup
                  ? `Preparing lockup options for ${pendingLockup.memberName}.`
                  : 'Waiting for lockup state.'}
              </span>
            </div>
          </AppCardContent>
        </AppCard>
      )}
    </section>
  )
}
