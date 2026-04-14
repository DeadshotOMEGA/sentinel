'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, UserRoundPlus } from 'lucide-react'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { Chip } from '@/components/ui/chip'
import {
  VisitorSelfSigninFlow,
  type VisitorSelfSigninCompletion,
} from '@/components/kiosk/visitor-self-signin-flow'
import { KIOSK_ID, MOTION_TIMING } from './kiosk-domain'

interface KioskVisitorRailProps {
  active: boolean
  fatalOperationalOutage: boolean
  shouldReduceMotion: boolean
  onStart: () => void
  onCancel: () => void
  onComplete: (completion: VisitorSelfSigninCompletion) => void
}

export function KioskVisitorRail({
  active,
  fatalOperationalOutage,
  shouldReduceMotion,
  onStart,
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
              status="info"
              className="flex h-full min-h-0 flex-col border border-base-300 bg-base-100/95 shadow-[var(--shadow-2)] backdrop-blur-sm"
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
                    Visitor Sign-In
                  </Chip>
                  <AppBadge status="info">ACTIVE</AppBadge>
                </div>
                <div className="flex items-start gap-(--space-3)">
                  <div className="rounded-box border border-secondary/20 bg-secondary-fadded p-(--space-3) text-secondary-fadded-content">
                    <UserRoundPlus className="h-7 w-7" />
                  </div>
                  <div>
                    <AppCardTitle className="font-display text-3xl leading-tight text-base-content">
                      Visitor check-in
                    </AppCardTitle>
                    <AppCardDescription className="mt-(--space-2) text-sm leading-relaxed text-base-content/72">
                      Complete your visitor check-in here. Member scan confirmations return when
                      this flow closes.
                    </AppCardDescription>
                  </div>
                </div>
              </AppCardHeader>

              <AppCardContent
                className="min-h-0 flex-1 overflow-y-auto"
                style={{ padding: 'var(--space-5)' }}
              >
                <VisitorSelfSigninFlow
                  kioskId={KIOSK_ID}
                  layout="inline"
                  onCancel={onCancel}
                  onComplete={onComplete}
                />
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
              status="info"
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
                    Visitor Sign-In
                  </Chip>
                </div>

                <div className="flex items-start gap-(--space-3)">
                  <div className="rounded-box border border-secondary/20 bg-secondary-fadded p-(--space-3) text-secondary-fadded-content">
                    <UserRoundPlus className="h-7 w-7" />
                  </div>
                  <div>
                    <AppCardTitle className="font-display text-3xl leading-tight text-base-content">
                      Visitor check-in
                    </AppCardTitle>
                    <AppCardDescription className="mt-(--space-2) text-base leading-relaxed text-base-content/72">
                      Visitors can check themselves in here for family, recruiting, contractor, and
                      invited guest visits.
                    </AppCardDescription>
                  </div>
                </div>
              </AppCardHeader>

              <AppCardContent
                className="mt-auto flex"
                style={{ padding: '0 var(--space-5) var(--space-5)' }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-lg h-auto min-h-0 w-auto justify-between gap-(--space-4) px-(--space-5) py-(--space-4) text-xl"
                  onClick={onStart}
                  disabled={fatalOperationalOutage}
                >
                  <span className="text-left text-xl font-semibold">Start visitor check-in</span>
                  <ChevronRight className="h-6 w-6" />
                </button>
              </AppCardContent>
            </AppCard>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
