import { SecurityAlertsBar } from '@/components/dashboard/security-alerts-bar'
import { QuickActionButtons } from '@/components/dashboard/quick-action-buttons'
import { StatusStats } from '@/components/dashboard/status-stats'
import { PersonCardGrid } from '@/components/dashboard/person-card-grid'

export default function DashboardPage() {
  return (
    <>
      {/* Security Alerts Bar - only shows if there are active alerts */}
      <SecurityAlertsBar />

      {/* Quick Action Buttons */}
      <QuickActionButtons />

      {/* Status Stats */}
      <div className="mt-6"><StatusStats /></div>

      {/* Presence Card Grid */}
      <div className="mt-6"><PersonCardGrid /></div>

    </>
  )
}
