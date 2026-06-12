'use client'

import { KioskSoundSettingsPanel } from '@/components/settings/kiosk-sound-settings-panel'

export function AdminKioskSoundsPage() {
  return (
    <div className="space-y-(--space-4)">
      <div>
        <h1 id="admin-page-title" className="font-display text-3xl font-bold">
          Kiosk Sounds
        </h1>
        <p className="mt-(--space-1) max-w-3xl text-sm text-base-content/65">
          Configure the audio feedback operators hear when badges scan in or out.
        </p>
      </div>

      <KioskSoundSettingsPanel />
    </div>
  )
}
