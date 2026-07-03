'use client'

import { KioskScannerTimingSettingsPanel } from '@/components/settings/kiosk-scanner-timing-settings-panel'

export function AdminKioskScannerPage() {
  return (
    <div className="space-y-(--space-4)">
      <div>
        <h1 id="admin-page-title" className="font-display text-3xl font-bold">
          Kiosk Scanner
        </h1>
        <p className="mt-(--space-1) max-w-3xl text-sm text-base-content/65">
          Calibrate keyboard-wedge NFC scanner detection for the kiosk without recording scans.
        </p>
      </div>

      <KioskScannerTimingSettingsPanel />
    </div>
  )
}
