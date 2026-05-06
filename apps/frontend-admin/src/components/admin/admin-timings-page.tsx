'use client'

import { TimingsSettingsPanel } from '@/components/settings/timings-settings-panel'

export function AdminTimingsPage() {
  return (
    <div className="space-y-(--space-4)">
      <div>
        <h1 id="admin-page-title" className="font-display text-3xl font-bold">
          Timings
        </h1>
        <p className="mt-(--space-1) max-w-3xl text-sm text-base-content/65">
          Manage scheduler cutoffs, Duty Watch timing, reportable Training/Admin Nights, working
          hours, and duplicate-alert limits.
        </p>
      </div>

      <TimingsSettingsPanel />
    </div>
  )
}
