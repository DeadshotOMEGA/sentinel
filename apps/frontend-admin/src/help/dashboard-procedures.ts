import type { ProcedureDefinition } from './types'

const ADMIN_MIN_LEVEL = 5

const adminGuard = (accountLevel: number) => accountLevel >= ADMIN_MIN_LEVEL

export const dashboardProcedureDefinitions: ProcedureDefinition[] = [
  {
    id: 'dashboard.admin.orientation.v1',
    version: 1,
    title: 'Dashboard Orientation',
    summary: 'Understand the major dashboard sections and when to use each one.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'alerts',
        target: '[data-help-id="dashboard.security-alerts"]',
        popover: {
          title: 'Security Alerts',
          description:
            'Critical and operational alerts appear here first. Acknowledge quickly so the watch team knows it has been handled.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        id: 'quick-actions',
        target: '[data-help-id="dashboard.quick-actions"]',
        popover: {
          title: 'Quick Actions',
          description:
            'This row contains high-frequency operations like kiosk check-in, visitor sign-in, and lockup actions.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        id: 'status-panel',
        target: '[data-help-id="dashboard.status-stats"]',
        popover: {
          title: 'Operational Status',
          description:
            'Use this panel to verify DDS, Duty Watch readiness, building state, and lockup ownership before making changes.',
          side: 'top',
          align: 'center',
        },
      },
      {
        id: 'presence-grid',
        target: '[data-help-id="dashboard.presence"]',
        popover: {
          title: 'Presence Grid',
          description:
            'Live on-site members and visitors are listed here. Filters and search help you quickly confirm who is present.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.actions.v1',
    version: 1,
    title: 'Quick Action Safety Procedure',
    summary: 'Follow the safe sequence for lockup and check-in actions.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'kiosk-checkin',
        target: '[data-help-id="dashboard.quick-actions.kiosk-checkin"]',
        popover: {
          title: 'Kiosk Check-In',
          description:
            'Use this for attended kiosk intake. Confirm member/visitor identity before submitting a scan.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        id: 'visitor-signin',
        target: '[data-help-id="dashboard.quick-actions.visitor-signin"]',
        popover: {
          title: 'Visitor Sign-In',
          description:
            'Record visitor details accurately and issue the proper category. This affects downstream audits and reports.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        id: 'lockup-action',
        target:
          '[data-help-id="dashboard.quick-actions.open-building"], [data-help-id="dashboard.quick-actions.execute-lockup"]',
        popover: {
          title: 'Building/Lockup Control',
          description:
            'Only perform lockup transitions after verifying holder status in the stats panel. Coordinate handoff explicitly.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        id: 'transfer-lockup',
        target: '[data-help-id="dashboard.quick-actions.transfer-lockup"]',
        popover: {
          title: 'Transfer Lockup',
          description:
            'When available, use transfer to move responsibility cleanly. Verify the recipient before completing the transfer.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.status.v1',
    version: 1,
    title: 'Status Interpretation Procedure',
    summary: 'Interpret operational status blocks before executing actions.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'dds',
        target: '[data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'DDS Status',
          description:
            'Validate whether DDS is assigned and on site. If not, resolve that before escalating lockup responsibilities.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        id: 'duty-watch',
        target: '[data-help-id="dashboard.stat.duty-watch"]',
        popover: {
          title: 'Duty Watch Readiness',
          description:
            'Check assignment coverage and check-in count to catch operational gaps before change-of-watch windows.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        id: 'building',
        target: '[data-help-id="dashboard.stat.building"]',
        popover: {
          title: 'Building Status',
          description:
            'Open, locking up, and secured states indicate what actions are currently valid.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        id: 'lockup-holder',
        target: '[data-help-id="dashboard.stat.lockup-holder"]',
        popover: {
          title: 'Lockup Holder',
          description:
            'Always confirm current holder identity and time held before transfer or execution actions.',
          side: 'bottom',
          align: 'center',
        },
      },
    ],
  },
]
