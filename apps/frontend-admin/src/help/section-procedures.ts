import type { ProcedureDefinition } from './types'

const ADMIN_MIN_LEVEL = 5
const MANAGER_MIN_LEVEL = 4
const OFFICER_MIN_LEVEL = 3

const adminGuard = (accountLevel: number) => accountLevel >= ADMIN_MIN_LEVEL
const managerGuard = (accountLevel: number) => accountLevel >= MANAGER_MIN_LEVEL
const officerGuard = (accountLevel: number) => accountLevel >= OFFICER_MIN_LEVEL

export const historyProcedureDefinitions: ProcedureDefinition[] = [
  {
    id: 'history.admin.orientation.v1',
    version: 1,
    title: 'History orientation',
    summary: 'Learn the history filters, records table, corrections, and paging controls.',
    route: '/checkins',
    personas: ['admin'],
    guards: [(context) => managerGuard(context.accountLevel)],
    steps: [
      {
        id: 'history-header',
        target: '[data-help-id="history.header"]',
        popover: {
          title: 'Check-In/Out History',
          description:
            'History is the audit view for member and visitor check-in records. Use it when you need evidence, not live Presence.',
          side: 'bottom',
          align: 'start',
        },
        help: { wikiSlug: 'operations/history/overview' },
      },
      {
        id: 'history-filters',
        target: '[data-help-id="history.filters"]',
        popover: {
          title: 'Narrow the record set',
          description:
            'Filter by date, direction, and division before editing. Smaller searches reduce the chance of correcting the wrong record.',
          side: 'bottom',
          align: 'center',
        },
        help: { wikiSlug: 'operations/history/filters' },
      },
      {
        id: 'history-table',
        target: '[data-help-id="history.records-table"]',
        popover: {
          title: 'Read the audit row',
          description:
            'Each row shows who moved, when it happened, the direction, method, kiosk, and review status.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/history/records-table' },
      },
      {
        id: 'history-manual',
        target: '[data-help-id="history.manual-checkin"]',
        popover: {
          title: 'Manual corrections',
          description:
            'Manual entries are for verified exceptions such as missed badge scans. Confirm evidence before creating one.',
          side: 'bottom',
          align: 'end',
        },
        help: { wikiSlug: 'operations/history/manual-corrections' },
      },
      {
        id: 'history-edit',
        target: '[data-help-id="history.edit-action"]',
        popover: {
          title: 'Edit only the exact row',
          description:
            'Use row edit actions only after matching the exact person, timestamp, and direction to real evidence.',
          side: 'left',
          align: 'center',
        },
        help: { wikiSlug: 'operations/history/edit-member-record' },
      },
      {
        id: 'history-pagination',
        target: '[data-help-id="history.pagination"]',
        popover: {
          title: 'Move through pages carefully',
          description:
            'Pagination changes the row set. Recheck filters and page number before deciding a record is missing.',
          side: 'top',
          align: 'end',
        },
        help: { wikiSlug: 'operations/history/records-table' },
      },
    ],
  },
  {
    id: 'history.admin.corrections.v1',
    version: 1,
    title: 'History corrections',
    summary: 'Correct member or visitor history only after matching Sentinel to real evidence.',
    route: '/checkins',
    personas: ['admin'],
    guards: [(context) => managerGuard(context.accountLevel)],
    steps: [
      {
        id: 'correction-filters',
        target: '[data-help-id="history.filters"]',
        popover: {
          title: 'Start with filters',
          description: 'Choose the smallest date and direction range that can contain the mistake.',
          side: 'bottom',
          align: 'center',
        },
        help: { wikiSlug: 'operations/history/filters' },
      },
      {
        id: 'correction-record',
        target: '[data-help-id="history.records-table"]',
        popover: {
          title: 'Match the exact record',
          description:
            'Compare Sentinel says to the real person/building state before opening any edit control.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/history/records-table' },
      },
      {
        id: 'correction-edit-member',
        target: '[data-help-id="history.edit-action"]',
        popover: {
          title: 'Member record edit',
          description:
            'Member edits should be narrow and evidence-backed. Recheck Dashboard Presence after saving.',
          side: 'left',
          align: 'center',
        },
        help: { wikiSlug: 'operations/history/edit-member-record' },
      },
      {
        id: 'correction-edit-visitor',
        target:
          '[data-help-id="history.visitor-edit-action"], [data-help-id="history.edit-action"]',
        popover: {
          title: 'Visitor record edit',
          description:
            'Visitor edits affect visitor identity and checkout evidence. Confirm the visitor or host before changing it.',
          side: 'left',
          align: 'center',
        },
        help: { wikiSlug: 'operations/history/edit-visitor-record' },
      },
    ],
  },
]

