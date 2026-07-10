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
    title: 'Learn the Dashboard',
    summary:
      'Use when a new operator needs to read the navbar, status blocks, Presence grid, and member card actions.',
    procedureIds: [
      'dashboard.admin.orientation.v3',
      'dashboard.admin.status.v3',
      'dashboard.admin.presence.v2',
    ],
  },
  {
    title: 'DDS Routine',
    summary:
      'Use for DDS opening, closeout, lockup handoff, Duty Watch lockup, and weekly DDS handover.',
    procedureIds: [
      'dashboard.admin.daily-start.v2',
      'dashboard.admin.normal-end-day-lockup.v1',
      'dashboard.admin.dds-lockup-handoff.v1',
      'dashboard.admin.duty-watch-lockup.v1',
      'dashboard.admin.dds-transfer.v1',
    ],
  },
]

export function DashboardHelpLauncher() {
  return (
    <ProcedureHelpLauncher
      routeId="dashboard"
      routePath="/dashboard"
      title="Guided Tutorials"
      intro="Choose the tutorial that matches your task. Each step explains what to check and links to the deeper wiki page when more detail is needed."
      procedureGroups={PROCEDURE_GROUPS}
      procedures={dashboardProcedureDefinitions}
      minAccountLevel={AccountLevel.ADMIN}
      testId={TID.dashboard.help.launcher}
      launcherClassName="sm:bottom-40"
      showLauncherButton={false}
    />
  )
}
