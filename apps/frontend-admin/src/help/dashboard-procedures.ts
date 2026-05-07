import type { ProcedureDefinition } from './types'

const ADMIN_MIN_LEVEL = 5

const adminGuard = (accountLevel: number) => accountLevel >= ADMIN_MIN_LEVEL

export const dashboardProcedureDefinitions: ProcedureDefinition[] = [
  {
    id: 'dashboard.admin.orientation.v2',
    version: 2,
    title: 'Dashboard orientation',
    summary: 'Learn the navbar, system health, status blocks, and Presence area.',
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
            'Start by confirming the ship/unit name and server badge. This tells you which Sentinel appliance you are operating.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/navbar-brand',
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
        id: 'help-button',
        target: '[data-help-id="nav.help"]',
        popover: {
          title: 'Open contextual help',
          description:
            'Use Help when you are unsure what to check next. During a guided step, this opens help for the active item.',
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
            'If data looks stale or an action fails, open System Status before retrying. It summarizes app, database, wiki, and network health.',
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
            'The user menu shows who is signed in and provides account actions like changing PIN or signing out.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/user-menu',
        },
      },
      {
        id: 'alerts-first',
        target: '[data-help-id="dashboard.security-alerts"]',
        popover: {
          title: 'Handle alerts first',
          description:
            'Security alerts sit above the dashboard status blocks. Review them before opening, transferring, or securing the building.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/security-alerts',
        },
      },
      {
        id: 'status-panel',
        target: '[data-help-id="dashboard.status-stats"]',
        popover: {
          title: 'Read operational status',
          description:
            'This panel answers the core questions: who is DDS, is Duty Watch covered, is the building open, and who holds lockup.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/status-panel',
        },
      },
      {
        id: 'presence-grid',
        target: '[data-help-id="dashboard.presence"]',
        popover: {
          title: 'Confirm who is on site',
          description:
            'Presence shows checked-in members and visitors. After every important action, confirm the result here.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence-grid',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.daily-start.v1',
    version: 1,
    title: 'Daily start routine',
    summary: 'Follow the Admin checks to start the day with correct operational state.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'start-system-status',
        target: '[data-help-id="nav.system-status"]',
        popover: {
          title: 'Start with system health',
          description:
            'Confirm the pill is Healthy. If it is not, open the details and check database, backend, wiki, network, connected systems, and updates.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/system-status',
        },
      },
      {
        id: 'start-alerts',
        target: '[data-help-id="dashboard.security-alerts"]',
        popover: {
          title: 'Review alerts before action',
          description:
            'Resolve or escalate active alerts before changing building state. Acknowledgement means action was taken, not simply seen.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/security-alerts',
        },
      },
      {
        id: 'start-dds',
        target: '[data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'Confirm DDS',
          description:
            'Verify Duty Day Staff is assigned and on site. Resolve missing DDS coverage before routine operations continue.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/dds',
        },
      },
      {
        id: 'start-duty-watch',
        target: '[data-help-id="dashboard.stat.duty-watch"]',
        popover: {
          title: 'Check Duty Watch coverage',
          description:
            'Look for uncovered or live-only positions. Gaps should be fixed or escalated before the watch window.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/duty-watch',
        },
      },
      {
        id: 'start-building-state',
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
        id: 'start-presence-review',
        target: '[data-help-id="dashboard.presence"]',
        popover: {
          title: 'Review who is present',
          description:
            'Look for expected staff, unexpected visitors, and missing duty members. Use filters and search before assuming someone is absent.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-start/presence-review',
        },
      },
      {
        id: 'start-escalation',
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
    id: 'dashboard.admin.daily-end.v1',
    version: 1,
    title: 'End-of-day and lockup routine',
    summary: 'Close the day by clearing alerts, checking Presence, and confirming lockup state.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'end-alerts',
        target: '[data-help-id="dashboard.security-alerts"]',
        popover: {
          title: 'Clear alert work',
          description:
            'Review active alerts. Acknowledge only after the issue has been checked, corrected, or escalated with context.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/security-alerts',
        },
      },
      {
        id: 'end-presence',
        target: '[data-help-id="dashboard.presence"]',
        popover: {
          title: 'Check remaining people',
          description:
            'Search for visitors and unexpected checked-in members. Confirm anyone left on site is supposed to remain.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/presence-review',
        },
      },
      {
        id: 'end-duty-handoff',
        target: '[data-help-id="dashboard.stat.duty-watch"]',
        popover: {
          title: 'Confirm watch handoff',
          description:
            'Check Duty Watch and DDS expectations for the evening before starting lockup or leaving the dashboard.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/duty-handoff',
        },
      },
      {
        id: 'end-lockup-holder',
        target: '[data-help-id="dashboard.stat.lockup-holder"]',
        popover: {
          title: 'Verify lockup holder',
          description:
            'Confirm the holder identity and time held. Transfer lockup if the current holder is not the correct person.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/lockup-holder',
        },
      },
      {
        id: 'end-execute-lockup',
        target:
          '[data-help-id="dashboard.quick-actions.execute-lockup"], [data-help-id="dashboard.quick-actions.open-building"]',
        popover: {
          title: 'Use lockup only when ready',
          description:
            'Execute lockup only when the building should be secured and Sentinel matches the real holder and building state.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/execute-lockup',
        },
      },
      {
        id: 'end-building-recheck',
        target: '[data-help-id="dashboard.stat.building"]',
        popover: {
          title: 'Recheck secured state',
          description:
            'After lockup, confirm Building Status changed as expected. If it did not, stop and escalate.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/building-recheck',
        },
      },
      {
        id: 'end-note-escalate',
        target: '[data-help-id="dashboard.root"]',
        popover: {
          title: 'Leave a clear trail',
          description:
            'If people counts, alerts, or status blocks do not match reality, record what you saw and escalate before signing out.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/daily-end/escalation-notes',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.status.v2',
    version: 2,
    title: 'Status interpretation',
    summary: 'Understand each operational status block before taking action.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'dds',
        target: '[data-help-id="dashboard.stat.dds"]',
        popover: {
          title: 'DDS status',
          description:
            'DDS identifies the Duty Day Staff member responsible for the day. If DDS is absent or pending handover, resolve that first.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/status/dds',
        },
      },
      {
        id: 'duty-watch',
        target: '[data-help-id="dashboard.stat.duty-watch"]',
        popover: {
          title: 'Duty Watch readiness',
          description:
            'Use assigned, checked-in, uncovered, and live-only counts to find coverage problems before they become watch problems.',
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
            'Open and Secured decide which actions are valid. If Sentinel and the real building disagree, escalate before changing state.',
          side: 'bottom',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/status/building-state',
        },
      },
      {
        id: 'lockup-holder',
        target: '[data-help-id="dashboard.stat.lockup-holder"]',
        popover: {
          title: 'Lockup holder',
          description:
            'This is the person responsible for securing the building. Confirm identity and time held before transfer or lockup.',
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
            'Quick actions change real operational responsibility. Disabled actions usually mean a required state or permission is missing.',
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
    id: 'dashboard.admin.presence.v1',
    version: 1,
    title: 'Presence review',
    summary: 'Use filters, search, person cards, and action panels to confirm who is on site.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'presence-filters',
        target: '[data-help-id="dashboard.presence.filter-buttons"]',
        popover: {
          title: 'Filter by person type',
          description:
            'All, Members, and Visitors show live counts. Use them to narrow the list before investigating a person.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/filters',
        },
      },
      {
        id: 'presence-search',
        target: '[data-help-id="dashboard.presence.search"]',
        popover: {
          title: 'Search before assuming absence',
          description:
            'Search by name, rank, division, or organization when a person is expected but not immediately visible.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/search',
        },
      },
      {
        id: 'presence-manual-in-out',
        target: '[data-help-id="dashboard.presence.manual-in-out"]',
        popover: {
          title: 'Manual in/out corrections',
          description:
            'Use Manual in/out only when authorized to correct a missed scan or recorded attendance issue.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/manual-in-out',
        },
      },
      {
        id: 'presence-cards',
        target:
          '[data-help-id="dashboard.presence.person-card"], [data-help-id="dashboard.presence.cards"]',
        popover: {
          title: 'Read person cards',
          description:
            'Cards show identity, role badges, duty position, visitor details, and last activity. They are your live attendance record.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/person-cards',
        },
      },
      {
        id: 'presence-member-actions',
        target:
          '[data-help-id="dashboard.presence.member-action-panel"], [data-help-id="dashboard.presence.person-card"]',
        popover: {
          title: 'Open member actions',
          description:
            'Select a member card to review actions such as manual checkout, temporary role, lockup transfer, or recent history.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/member-actions',
        },
      },
      {
        id: 'presence-visitor-checkout',
        target: '[data-help-id="dashboard.presence.visitor-checkout"]',
        popover: {
          title: 'Sign out visitors',
          description:
            'Visitor sign-out should match the real person leaving. If the button is not visible, use filters or History to verify state.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/visitor-checkout',
        },
      },
      {
        id: 'presence-empty-states',
        target: '[data-help-id="dashboard.presence"]',
        popover: {
          title: 'Understand empty results',
          description:
            'No matches can mean filters are hiding people. No one checked in means Sentinel has no active presence records.',
          side: 'top',
          align: 'center',
        },
        help: {
          wikiSlug: 'operations/dashboard/presence/empty-states',
        },
      },
    ],
  },
  {
    id: 'dashboard.admin.actions.v2',
    version: 2,
    title: 'Dashboard action safety',
    summary: 'Use building, lockup, DDS, and manual attendance actions safely.',
    route: '/dashboard',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'action-block',
        target: '[data-help-id="dashboard.stat.actions"]',
        popover: {
          title: 'Actions are operational changes',
          description:
            'Every button here changes responsibility or attendance. Check status blocks and real-world conditions before pressing one.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/actions/action-block',
        },
      },
      {
        id: 'open-or-lockup',
        target:
          '[data-help-id="dashboard.quick-actions.open-building"], [data-help-id="dashboard.quick-actions.execute-lockup"]',
        popover: {
          title: 'Open or secure the building',
          description:
            'Open Building starts building responsibility. Execute Lockup secures it. Use the action that matches the real building state.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/actions/open-or-lockup',
        },
      },
      {
        id: 'transfer-dds',
        target: '[data-help-id="dashboard.quick-actions.transfer-dds"]',
        popover: {
          title: 'Transfer DDS carefully',
          description:
            'Transfer or complete DDS handover only after confirming the incoming Duty Day Staff member and current duty expectations.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/actions/transfer-dds',
        },
      },
      {
        id: 'transfer-lockup',
        target: '[data-help-id="dashboard.quick-actions.transfer-lockup"]',
        popover: {
          title: 'Transfer lockup',
          description:
            'Move lockup responsibility only to the verified, qualified person who is actually accepting the handoff.',
          side: 'bottom',
          align: 'start',
        },
        help: {
          wikiSlug: 'operations/dashboard/actions/transfer-lockup',
        },
      },
      {
        id: 'manual-in-out',
        target: '[data-help-id="dashboard.presence.manual-in-out"]',
        popover: {
          title: 'Correct attendance deliberately',
          description:
            'Manual in/out is for authorized corrections, not convenience. Record enough context for the correction to be understood later.',
          side: 'bottom',
          align: 'end',
        },
        help: {
          wikiSlug: 'operations/dashboard/actions/manual-in-out',
        },
      },
    ],
  },
]
