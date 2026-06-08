'use client'

import {
  ProcedureHelpLauncher,
  type ProcedureGroup,
} from '@/components/help/procedure-help-launcher'
import { dashboardProcedureDefinitions } from '@/help/dashboard-procedures'
import { AccountLevel } from '@/store/auth-store'
import { TID } from '@/lib/test-ids'

const PROCEDURE_GROUPS: ProcedureGroup[] = [
  {
    title: 'Learn the dashboard',
    summary: 'Orientation and core status reading.',
    procedureIds: ['dashboard.admin.orientation.v2', 'dashboard.admin.status.v2'],
  },
  {
    title: 'Daily routine',
    summary: 'Start and end-of-day checks for Admin users.',
    procedureIds: ['dashboard.admin.daily-start.v1', 'dashboard.admin.daily-end.v1'],
  },
  {
    title: 'Control actions',
    summary: 'Presence review and safe operational changes.',
    procedureIds: ['dashboard.admin.presence.v1', 'dashboard.admin.actions.v2'],
  },
]

export function DashboardHelpLauncher() {
  return (
    <ProcedureHelpLauncher
      routeId="dashboard"
      routePath="/dashboard"
      title="Dashboard procedures"
      intro="Choose the procedure that matches your task. Each step explains what to check and links to the deeper wiki page when more detail is needed."
      procedureGroups={PROCEDURE_GROUPS}
      procedures={dashboardProcedureDefinitions}
      minAccountLevel={AccountLevel.ADMIN}
      testId={TID.dashboard.help.launcher}
      launcherClassName="sm:bottom-40"
    />
  )
}
