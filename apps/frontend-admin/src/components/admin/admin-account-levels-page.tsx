'use client'

import { AccountLevelSettingsPanel } from '@/components/settings/account-level-settings-panel'

export function AdminAccountLevelsPage() {
  return (
    <div className="space-y-(--space-4)">
      <div>
        <h1 id="admin-page-title" className="font-display text-3xl font-bold">
          Account Levels
        </h1>
        <p className="mt-(--space-1) max-w-3xl text-sm text-base-content/65">
          Review access by level and reassign member account levels.
        </p>
      </div>

      <AccountLevelSettingsPanel />
    </div>
  )
}
