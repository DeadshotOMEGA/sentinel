import Link from 'next/link'
import { SecurityAlertsBar } from '@/components/dashboard/security-alerts-bar'
import { StatusStats } from '@/components/dashboard/status-stats'
import { PersonCardGrid } from '@/components/dashboard/person-card-grid'
import { DashboardDdsChecklistDrawer } from '@/components/dashboard/dashboard-dds-checklist-drawer'
import { DashboardHelpLauncher } from '@/components/help/dashboard-help-launcher'
import { AppAlert } from '@/components/ui/AppAlert'
import { AppBadge } from '@/components/ui/AppBadge'
import { TID } from '@/lib/test-ids'

export default function DashboardPage() {
  return (
    <DashboardDdsChecklistDrawer>
      <main
        className="mx-auto w-full max-w-[1600px] space-y-6 pb-24 sm:pb-20"
        data-help-id="dashboard.root"
      >
        <h1 className="sr-only">Dashboard</h1>

        <SecurityAlertsBar />

        <section aria-label="Dashboard update verification tools">
          <AppAlert
            tone="info"
            heading="Update verification shortcuts"
            description="Jump straight into the new update flow or open the host-side trace log from the dashboard."
            meta={
              <AppBadge status="info" size="sm">
                Update test
              </AppBadge>
            }
            actions={
              <div className="flex flex-wrap justify-end gap-(--space-2)">
                <Link
                  href="/settings?tab=updates"
                  className="btn btn-sm btn-outline"
                  data-testid={TID.dashboard.updateBanner.updatesLink}
                >
                  Open updates
                </Link>
                <Link
                  href="/settings?tab=updates&trace=open"
                  className="btn btn-sm btn-primary"
                  data-testid={TID.dashboard.updateBanner.traceLink}
                >
                  Open update log
                </Link>
              </div>
            }
            className="shadow-[var(--shadow-1)]"
            data-testid={TID.dashboard.updateBanner.panel}
          >
            <p className="text-sm text-base-content/80">
              Use these shortcuts to validate both the update request flow and the update log viewer
              without leaving the dashboard first.
            </p>
          </AppAlert>
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
