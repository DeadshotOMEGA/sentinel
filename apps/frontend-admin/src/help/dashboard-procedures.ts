import type { ProcedureDefinition } from './types'
import { setDashboardExampleSecurityAlertVisible } from './dashboard-example-alert'
import {
  setDashboardDdsTransferExampleVisible,
  setDashboardDdsTransferModalExampleVisible,
} from './dashboard-dds-transfer-example'

const ADMIN_MIN_LEVEL = 5

const adminGuard = (accountLevel: number) => accountLevel >= ADMIN_MIN_LEVEL
const APP_DRAWER_ID = 'app-drawer'

function waitForNextPaint(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()

  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

async function openRecentActivityDrawer(): Promise<void> {
  if (typeof document === 'undefined') return

  const drawerToggle = document.getElementById(APP_DRAWER_ID)
  if (!drawerToggle || drawerToggle.tagName !== 'INPUT') return

  const input = drawerToggle as Element & { checked?: boolean }
  if (input.checked) return

  const sidebarToggle = document.querySelector<HTMLElement>('[data-help-id="nav.sidebar-toggle"]')
  sidebarToggle?.click()
  await waitForNextPaint()
}

async function openFirstMemberActionPanel(): Promise<void> {
  if (typeof document === 'undefined') return

  const memberActionPanel = document.querySelector<HTMLElement>(
    '[data-help-id="dashboard.presence.member-action-panel"]'
  )
  if (memberActionPanel) return

  const firstMemberCard = document.querySelector<HTMLElement>(
    '[data-help-id="dashboard.presence.person-card"][role="button"]'
  )
  firstMemberCard?.click()
  await waitForNextPaint()
}

async function showExampleSecurityAlert(): Promise<void> {
  setDashboardExampleSecurityAlertVisible(true)
  await waitForNextPaint()
}

function hideExampleSecurityAlert(): void {
  setDashboardExampleSecurityAlertVisible(false)
}

async function showExampleDdsTransferButton(): Promise<void> {
  setDashboardDdsTransferExampleVisible(true)
  await waitForNextPaint()
}

async function showExampleDdsTransferModal(): Promise<void> {
  setDashboardDdsTransferExampleVisible(false)
  setDashboardDdsTransferModalExampleVisible(true)
  await waitForNextPaint()
}

function hideExampleDdsTransferModal(): void {
  setDashboardDdsTransferModalExampleVisible(false)
}

export const dashboardProcedureDefinitions: ProcedureDefinition[] = [
  {
    id: 'dashboard.admin.orientation.v3',
    version: 3,
    title: 'Dashboard Orientation',
    summary: 'Learn the dashboard map, live status areas, scanner, and follow-on tutorials.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'navbar-brand',
        target: '[data-help-id="nav.brand"]',
        popover: {
          title: 'Confirm the system',
          description:
            'Start by confirming the ship or unit name and the server or remote-system badge when one is shown. This tells you which Sentinel appliance you are operating.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/navbar-brand',
        },
      },
      {
        id: 'sidebar-toggle',
        target: '[data-help-id="nav.sidebar-toggle"]',
        popover: {
          title: 'Open recent activity',
          description:
            'Use this control to show or hide Recent Activity. The sidebar keeps the latest in and out activity nearby without taking over the dashboard.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/sidebar-recent-activity',
        },
      },
      {
        id: 'navbar-links',
        target: '[data-help-id="nav.links"]',
        popover: {
          title: 'Move between work areas',
          description:
            'Dashboard is live operations. History reviews past entries. Members, Events, Schedules, Wiki, and Admin support records and setup.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/navbar-navigation',
        },
      },
      {
        id: 'dds-checklist',
        target: '[data-help-id="nav.dashboard-dds-checklist"]',
        popover: {
          title: 'Open the DDS checklist',
          description:
            'The DDS Checklist opens the duty checklist drawer. The progress ring shows how much of today’s checklist is complete.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/dds-checklist',
        },
      },
      {
        id: 'help-button',
        target: '[data-help-id="nav.help"]',
        popover: {
          title: 'Open Guided Tutorials',
          description:
            'On the Dashboard, Help opens Guided Tutorials. During a tutorial, use the Learn more control in the popover for deeper wiki help.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/help-button',
        },
      },
      {
        id: 'system-status',
        target: '[data-help-id="nav.system-status"]',
        popover: {
          title: 'Check system health',
          description:
            'If data looks stale or an action fails, open System Status before retrying. It summarizes services, connected systems, network recovery, and updates.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/system-status',
        },
      },
      {
        id: 'user-menu',
        target: '[data-help-id="nav.user-menu"]',
        popover: {
          title: 'Your signed-in account',
          description:
            'The user menu shows who is signed in and provides account actions like signing out.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/user-menu',
        },
      },
      {
        id: 'recent-activity',
        target: '[data-help-id="dashboard.recent-activity"]',
        popover: {
          title: 'Review recent activity',
          description:
            'Recent Activity shows the latest in and out activity. Some accounts can correct entries from here when history permissions allow it.',
          side: 'right',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/sidebar-recent-activity',
        },
        before: openRecentActivityDrawer,
      },
      {
        id: 'alerts-first',
        target: '[data-help-id="dashboard.security-alerts-region"]',
        popover: {
          title: 'Handle alerts first',
          description:
            'Security alerts appear above the status blocks when action is needed. If this area is empty, continue to status before making operational changes.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/security-alerts',
        },
        before: showExampleSecurityAlert,
        after: hideExampleSecurityAlert,
      },
      {
        id: 'status-panel',
        target: '[data-help-id="dashboard.status-stats"]',
        popover: {
          title: 'Read operational status',
          description:
            'This panel answers the core status questions and exposes quick actions. Use Status Interpretation when you need more detail on what each state means.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/status-panel',
        },
      },
      {
        id: 'presence-overview',
        target: '[data-help-id="dashboard.presence"]',
        popover: {
          title: 'Confirm who is on site',
          description:
            'Presence includes filters, search, manual in/out, person cards, and member actions. Use Member Actions when you need to inspect card actions in detail.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence-grid',
        },
      },
      {
        id: 'scanner-bar',
        target: '[data-help-id="dashboard.scan-panel"], [data-help-id="dashboard.scan-panel.show"]',
        popover: {
          title: 'Scan badges from the bottom bar',
          description:
            'The scanner bar records badge scans and can be hidden or shown when you need more room on the dashboard.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/scanner-bar',
        },
      },
      {
        id: 'next-tutorials',
        target: '[data-help-id="dashboard.root"]',
        popover: {
          title: 'Choose the next tutorial',
          description:
            'For deeper training, run Status Interpretation, Member Actions, or DDS Routine tutorials from Guided Tutorials.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/next-tutorials',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.daily-start.v2',
    version: 2,
    title: 'Daily Start Routine',
    summary: 'Follow the Admin checks to start the day with correct operational state.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'alerts',
        target: '[data-help-id="dashboard.security-alerts-region"]',
        popover: {
          title: 'Review alerts before action',
          description:
            'Start here. Review active alerts if this area shows them. If it is empty, continue to the DDS checks before changing operational state.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/security-alerts',
        },
        before: showExampleSecurityAlert,
        after: hideExampleSecurityAlert,
      },
      {
        id: 'system-health',
        target: '[data-help-id="nav.system-status"]',
        popover: {
          title: 'Start with system health',
          description:
            'Confirm the pill is Healthy. If it is not, inspect service, connected-system, network, and update details before daily operations continue.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/system-status',
        },
      },
      {
        id: 'dds-checklist',
        target: '[data-help-id="nav.dashboard-dds-checklist"]',
        popover: {
          title: 'Open the DDS checklist',
          description:
            'Read DDS Checklist progress before daily operational checks. Open the drawer when checklist tasks need review.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/dds-checklist',
        },
      },
      {
        id: 'dds',
        target: '[data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'Confirm DDS',
          description:
            'Confirm DDS is assigned, accepted or active, on site, and not blocked by a pending handover.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/dds',
        },
      },
      {
        id: 'dds-responsibility',
        target:
          '[data-help-id="dashboard.stat.dds.responsibility-action"], [data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'Accept DDS responsibility',
          description:
            'If you are the scheduled DDS and an Accept DDS or Complete Handover button appears here, use it after confirming you are supposed to take responsibility. If no button appears, continue once DDS status matches reality.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/dds-responsibility',
        },
      },
      {
        id: 'duty-watch',
        target:
          '[data-help-id="dashboard.stat.duty-watch"], [data-help-id="dashboard.status-stats"]',
        popover: {
          title: 'Check Duty Watch coverage',
          description:
            'On Duty Watch nights, confirm coverage and look for uncovered or live-only positions. Duty Watch members are assigned on the Schedules page, available from the top navigation. If the card is absent, it may be a non-duty night or load issue.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/duty-watch',
        },
      },
      {
        id: 'building',
        target: '[data-help-id="dashboard.stat.building"]',
        popover: {
          title: 'Compare building state',
          description:
            'Make sure Sentinel matches the real building condition. Do not use quick actions to cover up a mismatch.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/building-state',
        },
      },
      {
        id: 'lockup-holder',
        target:
          '[data-help-id="dashboard.stat.lockup-holder"], [data-help-id="dashboard.stat.building"]',
        popover: {
          title: 'Confirm lockup holder',
          description:
            'When the building is open, confirm the lockup holder is correct. When secured, the holder disappears because responsibility is complete.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/lockup-holder',
        },
      },
      {
        id: 'scanner-bar',
        target: '[data-help-id="dashboard.scan-panel"], [data-help-id="dashboard.scan-panel.show"]',
        popover: {
          title: 'Confirm scanner readiness',
          description:
            'Only do this when the NFC scanner is plugged into the Server laptop. If badge scanning is handled by the Kiosk, continue. Otherwise, make sure the scanner bar is visible and ready.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/scanner-bar',
        },
      },
      {
        id: 'escalation',
        target: '[data-help-id="dashboard.root"]',
        popover: {
          title: 'Escalate unresolved gaps',
          description:
            'If status, alerts, or real-world conditions disagree, stop and escalate to watch leadership before taking control actions.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/escalation',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.normal-end-day-lockup.v1',
    version: 1,
    title: 'Normal End-of-Day Lockup',
    summary: 'Close a normal work day when no Training Night or Admin Night follows.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'review-person-cards',
        target: '[data-help-id="dashboard.presence.cards"], [data-help-id="dashboard.presence"]',
        popover: {
          title: 'Review who may still be inside',
          description:
            'At normal end of day, review the Dashboard person cards for anyone still shown on site. Confirm whether they are actually in the building or forgot to sign out.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/normal/person-card-review',
        },
      },
      {
        id: 'manual-sign-out-choice',
        target:
          '[data-help-id="dashboard.presence.manual-in-out"], [data-help-id="dashboard.presence"]',
        popover: {
          title: 'Choose how to clear people',
          description:
            'If someone has left, you can manually sign them out now. You can also leave remaining sign-outs for Execute Lockup when the DDS is ready to close the building.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/normal/manual-sign-out-choice',
        },
      },
      {
        id: 'dds-checklist',
        target: '[data-help-id="nav.dashboard-dds-checklist"]',
        popover: {
          title: 'Finish the DDS checklist',
          description:
            'Review the DDS Checklist and confirm all required end-of-day tasks are complete before lockup.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/normal/dds-checklist',
        },
      },
      {
        id: 'execute-lockup',
        target:
          '[data-help-id="dashboard.quick-actions.execute-lockup"], [data-help-id="dashboard.stat.actions"]',
        popover: {
          title: 'Execute Lockup last',
          description:
            'Use Execute Lockup as the DDS’s last dashboard action before going to the front, arming the building, and leaving. This does not control the building system.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/normal/execute-lockup',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.dds-lockup-handoff.v1',
    version: 1,
    title: 'DDS Evening Lockup Handoff',
    summary:
      'Transfer lockup at normal end-of-day to a member staying for Admin or Training Night.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'confirm-dds',
        target: '[data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'Confirm DDS responsibility',
          description:
            'Before leaving for the day, confirm the DDS state is correct and that lockup still needs to be handed over for the evening.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/dds-handoff/dds-status',
        },
      },
      {
        id: 'confirm-evening-holder-present',
        target: '[data-help-id="dashboard.presence.search"], [data-help-id="dashboard.presence"]',
        popover: {
          title: 'Confirm the evening holder is present',
          description:
            'The person receiving lockup must be signed into the unit and staying for Admin Night or Training Night. This is usually around 4 PM, before Duty Watch arrives.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/dds-handoff/evening-holder-present',
        },
      },
      {
        id: 'transfer-lockup',
        target:
          '[data-help-id="dashboard.quick-actions.transfer-lockup"], [data-help-id="dashboard.stat.actions"]',
        popover: {
          title: 'Transfer lockup',
          description:
            'Use Transfer Lockup when DDS is leaving and a present member is staying at the unit to hold lockup until the SWK arrives.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/dds-handoff/transfer-lockup',
        },
      },
      {
        id: 'confirm-lockup-holder',
        target:
          '[data-help-id="dashboard.stat.lockup-holder"], [data-help-id="dashboard.stat.building"]',
        popover: {
          title: 'Confirm new lockup holder',
          description:
            'After transfer, confirm the lockup holder changed to the member staying for the evening. If it did not, stop and correct the handoff before leaving.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/dds-handoff/confirm-holder',
        },
      },
      {
        id: 'swk-transfer-reminder',
        target: '[data-help-id="dashboard.root"]',
        popover: {
          title: 'Transfer again when SWK arrives',
          description:
            'When the SWK arrives for Duty Watch around 6:30 PM, the evening lockup holder must transfer lockup to the SWK.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/dds-handoff/swk-transfer-reminder',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.duty-watch-lockup.v1',
    version: 1,
    title: 'Duty Watch Lockup',
    summary: 'Close the building at the end of Duty Watch as the SWK.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'confirm-duty-watch',
        target:
          '[data-help-id="dashboard.stat.duty-watch"], [data-help-id="dashboard.status-stats"]',
        popover: {
          title: 'Confirm Duty Watch requirements',
          description:
            'At the end of Duty Watch, confirm the watch requirements are complete before the SWK starts lockup.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/duty-watch/requirements',
        },
      },
      {
        id: 'review-person-cards',
        target: '[data-help-id="dashboard.presence.cards"], [data-help-id="dashboard.presence"]',
        popover: {
          title: 'Review who may still be inside',
          description:
            'Review the Dashboard person cards for anyone still shown on site. Confirm whether they are actually in the building or forgot to sign out.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/duty-watch/person-card-review',
        },
      },
      {
        id: 'manual-sign-out-choice',
        target:
          '[data-help-id="dashboard.presence.manual-in-out"], [data-help-id="dashboard.presence"]',
        popover: {
          title: 'Choose how to clear people',
          description:
            'If someone has left, manually sign them out now or let Execute Lockup clear remaining sign-outs when the SWK closes the building.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/duty-watch/manual-sign-out-choice',
        },
      },
      {
        id: 'confirm-lockup-holder',
        target:
          '[data-help-id="dashboard.stat.lockup-holder"], [data-help-id="dashboard.stat.building"]',
        popover: {
          title: 'Confirm SWK holds lockup',
          description:
            'Confirm the SWK is the current lockup holder before executing lockup. If the holder is wrong, transfer lockup before continuing.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/duty-watch/lockup-holder',
        },
      },
      {
        id: 'execute-lockup',
        target:
          '[data-help-id="dashboard.quick-actions.execute-lockup"], [data-help-id="dashboard.stat.actions"]',
        popover: {
          title: 'Execute Lockup last',
          description:
            'Use Execute Lockup as the SWK’s last dashboard action before securing the building. This does not control the building system.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/duty-watch/execute-lockup',
        },
      },
      {
        id: 'secured-recheck',
        target: '[data-help-id="dashboard.stat.building"]',
        popover: {
          title: 'Recheck secured state',
          description:
            'After lockup, confirm Building Status changed to the expected secured state. If it did not, stop and escalate.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/duty-watch/building-recheck',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.status.v3',
    version: 3,
    title: 'Status Interpretation',
    summary: 'Understand each operational status block before taking action.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'status-overview',
        target: '[data-help-id="dashboard.status-stats"]',
        popover: {
          title: 'Read status before actions',
          description:
            'The status panel is arranged status first and actions second. Confirm what Sentinel says before using any button that changes operational state.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/status/status-overview',
        },
      },
      {
        id: 'dds',
        target: '[data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'DDS status',
          description:
            'DDS can be unassigned, scheduled and awaiting acceptance, active on site, active off site, or pending handover. Read the state before escalating or changing DDS responsibility.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/status/dds',
        },
      },
      {
        id: 'duty-watch',
        target:
          '[data-help-id="dashboard.stat.duty-watch"], [data-help-id="dashboard.status-stats"]',
        popover: {
          title: 'Duty Watch readiness',
          description:
            'On Duty Watch nights, compare covered, uncovered, and live-only counts. If this card is absent, it may be a non-duty night or the schedule failed to load.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/status/duty-watch',
        },
      },
      {
        id: 'building',
        target: '[data-help-id="dashboard.stat.building"]',
        popover: {
          title: 'Building state',
          description:
            'Building state can be Open, Secured, or Locking Up. If Sentinel and the real building disagree, escalate the mismatch before changing state.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/status/building-state',
        },
      },
      {
        id: 'lockup-holder',
        target:
          '[data-help-id="dashboard.stat.lockup-holder"], [data-help-id="dashboard.stat.building"]',
        popover: {
          title: 'Lockup holder',
          description:
            'The lockup holder is the current person responsible for lockup. It may show no holder while open, and it disappears once the building is secured because the responsibility is complete.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/status/lockup-holder',
        },
      },
      {
        id: 'status-actions',
        target: '[data-help-id="dashboard.stat.actions"]',
        popover: {
          title: 'Actions reflect status',
          description:
            'Visible and enabled actions come from current status and your permissions. If an action is missing or disabled, confirm the status blocks before assuming a bug.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/status/quick-action-state',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.presence.v2',
    version: 2,
    title: 'Member Actions',
    summary: 'Review the actions available from a member card.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'open-member-actions',
        target: '[data-help-id="dashboard.presence.person-card"]',
        popover: {
          title: 'Open Member Actions',
          description:
            'Click a checked-in member card to open Member Actions. These actions change or review that specific member only.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/member-actions/open-member-actions',
        },
        after: openFirstMemberActionPanel,
      },
      {
        id: 'manual-checkout',
        target:
          '[data-help-id="dashboard.presence.member-action.manual-checkout"], [data-help-id="dashboard.presence.member-action-panel"]',
        popover: {
          title: 'Manual Check Out',
          description:
            'Use Manual Check Out to record a corrective checkout when a member forgot to scan out. Add the reason before saving.',
          side: 'left',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/member-actions/manual-checkout',
        },
        before: openFirstMemberActionPanel,
      },
      {
        id: 'temporary-role',
        target:
          '[data-help-id="dashboard.presence.member-action.temporary-role"], [data-help-id="dashboard.presence.member-action-panel"]',
        popover: {
          title: 'Temporary Role',
          description:
            'Use Temporary Role to assign or clear live Duty Watch coverage for this check-in without changing the weekly schedule.',
          side: 'left',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/member-actions/temporary-role',
        },
        before: openFirstMemberActionPanel,
      },
      {
        id: 'tonight-override',
        target:
          '[data-help-id="dashboard.presence.member-action.tonight-override"], [data-help-id="dashboard.presence.member-action-panel"]',
        popover: {
          title: 'Tonight Schedule Override',
          description:
            'Use Tonight Schedule Override for a same-night Duty Watch replacement. It updates tonight’s operational roster, not the whole schedule.',
          side: 'left',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/member-actions/tonight-override',
        },
        before: openFirstMemberActionPanel,
      },
      {
        id: 'transfer-lockup',
        target:
          '[data-help-id="dashboard.presence.member-action.transfer-lockup"], [data-help-id="dashboard.presence.member-action-panel"]',
        popover: {
          title: 'Transfer Lockup',
          description:
            'Transfer Lockup appears when the selected member holds lockup. Use it to move responsibility to another qualified checked-in member.',
          side: 'left',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/member-actions/transfer-lockup',
        },
        before: openFirstMemberActionPanel,
      },
      {
        id: 'recent-history',
        target:
          '[data-help-id="dashboard.presence.member-action.history"], [data-help-id="dashboard.presence.member-action-panel"]',
        popover: {
          title: 'Recent Check-In History',
          description:
            'Use Recent Check-In History to review the latest check-in and checkout events for the selected member before taking corrective action.',
          side: 'left',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/member-actions/recent-history',
        },
        before: openFirstMemberActionPanel,
      },
    ],
  },
  {
    id: 'dashboard.admin.dds-transfer.v1',
    version: 1,
    title: 'DDS Weekly Handover',
    summary: 'Hand over Duty Day Staff responsibility to the next DDS for the week.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'confirm-current-dds',
        target: '[data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'Confirm current DDS',
          description:
            'Start by confirming who Sentinel currently shows as DDS and whether the state is active, awaiting acceptance, or pending handover.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/dds-transfer/current-dds',
        },
        after: showExampleDdsTransferButton,
      },
      {
        id: 'open-transfer-dds',
        target:
          '[data-help-id="dashboard.stat.dds.handover-example"], [data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'Find Complete Handover',
          description:
            'Use Complete Handover when DDS responsibility for the week is being passed to the oncoming DDS.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/dds-transfer/open-transfer',
        },
        after: showExampleDdsTransferModal,
      },
      {
        id: 'handover-confirmation',
        target: '[data-help-id="dashboard.stat.dds.handover-modal-example"]',
        popover: {
          title: 'Review the handover',
          description:
            'The confirmation panel shows the outgoing DDS, the oncoming DDS, and the final Complete handover action before responsibility changes.',
          side: 'right',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/dds-transfer/confirmation-panel',
        },
        after: hideExampleDdsTransferModal,
      },
      {
        id: 'handover-pending',
        target: '[data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'Watch for pending handover',
          description:
            'After transfer starts, Sentinel keeps the outgoing DDS live until the oncoming DDS accepts or completes the handover.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/dds-transfer/pending-handover',
        },
      },
      {
        id: 'accept-or-complete-handover',
        target:
          '[data-help-id="dashboard.stat.dds.responsibility-action"], [data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'Incoming DDS accepts responsibility',
          description:
            'The oncoming DDS uses Accept DDS or Complete Handover when they are ready to take responsibility. Do not leave the handover pending.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/dds-transfer/accept-responsibility',
        },
      },
      {
        id: 'confirm-new-dds',
        target: '[data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'Confirm the new DDS',
          description:
            'Finish by confirming the DDS status block shows the correct person and that responsibility matches the real handoff.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/dds-transfer/confirm-new-dds',
        },
      },
    ],
  },
]
