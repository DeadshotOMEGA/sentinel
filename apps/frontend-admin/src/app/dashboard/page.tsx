import { SecurityAlertsBar } from '@/components/dashboard/security-alerts-bar'
import { QuickActionButtons } from '@/components/dashboard/quick-action-buttons'
import { StatusStats } from '@/components/dashboard/status-stats'
import { CheckinsFeedWidget } from '@/components/dashboard/checkins-feed-widget'

export default function DashboardPage() {
  return (
    <>
      {/* Security Alerts Bar - only shows if there are active alerts */}
      <SecurityAlertsBar />

      {/* Quick Action Buttons */}
      <QuickActionButtons />

      {/* Status Stats */}
      <div className="mt-6"><StatusStats /></div>

      {/* Main Content Check-in Feed */}
      <div className="mt-6"><CheckinsFeedWidget /></div>

    </>
  )
}
