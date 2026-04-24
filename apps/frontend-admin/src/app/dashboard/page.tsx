import { StatusStats } from '@/components/dashboard/status-stats'
import { PersonCardGrid } from '@/components/dashboard/person-card-grid'
import { DashboardDdsChecklistDrawer } from '@/components/dashboard/dashboard-dds-checklist-drawer'
import { DashboardHelpLauncher } from '@/components/help/dashboard-help-launcher'

export default function DashboardPage() {
  return (
    <DashboardDdsChecklistDrawer>
      <main
        className="mx-auto w-full max-w-[1600px] space-y-6 pb-24 sm:pb-20"
        data-help-id="dashboard.root"
      >
        <h1 className="sr-only">Dashboard</h1>

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
