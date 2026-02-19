import { SecurityAlertsBar } from '@/components/dashboard/security-alerts-bar'
import { QuickActionButtons } from '@/components/dashboard/quick-action-buttons'
import { StatusStats } from '@/components/dashboard/status-stats'
import { PersonCardGrid } from '@/components/dashboard/person-card-grid'
import { DashboardHelpLauncher } from '@/components/help/dashboard-help-launcher'

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-6 pb-24 sm:pb-20" data-help-id="dashboard.root">
      <h1 className="sr-only">Dashboard</h1>

      {/* Security Alerts Bar - only shows if there are active alerts */}
      <SecurityAlertsBar />

      <section>
        <QuickActionButtons />
      </section>

      {/* Status Stats */}
      <section>
        <StatusStats />
      </section>

      {/* Presence Card Grid */}
      <section>
        <PersonCardGrid />
      </section>

      <DashboardHelpLauncher />
    </main>
  )
}