export const membersProcedureDefinitions: ProcedureDefinition[] = [
  {
    id: 'members.admin.orientation.v1',
    version: 1,
    title: 'Members orientation',
    summary: 'Learn the member roster, filters, row actions, and high-impact admin controls.',
    route: '/members',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'members-header',
        target: '[data-help-id="members.header"]',
        popover: {
          title: 'Member records',
          description:
            'Members is the personnel record area. Changes here can affect login, badges, qualifications, reports, and scheduling.',
          side: 'bottom',
          align: 'start',
        },
        help: { wikiSlug: 'admin/members/member-records' },
      },
      {
        id: 'members-actions',
        target: '[data-help-id="members.header-actions"]',
        popover: {
          title: 'Use admin actions carefully',
          description:
            'Create members, add civilian staff, import CSV files, or sync qualifications only when records are ready to change.',
          side: 'bottom',
          align: 'end',
        },
        help: { wikiSlug: 'admin/members/create-member' },
      },
      {
        id: 'members-filters',
        target: '[data-help-id="members.filters"]',
        popover: {
          title: 'Filter before acting',
          description:
            'Search and filters help you find the right record before editing or selecting rows for bulk changes.',
          side: 'bottom',
          align: 'center',
        },
        help: { wikiSlug: 'admin/members/filters-and-search' },
      },
      {
        id: 'members-table',
        target: '[data-help-id="members.table"]',
        popover: {
          title: 'Roster table',
          description:
            'The table shows identity, division, contract, status, badge, qualifications, and tags for each member.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'admin/members/member-records' },
      },
      {
        id: 'members-row-actions',
        target: '[data-help-id="members.row-actions"]',
        popover: {
          title: 'Row actions',
          description:
            'Use row actions for qualifications, tags, edit, and archive. Confirm the row identity before selecting an icon.',
          side: 'left',
          align: 'center',
        },
        help: { wikiSlug: 'admin/members/qualifications-and-tags' },
      },
      {
        id: 'members-bulk-actions',
        target: '[data-help-id="members.bulk-actions"]',
        popover: {
          title: 'Bulk changes',
          description:
            'Bulk actions affect selected rows. Use them only after confirming every selected member belongs in the change.',
          side: 'bottom',
          align: 'center',
        },
        help: { wikiSlug: 'admin/members/bulk-actions' },
      },
    ],
  },
  {
    id: 'members.admin.records.v1',
    version: 1,
    title: 'Maintain member records',
    summary: 'Create, import, edit, and keep member qualifications aligned.',
    route: '/members',
    personas: ['admin'],
    guards: [(context) => adminGuard(context.accountLevel)],
    steps: [
      {
        id: 'create-member',
        target: '[data-help-id="members.create-member"]',
        popover: {
          title: 'Create a member',
          description:
            'Use New Member for nominal-roll personnel. Confirm service number and rank before saving.',
          side: 'bottom',
          align: 'end',
        },
        help: { wikiSlug: 'admin/members/create-member' },
      },
      {
        id: 'create-civilian',
        target: '[data-help-id="members.create-civilian"]',
        popover: {
          title: 'Create civilian staff',
          description:
            'Civilian staff records support authorized non-member personnel without treating them as nominal-roll members.',
          side: 'bottom',
          align: 'end',
        },
        help: { wikiSlug: 'admin/members/create-civilian-staff' },
      },
      {
        id: 'import',
        target: '[data-help-id="members.import-csv"]',
        popover: {
          title: 'Import from CSV',
          description:
            'Use CSV import for controlled roster updates. Review preview results and errors before executing.',
          side: 'bottom',
          align: 'end',
        },
        help: { wikiSlug: 'admin/members/import-csv' },
      },
      {
        id: 'sync',
        target: '[data-help-id="members.sync-qualifications"]',
        popover: {
          title: 'Sync qualifications',
          description:
            'Sync recalculates automatic qualifications after record changes. Review the success message for grants, revokes, and errors.',
          side: 'bottom',
          align: 'end',
        },
        help: { wikiSlug: 'admin/members/sync-qualifications' },
      },
    ],
  },
]

