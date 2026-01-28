'use client'

import { PageShell } from '@/components/layout/page-shell'
import { PresenceStatsWidget } from '@/components/dashboard/presence-stats-widget'
import { SecurityAlertsBar } from '@/components/dashboard/security-alerts-bar'
import { QuickActionButtons } from '@/components/dashboard/quick-action-buttons'
import { DdsStatusWidget } from '@/components/dashboard/dds-status-widget'
import { BuildingStatusWidget } from '@/components/dashboard/building-status-widget'
import { DutyWatchWidget } from '@/components/dashboard/duty-watch-widget'
import { RecentActionsSidebar } from '@/components/dashboard/recent-actions-sidebar'

export default function DashboardPage() {
  return (
    <>
      <PageShell>
        {/* Security Alerts Bar - only shows if there are active alerts */}
        <SecurityAlertsBar />

        {/* Quick Action Buttons */}
        <QuickActionButtons />

        {/* Main Content - Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PresenceStatsWidget />
          <DdsStatusWidget />
          <BuildingStatusWidget />
        </div>

        {/* Duty Watch Widget - only visible on Tue/Thu */}
        <div className="mt-6">
          <DutyWatchWidget />
        </div>
      </PageShell>

      {/* Recent Actions Sidebar - fixed positioned, collapsible from the right */}
      <RecentActionsSidebar />
    </>
  )
}
