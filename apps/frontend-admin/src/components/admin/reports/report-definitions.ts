import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns'

export type AdminReportType =
  | 'daily_presence'
  | 'weekly_presence'
  | 'monthly_presence'
  | 'training_night_monthly'
  | 'visitor_activity'

export type ReportScopeType = 'everyone' | 'department' | 'tag' | 'fts' | 'geo'

export type ReportFilterKey =
  | 'date'
  | 'weekStartDate'
  | 'month'
  | 'startDate'
  | 'endDate'
  | 'scopeType'
  | 'divisionId'
  | 'tagId'
  | 'visitType'
  | 'visitorPurpose'
  | 'eventLinked'
  | 'hostMemberId'
  | 'organization'

export interface ReportFilters {
  reportType: AdminReportType
  date: string
  weekStartDate: string
  month: string
  startDate: string
  endDate: string
  scopeType: ReportScopeType
  divisionId: string
  tagId: string
  visitType: string
  visitorPurpose: string
  eventLinked: 'all' | 'linked' | 'unlinked'
  hostMemberId: string
  organization: string
}

export interface ReportDefinition {
  reportType: AdminReportType
  label: string
  description: string
  defaultFilters: () => ReportFilters
  requiredFilters: readonly ReportFilterKey[]
  visibleFilters: readonly ReportFilterKey[]
  runMutation:
    | 'generateDailyPresence'
    | 'generateWeeklyPresence'
    | 'generateMonthlyPresence'
    | 'generateTrainingNightMonthly'
    | 'generateVisitorActivity'
  previewComponent:
    | 'DailyPresenceReport'
    | 'WeeklyPresenceReport'
    | 'MonthlyPresenceReport'
    | 'TrainingNightMonthlyReport'
    | 'VisitorActivityReport'
}

function today(): Date {
  return new Date()
}

function toDateInput(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function toMonthInput(date: Date): string {
  return format(date, 'yyyy-MM')
}

export function getBaseReportFilters(reportType: AdminReportType): ReportFilters {
  const now = today()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  return {
    reportType,
    date: toDateInput(now),
    weekStartDate: toDateInput(weekStart),
    month: toMonthInput(now),
    startDate: toDateInput(monthStart),
    endDate: toDateInput(monthEnd < now ? monthEnd : now),
    scopeType: 'everyone',
    divisionId: '',
    tagId: '',
    visitType: '',
    visitorPurpose: '',
    eventLinked: 'all',
    hostMemberId: '',
    organization: '',
  }
}

export const REPORT_DEFINITIONS = [
  {
    reportType: 'daily_presence',
    label: 'Daily Presence',
    description: 'Who was present on a selected day, including first arrival and final departure.',
    defaultFilters: () => getBaseReportFilters('daily_presence'),
    requiredFilters: ['date'],
    visibleFilters: ['date', 'scopeType', 'divisionId', 'tagId'],
    runMutation: 'generateDailyPresence',
    previewComponent: 'DailyPresenceReport',
  },
  {
    reportType: 'weekly_presence',
    label: 'Weekly Presence',
    description: 'Presence across a Monday-Sunday week with key night attendance markers.',
    defaultFilters: () => getBaseReportFilters('weekly_presence'),
    requiredFilters: ['weekStartDate'],
    visibleFilters: ['weekStartDate', 'scopeType', 'divisionId', 'tagId'],
    runMutation: 'generateWeeklyPresence',
    previewComponent: 'WeeklyPresenceReport',
  },
  {
    reportType: 'monthly_presence',
    label: 'Monthly Presence',
    description: 'Monthly attendance overview by member, department, or tag-backed group.',
    defaultFilters: () => getBaseReportFilters('monthly_presence'),
    requiredFilters: ['month'],
    visibleFilters: ['month', 'scopeType', 'divisionId', 'tagId'],
    runMutation: 'generateMonthlyPresence',
    previewComponent: 'MonthlyPresenceReport',
  },
  {
    reportType: 'training_night_monthly',
    label: 'Training Night Monthly',
    description: 'Department matrix showing attendance for each Training Night in the month.',
    defaultFilters: () => ({
      ...getBaseReportFilters('training_night_monthly'),
      scopeType: 'department',
    }),
    requiredFilters: ['month', 'divisionId'],
    visibleFilters: ['month', 'divisionId'],
    runMutation: 'generateTrainingNightMonthly',
    previewComponent: 'TrainingNightMonthlyReport',
  },
  {
    reportType: 'visitor_activity',
    label: 'Visitor Activity',
    description:
      'Visitor activity by date range, visit type, purpose, event link, host, or organization.',
    defaultFilters: () => getBaseReportFilters('visitor_activity'),
    requiredFilters: ['startDate', 'endDate'],
    visibleFilters: [
      'startDate',
      'endDate',
      'visitType',
      'visitorPurpose',
      'eventLinked',
      'hostMemberId',
      'organization',
    ],
    runMutation: 'generateVisitorActivity',
    previewComponent: 'VisitorActivityReport',
  },
] as const satisfies readonly ReportDefinition[]

export function getReportDefinition(reportType: AdminReportType): ReportDefinition {
  const definition = REPORT_DEFINITIONS.find((item) => item.reportType === reportType)
  if (!definition) {
    throw new Error(`Unknown report type: ${reportType}`)
  }
  return definition
}

export function getNextWeekStart(weekStartDate: string, direction: -1 | 1): string {
  return toDateInput(addDays(new Date(`${weekStartDate}T00:00:00`), direction * 7))
}
