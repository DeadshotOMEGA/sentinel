'use client'

import { DashboardPersonCardSortSettingsPanel } from '@/components/settings/dashboard-person-card-sort-settings-panel'

export function AdminDashboardSortingPage() {
  return (
    <div className="space-y-(--space-4)">
      <div>
        <h1 id="admin-page-title" className="font-display text-3xl font-bold">
          Dashboard Sorting
        </h1>
        <p className="mt-(--space-1) max-w-3xl text-sm text-base-content/65">
          Control how member cards are sorted on the dashboard.
        </p>
      </div>

      <DashboardPersonCardSortSettingsPanel />
    </div>
  )
}
