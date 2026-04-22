import { SecurityAlertsBar } from '@/components/dashboard/security-alerts-bar'
import { StatusStats } from '@/components/dashboard/status-stats'
import { PersonCardGrid } from '@/components/dashboard/person-card-grid'
import { DashboardDdsChecklistDrawer } from '@/components/dashboard/dashboard-dds-checklist-drawer'
import { DashboardHelpLauncher } from '@/components/help/dashboard-help-launcher'
import { AppBadge } from '@/components/ui/AppBadge'

export default function DashboardPage() {
  return (
    <DashboardDdsChecklistDrawer>
      <main
        className="mx-auto w-full max-w-[1600px] space-y-6 pb-24 sm:pb-20"
        data-help-id="dashboard.root"
      >
        <h1 className="sr-only">Dashboard</h1>

        <SecurityAlertsBar />

        <section
          aria-label="Dashboard update verification marker"
          className="alert border border-info/25 bg-info-fadded text-info-fadded-content shadow-[var(--shadow-1)]"
        >
          <AppBadge status="info" size="sm">
            Update test
          </AppBadge>
          <span className="text-sm font-medium">
            Dashboard verification marker: April 22 update build
          </span>
        </section>

        <section>
          <StatusStats />
        </section>
        <section>
          <PersonCardGrid />
        </section>

        <DashboardHelpLauncher />
      </main>
    </DashboardDdsChecklistDrawer>
  )
}
