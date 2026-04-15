'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, MonitorCog, ScanLine } from 'lucide-react'
import { KioskScreen } from '@/components/kiosk/kiosk-screen'

const SECRET_TAP_TARGET = 5
const SECRET_TAP_WINDOW_MS = 3500
const EXIT_PANEL_AUTO_HIDE_MS = 12000
const BADGE_FOCUS_REQUEST_EVENT = 'kiosk-request-badge-focus'

export function KioskShell() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const [showExitControls, setShowExitControls] = useState(false)
  const tapTimestampsRef = useRef<number[]>([])

  const revealExitControls = () => {
    setShowExitControls(true)
  }

  useEffect(() => {
    if (typeof document === 'undefined') return

    const hiddenDevtools = new Set<HTMLElement>()

    const concealDevtools = () => {
      const selectors = [
        '.tsqd-parent-container',
        'button[aria-label="Open Tanstack query devtools"]',
        'button[aria-label="Open Next.js Dev Tools"]',
      ]

      for (const selector of selectors) {
        const elements = document.querySelectorAll<HTMLElement>(selector)
        for (const element of elements) {
          if (element.dataset.kioskHidden === 'true') continue
          element.dataset.kioskHidden = 'true'
          element.dataset.kioskPreviousDisplay = element.style.display
          element.style.display = 'none'
          hiddenDevtools.add(element)
        }
      }
    }

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const isSecretShortcut = event.ctrlKey && event.altKey && event.shiftKey && key === 'k'
      if (isSecretShortcut) {
        event.preventDefault()
        revealExitControls()
        return
      }

      const isBrowserShortcut =
        (event.ctrlKey || event.metaKey) && ['r', 't', 'n', 'w', 'l', 'p', 's'].includes(key)
      const isNavigationShortcut =
        event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')

      if (isBrowserShortcut || isNavigationShortcut) {
        event.preventDefault()
      }
    }

    const observer = new window.MutationObserver(() => {
      concealDevtools()
    })

    document.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleKeyDown, { capture: true })

    document.body.classList.add('kiosk-lock-mode')
    concealDevtools()
    observer.observe(document.body, { childList: true, subtree: true })

    window.setTimeout(() => {
      window.dispatchEvent(new window.CustomEvent(BADGE_FOCUS_REQUEST_EVENT))
    }, 150)

    return () => {
      observer.disconnect()
      document.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.body.classList.remove('kiosk-lock-mode')

      for (const element of hiddenDevtools) {
        element.style.display = element.dataset.kioskPreviousDisplay ?? ''
        delete element.dataset.kioskHidden
        delete element.dataset.kioskPreviousDisplay
      }
    }
  }, [])

  useEffect(() => {
    if (!showExitControls) return
    const timer = window.setTimeout(() => setShowExitControls(false), EXIT_PANEL_AUTO_HIDE_MS)
    return () => window.clearTimeout(timer)
  }, [showExitControls])

  const handleSecretTap = () => {
    const now = Date.now()
    const next = [...tapTimestampsRef.current, now].filter(
      (timestamp) => now - timestamp <= SECRET_TAP_WINDOW_MS
    )
    tapTimestampsRef.current = next

    if (next.length >= SECRET_TAP_TARGET) {
      tapTimestampsRef.current = []
      revealExitControls()
    }
  }

  const handleExitKiosk = () => {
    router.push('/dashboard')
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-base-300">
      <KioskScreen />

      <button
        type="button"
        aria-label="Hidden kiosk controls"
        onClick={handleSecretTap}
        className="fixed left-0 top-0 h-10 w-10 opacity-0"
      />

      <AnimatePresence initial={false}>
        {showExitControls && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
            className="fixed bottom-(--space-4) right-(--space-4) z-[var(--z-tooltip)] w-[22rem] rounded-box border border-base-300 bg-base-100/95 shadow-[var(--shadow-3)] backdrop-blur-sm"
          >
            <div className="flex flex-col gap-(--space-3) p-(--space-4)">
              <div className="flex items-start justify-between gap-(--space-3)">
                <div className="flex items-start gap-(--space-3)">
                  <div className="rounded-box border border-base-300 bg-base-200/70 p-(--space-2)">
                    <MonitorCog className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-base-content/55">
                      Maintenance Controls
                    </p>
                    <p className="mt-(--space-1) text-sm text-base-content/70">
                      Shortcut: Ctrl + Alt + Shift + K
                    </p>
                  </div>
                </div>
                <div className="rounded-box border border-base-300 bg-base-200/60 px-(--space-2) py-(--space-1) text-xs uppercase tracking-[0.16em] text-base-content/55">
                  Hidden
                </div>
              </div>

              <div className="rounded-box border border-base-300 bg-base-200/45 p-(--space-3) text-sm text-base-content/75">
                Use these controls only for recovery or returning to the dashboard.
              </div>

              <button
                type="button"
                className="btn btn-warning justify-between"
                onClick={handleExitKiosk}
              >
                <span>Exit kiosk page</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn btn-ghost justify-between"
                onClick={() => setShowExitControls(false)}
              >
                <span>Hide controls</span>
                <ScanLine className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