export const eventsProcedureDefinitions: ProcedureDefinition[] = [
  {
    id: 'events.planner.orientation.v1',
    version: 1,
    title: 'Events orientation',
    summary: 'Learn event list filters, creation, details, status flow, and Duty Watch planning.',
    route: '/events',
    personas: ['user'],
    steps: [
      {
        id: 'events-header',
        target: '[data-help-id="events.header"]',
        popover: {
          title: 'Unit Events',
          description:
            'Events capture planned training, ceremonies, and operational activities that may affect attendance and duty planning.',
          side: 'bottom',
          align: 'start',
        },
        help: { wikiSlug: 'operations/events/event-management' },
      },
      {
        id: 'events-filters',
        target: '[data-help-id="events.filters"]',
        popover: {
          title: 'Find the right event',
          description:
            'Filter by category, status, and date range before deciding an event is missing or complete.',
          side: 'bottom',
          align: 'center',
        },
        help: { wikiSlug: 'operations/events/list-and-filters' },
      },
      {
        id: 'events-list',
        target: '[data-help-id="events.list"]',
        popover: {
          title: 'Read event state',
          description:
            'The list shows date, title, type, status, and whether Duty Watch support is required.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/events/list-and-filters' },
      },
      {
        id: 'events-create',
        target: '[data-help-id="events.create"]',
        popover: {
          title: 'Create an event',
          description:
            'Create the event before building duty coverage. Title and date are required; Duty Watch can be enabled when needed.',
          side: 'bottom',
          align: 'end',
        },
        help: { wikiSlug: 'operations/events/create-event' },
      },
      {
        id: 'event-detail',
        target: '[data-help-id="events.detail.overview"]',
        popover: {
          title: 'Event detail',
          description:
            'Detail pages show the current event state, status actions, overview fields, and Duty Watch tab.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/events/event-detail' },
      },
      {
        id: 'event-status',
        target: '[data-help-id="events.detail.status-actions"]',
        popover: {
          title: 'Status workflow',
          description:
            'Move event status in order. Status controls what can still be edited or assigned.',
          side: 'bottom',
          align: 'start',
        },
        help: { wikiSlug: 'operations/events/status-workflow' },
      },
      {
        id: 'event-edit-cancel-delete',
        target: '[data-help-id="events.detail.actions"]',
        popover: {
          title: 'Edit, cancel, or delete',
          description:
            'Use event actions only after confirming the event is the right one and the status change will not hide a planning issue.',
          side: 'bottom',
          align: 'end',
        },
        help: { wikiSlug: 'operations/events/edit-cancel-delete' },
      },
      {
        id: 'event-duty-watch',
        target: '[data-help-id="events.detail.duty-watch"]',
        popover: {
          title: 'Event Duty Watch',
          description:
            'Use this tab to assign members to event duty positions when the event needs coverage.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/events/duty-watch' },
      },
    ],
  },
  {
    id: 'events.planner.duty-watch.v1',
    version: 1,
    title: 'Event Duty Watch',
    summary: 'Plan event support positions and assign members safely.',
    route: '/events',
    personas: ['user'],
    guards: [(context) => officerGuard(context.accountLevel)],
    steps: [
      {
        id: 'event-detail-tabs',
        target: '[data-help-id="events.detail.tabs"]',
        popover: {
          title: 'Open Duty Watch',
          description:
            'Use the Duty Watch tab to manage event-specific positions after the event details are correct.',
          side: 'bottom',
          align: 'start',
        },
        help: { wikiSlug: 'operations/events/duty-watch' },
      },
      {
        id: 'event-duty-card',
        target: '[data-help-id="events.detail.duty-watch"]',
        popover: {
          title: 'Assign positions',
          description:
            'Assign each required position to an eligible member, then confirm unassigned positions are intentional.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/events/duty-watch' },
      },
    ],
  },
]

