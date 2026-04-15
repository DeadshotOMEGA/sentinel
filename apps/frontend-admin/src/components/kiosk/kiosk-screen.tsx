'use client'

import { KioskResponsibilityPrompt } from '@/components/kiosk/kiosk-responsibility-prompt'
import { KioskMemberScanPanel } from '@/components/kiosk/kiosk-member-scan-panel'
import { KioskOperationalHeader } from '@/components/kiosk/kiosk-operational-header'
import { KioskVisitorRail } from '@/components/kiosk/kiosk-visitor-rail'
import { LockupOptionsModal } from '@/components/lockup/lockup-options-modal'
import { useKioskScreen } from '@/components/kiosk/use-kiosk-screen'

export function KioskScreen() {
  const kiosk = useKioskScreen()

  return (
    <>
      <div className="relative flex h-full min-h-dvh flex-col overflow-hidden bg-base-300 text-base-content">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at top left, color-mix(in oklab, var(--color-primary) 7%, transparent) 0%, transparent 28%), linear-gradient(to right, color-mix(in oklab, var(--color-base-content) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-base-content) 6%, transparent) 1px, transparent 1px)',
            backgroundSize:
              'auto, var(--space-10) var(--space-10), var(--space-10) var(--space-10)',
          }}
        />

        <div className="relative z-[var(--z-base)] flex h-full min-h-0 flex-col gap-(--space-4) p-(--space-4) xl:p-(--space-5)">
          <KioskOperationalHeader {...kiosk.header} />

          <div className="grid min-h-0 flex-1 gap-(--space-4) xl:grid-cols-2">
            <KioskMemberScanPanel
              {...kiosk.memberPanel}
              shouldReduceMotion={Boolean(kiosk.prefersReducedMotion)}
            />
            <KioskVisitorRail
              {...kiosk.visitorRail}
              shouldReduceMotion={Boolean(kiosk.prefersReducedMotion)}
            />
          </div>
        </div>

        {kiosk.responsibilityPrompt && (
          <KioskResponsibilityPrompt {...kiosk.responsibilityPrompt} />
        )}
      </div>

      {kiosk.lockupModal && <LockupOptionsModal {...kiosk.lockupModal} />}
    </>
  )
}
