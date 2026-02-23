'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KioskCheckinScreen } from '@/components/dashboard/kiosk-checkin-screen'

const SECRET_TAP_TARGET = 5
const SECRET_TAP_WINDOW_MS = 3500
const EXIT_PANEL_AUTO_HIDE_MS = 12000

export function KioskShell() {
  const router = useRouter()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showExitControls, setShowExitControls] = useState(false)
  const tapTimestampsRef = useRef<number[]>([])

  const attemptFullscreen = async () => {
    if (typeof document === 'undefined') return
    if (document.fullscreenElement) return
    if (typeof document.documentElement.requestFullscreen !== 'function') return

    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Browser may require user gesture or deny fullscreen while loading.
    }
  }

  const exitFullscreen = async () => {
    if (typeof document === 'undefined') return
    if (!document.fullscreenElement || typeof document.exitFullscreen !== 'function') return

    try {
      await document.exitFullscreen()
    } catch {
      // Ignore failures and keep kiosk controls available.
    }
  }

  const revealExitControls = () => {
    setShowExitControls(true)
  }

  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
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
      const isFullscreenToggle = event.key === 'F11'
      const isNavigationShortcut =
        event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')

      if (isBrowserShortcut || isFullscreenToggle || isNavigationShortcut) {
        event.preventDefault()
      }
    }

    const handleInteraction = () => {
      void attemptFullscreen()
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    window.addEventListener('pointerdown', handleInteraction, { passive: true })
    window.addEventListener('touchstart', handleInteraction, { passive: true })

    setIsFullscreen(Boolean(document.fullscreenElement))
    document.body.classList.add('kiosk-lock-mode')
    void attemptFullscreen()

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      window.removeEventListener('pointerdown', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      document.body.classList.remove('kiosk-lock-mode')
    }
  }, [])

  useEffect(() => {
    if (!showExitControls) return

    const timer = setTimeout(() => setShowExitControls(false), EXIT_PANEL_AUTO_HIDE_MS)
    return () => clearTimeout(timer)
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

  const handleExitKiosk = async () => {
    await exitFullscreen()
    router.push('/dashboard')
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-base-300 p-2 lg:p-3">
      <div className="h-full border border-base-300 bg-base-100 shadow-xl">
        <KioskCheckinScreen isActive mode="standalone" />
      </div>

      {!isFullscreen && (
        <div className="pointer-events-none fixed inset-x-0 top-2 z-[var(--z-tooltip)] flex justify-center px-2">
          <div className="badge badge-warning badge-outline badge-lg bg-base-100/95">
            Tap screen to enter full screen
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label="Hidden kiosk controls"
        onClick={handleSecretTap}
        className="fixed left-0 top-0 h-10 w-10 opacity-0"
      />

      {showExitControls && (
        <div className="fixed bottom-3 right-3 z-[var(--z-tooltip)] card card-border w-72 bg-base-100 shadow-xl">
          <div className="card-body p-3 gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/70">
              Maintenance Controls
            </p>
            <p className="text-xs text-base-content/70">
              Hidden shortcut: <kbd className="kbd kbd-xs">Ctrl</kbd> +{' '}
              <kbd className="kbd kbd-xs">Alt</kbd> + <kbd className="kbd kbd-xs">Shift</kbd> +{' '}
              <kbd className="kbd kbd-xs">K</kbd>
            </p>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => void exitFullscreen()}
            >
              Exit Full Screen
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={() => void handleExitKiosk()}
            >
              Exit Kiosk Page
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setShowExitControls(false)}
            >
              Hide Controls
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
