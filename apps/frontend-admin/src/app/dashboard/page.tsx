'use client'

import { PageShell } from '@/components/layout/page-shell'
import { PresenceStatsWidget } from '@/components/dashboard/presence-stats-widget'
import { SecurityAlertsWidget } from '@/components/dashboard/security-alerts-widget'
import { CheckinsFeedWidget } from '@/components/dashboard/checkins-feed-widget'
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget'

export default function DashboardPage() {
  return (
    <PageShell>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-6">
        <PresenceStatsWidget />
        <SecurityAlertsWidget />
        <CheckinsFeedWidget />
        <QuickActionsWidget />
      </div>
    </PageShell>
  )
}
