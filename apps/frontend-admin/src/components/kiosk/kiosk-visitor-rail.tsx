'use client'

import { AnimatePresence, motion } from 'motion/react'
import { UserRoundPlus } from 'lucide-react'
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from '@/components/ui/AppCard'
import { Chip } from '@/components/ui/chip'
import {
  VisitorSelfSigninFlow,
  type VisitorSelfSigninCompletion,
} from '@/components/kiosk/visitor-self-signin-flow'
import { VisitorSelfSignoutFlow } from '@/components/kiosk/visitor-self-signout-flow'
import { KIOSK_ID, MOTION_TIMING } from './kiosk-domain'

export type VisitorRailMode = 'signin' | 'signout'

interface KioskVisitorRailProps {
  active: boolean
  mode: VisitorRailMode
  fatalOperationalOutage: boolean
  shouldReduceMotion: boolean
  onStart: (mode: VisitorRailMode) => void
  onModeChange: (mode: VisitorRailMode) => void
  onCancel: () => void
  onComplete: (completion: VisitorSelfSigninCompletion) => void
}

export function KioskVisitorRail({
  active,
  mode,
  fatalOperationalOutage,
  shouldReduceMotion,
  onStart,
  onModeChange,
  onCancel,
  onComplete,
}: KioskVisitorRailProps) {
  const motionTransition = {
    duration: shouldReduceMotion ? 0.01 : MOTION_TIMING.slow,
  }

  return (
    <aside className="min-h-0">
      <AnimatePresence mode="wait" initial={false}>
        {active ? (
          <motion.div
            key="visitor-flow-active"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -14 }}
            transition={motionTransition}
            className="h-full min-h-full"
          >
            <AppCard
              status="neutral"
              className="flex h-full min-h-0 flex-col border border-base-300 bg-base-100/95 shadow-(--shadow-2) backdrop-blur-sm"
            >
              <AppCardHeader
                className="gap-(--space-3) border-b border-base-300"
                style={{ padding: 'var(--space-5)' }}
              >
                <div className="flex flex-wrap items-center gap-(--space-2)">
                  <Chip
                    variant="faded"
                    color="secondary"
                    size="sm"
                    className="uppercase tracking-[0.16em]"
                  >
                    Visitor {mode === 'signin' ? 'Sign-In' : 'Sign-Out'}
                  </Chip>
                </div>

                <div className="join join-horizontal">
                  <button
                    type="button"
                    className={`btn btn-sm join-item ${mode === 'signin' ? 'btn-secondary' : 'btn-outline'}`}
                    onClick={() => onModeChange('signin')}
                    disabled={fatalOperationalOutage}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm join-item ${mode === 'signout' ? 'btn-secondary' : 'btn-outline'}`}
                    onClick={() => onModeChange('signout')}
                    disabled={fatalOperationalOutage}
                  >
                    Sign out
                  </button>
                </div>
              </AppCardHeader>

              <AppCardContent
                className="min-h-0 flex-1 overflow-y-auto"
                style={{ padding: 'var(--space-5)' }}
              >
                {mode === 'signin' ? (
                  <VisitorSelfSigninFlow
                    kioskId={KIOSK_ID}
                    layout="inline"
                    onCancel={onCancel}
                    onComplete={onComplete}
                  />
                ) : (
                  <VisitorSelfSignoutFlow
                    layout="inline"
                    onCancel={onCancel}
                    onComplete={onComplete}
                  />
                )}
              </AppCardContent>
            </AppCard>
          </motion.div>
        ) : (
          <motion.div
            key="visitor-flow-idle"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -14 }}
            transition={motionTransition}
            className="h-full min-h-full"
          >
            <AppCard
              status="neutral"
              className="flex h-full min-h-0 flex-col border border-base-300 bg-base-100/95 shadow-[var(--shadow-2)] backdrop-blur-sm"
            >
              <AppCardHeader className="gap-(--space-4)" style={{ padding: 'var(--space-5)' }}>
                <div className="flex flex-wrap items-center gap-(--space-2)">
                  <Chip
                    variant="faded"
                    color="secondary"
                    size="sm"
                    className="uppercase tracking-[0.16em]"
                  >
                    Visitor Services
                  </Chip>
                </div>

                <div className="flex items-start gap-(--space-3)">
                  <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3) text-primary">
                    <UserRoundPlus className="h-7 w-7" />
                  </div>
                  <div>
                    <AppCardTitle className="font-display text-3xl leading-tight text-base-content">
                      Visitor Services
                    </AppCardTitle>
                  </div>
                </div>
              </AppCardHeader>

              <AppCardContent
                className="mt-auto flex min-h-0 flex-1 flex-col gap-(--space-3)"
                style={{ padding: '0 var(--space-5) var(--space-5)' }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-lg px-(--space-5) py-(--space-4) text-xl font-semibold tracking-[0.12em]"
                  onClick={() => onStart('signin')}
                  disabled={fatalOperationalOutage}
                >
                  START
                </button>

                <div className="mt-(--space-2) border-t border-base-300 pt-(--space-3)">
                  <VisitorSelfSignoutFlow
                    layout="inline"
                    presentation="embedded"
                    interactionDisabled={fatalOperationalOutage}
                    showCloseAction={false}
                    onCancel={onCancel}
                    onComplete={onComplete}
                  />
                </div>
              </AppCardContent>
            </AppCard>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
