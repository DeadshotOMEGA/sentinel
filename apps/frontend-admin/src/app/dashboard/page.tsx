import { StatusStats } from '@/components/dashboard/status-stats'
import { PersonCardGrid } from '@/components/dashboard/person-card-grid'
import { DashboardDdsChecklistDrawer } from '@/components/dashboard/dashboard-dds-checklist-drawer'
import { DashboardHelpLauncher } from '@/components/help/dashboard-help-launcher'
import { SecurityAlertsBar } from '@/components/dashboard/security-alerts-bar'
import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'

export default function DashboardPage() {
  return (
    <DashboardDdsChecklistDrawer>
      <DashboardPageShell>
        <h1 className="sr-only">Dashboard</h1>

        <section data-help-id="dashboard.security-alerts-region">
          <SecurityAlertsBar />
        </section>

        <section>
          <StatusStats />
        </section>
        <section>
          <PersonCardGrid />
        </section>

        <DashboardHelpLauncher />
      </DashboardPageShell>
    </DashboardDdsChecklistDrawer>
  )
}