export const schedulesProcedureDefinitions: ProcedureDefinition[] = [
  {
    id: 'schedules.scheduler.orientation.v1',
    version: 1,
    title: 'Schedules orientation',
    summary: 'Learn week, month, and quarter views for DDS and Duty Watch coverage.',
    route: '/schedules',
    personas: ['user'],
    guards: [(context) => officerGuard(context.accountLevel)],
    steps: [
      {
        id: 'schedules-header',
        target: '[data-help-id="schedules.header"]',
        popover: {
          title: 'Schedules',
          description:
            'Schedules plan DDS and Duty Watch assignments before they become live operational coverage.',
          side: 'bottom',
          align: 'start',
        },
        help: { wikiSlug: 'operations/schedules/dds-duty-watch-scheduling' },
      },
      {
        id: 'schedules-view-tabs',
        target: '[data-help-id="schedules.view-tabs"]',
        popover: {
          title: 'Choose the planning view',
          description:
            'Week is for editing assignments. Month and quarter views help scan coverage patterns and gaps.',
          side: 'bottom',
          align: 'center',
        },
        help: { wikiSlug: 'operations/schedules/week-view' },
      },
      {
        id: 'schedules-date-picker',
        target: '[data-help-id="schedules.date-picker"]',
        popover: {
          title: 'Navigate dates',
          description:
            'Use the picker for the active view. Always confirm the week or month before assigning people.',
          side: 'bottom',
          align: 'end',
        },
        help: { wikiSlug: 'operations/schedules/month-and-quarter-views' },
      },
      {
        id: 'schedules-week-columns',
        target: '[data-help-id="schedules.week-columns"]',
        popover: {
          title: 'Two-week planning',
          description:
            'Week view shows the selected week and the following week so handoff gaps are easier to see.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/schedules/week-view' },
      },
      {
        id: 'schedules-dds-card',
        target: '[data-help-id="schedules.dds-card"]',
        popover: {
          title: 'DDS assignment',
          description:
            'Assign one qualified DDS for the week, then publish when the assignment has been checked.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/schedules/assign-dds' },
      },
      {
        id: 'schedules-duty-watch-card',
        target: '[data-help-id="schedules.duty-watch-card"]',
        popover: {
          title: 'Duty Watch assignment',
          description:
            'Build the base Duty Watch roster and review per-night differences before publishing.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/schedules/assign-duty-watch' },
      },
    ],
  },
  {
    id: 'schedules.scheduler.publish.v1',
    version: 1,
    title: 'Publish schedules',
    summary: 'Assign, review, and publish DDS or Duty Watch schedules.',
    route: '/schedules',
    personas: ['user'],
    guards: [(context) => officerGuard(context.accountLevel)],
    steps: [
      {
        id: 'publish-dds',
        target: '[data-help-id="schedules.dds-card"]',
        popover: {
          title: 'Confirm DDS first',
          description:
            'DDS coverage is a single-person responsibility. Confirm the member and week before publishing.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/schedules/assign-dds' },
      },
      {
        id: 'publish-duty-watch',
        target: '[data-help-id="schedules.duty-watch-card"]',
        popover: {
          title: 'Confirm watch coverage',
          description:
            'Check base positions and night overrides. Published coverage is what the Dashboard uses for readiness.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/schedules/publish-and-edit' },
      },
      {
        id: 'member-picker',
        target: '[data-help-id="schedules.member-picker"]',
        popover: {
          title: 'Pick eligible members',
          description:
            'Member picker filters help prevent assigning the wrong person. Search by name or service number.',
          side: 'top',
          align: 'center',
        },
        help: { wikiSlug: 'operations/schedules/member-picker' },
      },
      {
        id: 'night-overrides',
        target: '[data-help-id="schedules.night-overrides"]',
        popover: {
          title: 'Night overrides',
          description:
            'Use night overrides when a specific night differs from the base roster. Confirm the exception before publishing.',
          side: 'bottom',
          align: 'center',
        },
        help: { wikiSlug: 'operations/schedules/night-overrides' },
      },
      {
        id: 'publish-controls',
        target: '[data-help-id="schedules.publish-controls"]',
        popover: {
          title: 'Publish or return to draft',
          description:
            'Publishing makes coverage operational. Return to draft only when a published assignment needs controlled correction.',
          side: 'top',
          align: 'end',
        },
        help: { wikiSlug: 'operations/schedules/publish-and-edit' },
      },
    ],
  },
]

export const sectionProcedureDefinitions = [
  ...historyProcedureDefinitions,
  ...membersProcedureDefinitions,
  ...eventsProcedureDefinitions,
  ...schedulesProcedureDefinitions,
]
