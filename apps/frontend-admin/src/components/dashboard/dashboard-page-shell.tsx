'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { DashboardScanPanel } from '@/components/dashboard/dashboard-scan-panel'
import { cn } from '@/lib/utils'

interface DashboardPageShellProps {
  children: ReactNode
}

const SCANNER_VISIBILITY_STORAGE_KEY = 'sentinel.dashboard.scanner-visible'

export function DashboardPageShell({ children }: DashboardPageShellProps) {
  const [isScannerVisible, setIsScannerVisible] = useState(true)

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      setIsScannerVisible(window.localStorage.getItem(SCANNER_VISIBILITY_STORAGE_KEY) !== 'hidden')
    }, 0)

    return () => window.clearTimeout(hydrationTimer)
  }, [])

  const handleScannerVisibilityChange = (nextVisible: boolean) => {
    setIsScannerVisible(nextVisible)
    window.localStorage.setItem(SCANNER_VISIBILITY_STORAGE_KEY, nextVisible ? 'visible' : 'hidden')
  }

  return (
    <>
      <main
        className={cn(
          'mx-auto w-full max-w-[1760px] space-y-6 transition-[padding-bottom] duration-(--duration-normal)',
          isScannerVisible ? 'pb-44' : 'pb-20'
        )}
        data-help-id="dashboard.root"
      >
        {children}
      </main>
      <DashboardScanPanel
        isVisible={isScannerVisible}
        onVisibleChange={handleScannerVisibilityChange}
      />
    </>
  )
}
