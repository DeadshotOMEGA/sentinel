'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  FileText,
  Play,
  Plus,
  Printer,
  RotateCcw,
  X,
} from 'lucide-react'
import type { DailyPresenceSortCriterion } from '@sentinel/contracts'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  useAdminReportRunner,
  useVisitTypesForReports,
  type AdminReportResponse,
  type RunAdminReportInput,
} from '@/hooks/use-admin-reports'
import { useDivisions } from '@/hooks/use-divisions'
import { useMembers } from '@/hooks/use-members'
import { useTags } from '@/hooks/use-member-tags'
import { cn } from '@/lib/utils'
import {
  getBaseReportFilters,
  getReportDefinition,
  REPORT_DEFINITIONS,
  type AdminReportType,
  type DailyPresenceSortGroup,
  type DailyPresenceSortRule,
  type ReportFilters,
  type ReportScopeType,
} from './report-definitions'
import { ReportPreview } from './report-preview'

const SENTINEL_BOOTSTRAP_SERVICE_NUMBER = 'SENTINEL-SYSTEM'

const REPORT_SCOPE_OPTIONS: Array<{ value: ReportScopeType; label: string }> = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'department', label: 'Department' },
  { value: 'tag', label: 'Specific tag' },
  { value: 'fts', label: 'FTS tag shortcut' },
  { value: 'geo', label: 'GEO tag shortcut' },
]

function optionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function optionalStringArray(values: string[]): string[] | undefined {
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))]
  return normalized.length > 0 ? normalized : undefined
}

function getSelectedScopeTypes(filters: ReportFilters): ReportScopeType[] {
  const selected = filters.scopeTypes.length > 0 ? filters.scopeTypes : [filters.scopeType]
  return selected.includes('everyone') ? ['everyone'] : [...new Set(selected)]
}

function scopeRequiresDepartment(scopeTypes: ReportScopeType[]): boolean {
  return scopeTypes.includes('department')
}

function scopeRequiresTag(scopeTypes: ReportScopeType[]): boolean {
  return scopeTypes.includes('tag')
}

function reportSupportsMultiScope(reportType: AdminReportType): boolean {
  return reportType === 'weekly_presence' || reportType === 'monthly_presence'
}

function reportSupportsMultiDepartment(reportType: AdminReportType): boolean {
  return (
    reportType === 'weekly_presence' ||
    reportType === 'monthly_presence' ||
    reportType === 'training_night_monthly'
  )
}

function reportSupportsMemberSort(reportType: AdminReportType): boolean {
  return (
    reportType === 'daily_presence' ||
    reportType === 'weekly_presence' ||
    reportType === 'monthly_presence' ||
    reportType === 'training_night_monthly'
  )
}

function createDailyPresenceSortRuleId(): string {
  return `daily-sort-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function toDailyPresenceSortCriteria(rules: DailyPresenceSortRule[]): DailyPresenceSortCriterion[] {
  const criteria: DailyPresenceSortCriterion[] = []

  const orderedRules = [
    ...rules.filter((rule) => rule.sortGroup === 'primary'),
    ...rules.filter((rule) => rule.sortGroup === 'secondary'),
  ]

  for (const rule of orderedRules) {
    if (rule.type === 'tag') {
      if (rule.tagId) {
        criteria.push({ type: 'tag', tagId: rule.tagId, direction: rule.direction })
      }
      continue
    }

    if (rule.type === 'tag_priority') {
      criteria.push({ type: 'tag_priority', direction: rule.direction })
      continue
    }

    criteria.push({ type: 'field', field: rule.field, direction: rule.direction })
  }

  return criteria
}

function buildRunInput(filters: ReportFilters): RunAdminReportInput {
  const scopeTypes = reportSupportsMultiScope(filters.reportType)
    ? getSelectedScopeTypes(filters)
    : [filters.scopeType]
  const scopeType = scopeTypes[0] ?? 'everyone'
  const divisionIds = scopeRequiresDepartment(scopeTypes)
    ? optionalStringArray(filters.divisionIds)
    : undefined
  const divisionId = scopeRequiresDepartment(scopeTypes)
    ? optionalString(filters.divisionId)
    : undefined
  const tagIds = scopeRequiresTag(scopeTypes) ? optionalStringArray(filters.tagIds) : undefined
  const tagId = scopeRequiresTag(scopeTypes) ? optionalString(filters.tagId) : undefined

  switch (filters.reportType) {
    case 'daily_presence':
      return {
        reportType: 'daily_presence',
        body: {
          date: filters.date,
          scopeType,
          divisionId,
          tagId,
          sort: toDailyPresenceSortCriteria(filters.dailyPresenceSort),
        },
      }
    case 'weekly_presence':
      return {
        reportType: 'weekly_presence',
        body: {
          weekStartDate: filters.weekStartDate,
          scopeType,
          scopeTypes,
          divisionId,
          divisionIds,
          tagId,
          tagIds,
          sort: toDailyPresenceSortCriteria(filters.dailyPresenceSort),
        },
      }
    case 'monthly_presence':
      return {
        reportType: 'monthly_presence',
        body: {
          month: filters.month,
          scopeType,
          scopeTypes,
          divisionId,
          divisionIds,
          tagId,
          tagIds,
          sort: toDailyPresenceSortCriteria(filters.dailyPresenceSort),
        },
      }
    case 'training_night_monthly':
      return {
        reportType: 'training_night_monthly',
        body: {
          month: filters.month,
          divisionId: filters.divisionId || filters.divisionIds[0],
          divisionIds: filters.divisionIds,
          sort: toDailyPresenceSortCriteria(filters.dailyPresenceSort),
        },
      }
    case 'visitor_activity':
      return {
        reportType: 'visitor_activity',
        body: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          visitType: optionalString(filters.visitType),
          visitorPurpose: optionalString(filters.visitorPurpose),
          eventLinked: filters.eventLinked === 'all' ? undefined : filters.eventLinked === 'linked',
          hostMemberId: optionalString(filters.hostMemberId),
          organization: optionalString(filters.organization),
        },
      }
    case 'operational_exceptions':
      return {
        reportType: 'operational_exceptions',
        body: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      }
  }
}

export function AdminReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(() =>
    getBaseReportFilters('daily_presence')
  )
  const [lastReport, setLastReport] = useState<AdminReportResponse | null>(null)
  const divisionsQuery = useDivisions()
  const tagsQuery = useTags()
  const visitTypesQuery = useVisitTypesForReports()
  const membersQuery = useMembers({ limit: 500, scope: 'all', status: 'active' })
  const reportHostMembers = (membersQuery.data?.members ?? []).filter(
    (member) => member.serviceNumber !== SENTINEL_BOOTSTRAP_SERVICE_NUMBER
  )
  const reportRunner = useAdminReportRunner()
  const definition = getReportDefinition(filters.reportType)
  const tags = tagsQuery.data ?? []
  const ftsTag = tags.find((tag) => tag.name.toLowerCase() === 'fts')
  const geoTag = tags.find((tag) => tag.name.toLowerCase() === 'geo')
  const selectedScopeTypes = getSelectedScopeTypes(filters)
  const shortcutWarnings = [
    selectedScopeTypes.includes('fts') && !ftsTag
      ? 'FTS tag was not found. The shortcut is disabled until the tag exists.'
      : null,
    selectedScopeTypes.includes('geo') && !geoTag
      ? 'GEO tag was not found. The shortcut is disabled until the tag exists.'
      : null,
  ].filter((message): message is string => message !== null)

  const validationMessages = useMemo(() => {
    const messages: string[] = []
    for (const key of definition.requiredFilters) {
      if (!filters[key]) {
        messages.push(`Select ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}.`)
      }
    }

    if (scopeRequiresDepartment(selectedScopeTypes) && filters.divisionIds.length === 0) {
      messages.push('Select at least one department for the department scope.')
    }

    if (scopeRequiresTag(selectedScopeTypes) && filters.tagIds.length === 0) {
      messages.push('Select at least one tag for the specific tag scope.')
    }

    if (
      reportSupportsMemberSort(filters.reportType) &&
      filters.dailyPresenceSort.some((rule) => rule.type === 'tag' && !rule.tagId)
    ) {
      messages.push('Select a tag for each tag sort rule.')
    }

    for (const shortcutWarning of shortcutWarnings) {
      messages.push(shortcutWarning)
    }

    return messages
  }, [definition.requiredFilters, filters, selectedScopeTypes, shortcutWarnings])

  const isRunDisabled = validationMessages.length > 0 || reportRunner.isPending
  const errorMessage = reportRunner.error?.message ?? null

  function updateFilters(next: Partial<ReportFilters>) {
    setFilters((current) => ({ ...current, ...next }))
  }

  function handleReportTypeChange(reportType: AdminReportType) {
    setFilters(getReportDefinition(reportType).defaultFilters())
  }

  function handleReset() {
    setFilters(definition.defaultFilters())
  }

  async function handleRunReport() {
    try {
      const report = await reportRunner.mutateAsync(buildRunInput(filters))
      setLastReport(report)
    } catch {
      // The mutation stores the API error; keep the page mounted so ReportPreview can show it.
    }
  }

  function handlePrint() {
    globalThis.window.print()
  }

  return (
    <div className="space-y-(--space-4)">
      <header className="flex flex-wrap items-start justify-between gap-(--space-4)">
        <div>
          <h1 id="admin-page-title" className="font-display text-3xl font-bold tracking-normal">
            Reports
          </h1>
          <p className="mt-(--space-1) text-sm text-base-content/65">
            Generate printable attendance, presence, and visitor reports.
          </p>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 px-(--space-3) py-(--space-2) text-sm text-base-content/65 shadow-[var(--shadow-1)]">
          <span className="font-semibold text-base-content">V1 export:</span> browser print
        </div>
      </header>

      <AppCard className="reports-screen-only">
        <AppCardHeader>
          <div className="flex flex-wrap items-start justify-between gap-(--space-4)">
            <div>
              <AppCardTitle className="flex items-center gap-(--space-2)">
                <FileText className="h-5 w-5 text-info" aria-hidden="true" />
                Report setup
              </AppCardTitle>
              <AppCardDescription>
                Choose a report, set only the relevant filters, then preview it below.
              </AppCardDescription>
            </div>
            <AppBadge status="info" size="sm">
              Admin / Developer
            </AppBadge>
          </div>
        </AppCardHeader>
        <AppCardContent className="space-y-(--space-4)">
          <div className="grid gap-(--space-4) xl:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)]">
            <ReportTypeSelector value={filters.reportType} onChange={handleReportTypeChange} />

            <ReportsFilterPanel
              filters={filters}
              updateFilters={updateFilters}
              divisions={divisionsQuery.data?.divisions ?? []}
              tags={tags}
              visitTypes={visitTypesQuery.data ?? []}
              hostMembers={reportHostMembers}
              shortcutWarnings={shortcutWarnings}
            />
          </div>

          {validationMessages.length > 0 && (
            <div className="rounded-box border border-warning/40 bg-warning-fadded p-(--space-3) text-sm text-warning-fadded-content">
              <p className="font-semibold">Required before running</p>
              <ul className="mt-(--space-1) list-disc pl-(--space-4)">
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <ReportActionBar
            isRunDisabled={isRunDisabled}
            isRunning={reportRunner.isPending}
            hasReport={lastReport !== null}
            onRun={() => {
              void handleRunReport()
            }}
            onPrint={handlePrint}
            onReset={handleReset}
          />
        </AppCardContent>
      </AppCard>

      <ReportPreview
        report={lastReport}
        isLoading={reportRunner.isPending}
        errorMessage={errorMessage}
      />
    </div>
  )
}

function ReportTypeSelector({
  value,
  onChange,
}: {
  value: AdminReportType
  onChange: (reportType: AdminReportType) => void
}) {
  const selected = getReportDefinition(value)

  return (
    <div className="space-y-(--space-2)">
      <label className="form-control w-full">
        <span className="label pb-(--space-1)">
          <span className="label-text font-semibold">Report type</span>
        </span>
        <select
          className="select select-bordered w-full"
          value={value}
          onChange={(event) => onChange(event.target.value as AdminReportType)}
        >
          {REPORT_DEFINITIONS.map((definition) => (
            <option key={definition.reportType} value={definition.reportType}>
              {definition.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-base-content/65">{selected.description}</p>
    </div>
  )
}

function ReportsFilterPanel({
  filters,
  updateFilters,
  divisions,
  tags,
  visitTypes,
  hostMembers,
  shortcutWarnings,
}: {
  filters: ReportFilters
  updateFilters: (next: Partial<ReportFilters>) => void
  divisions: Array<{ id: string; code: string; name: string }>
  tags: Array<{ id: string; name: string }>
  visitTypes: Array<{ id: string; code: string; name: string }>
  hostMembers: Array<{
    id: string
    displayName: string
    rank: string
    firstName: string
    lastName: string
  }>
  shortcutWarnings: string[]
}) {
  const definition = getReportDefinition(filters.reportType)
  const visible = new Set(definition.visibleFilters)
  const showScope = visible.has('scopeType')
  const useMultiScope = reportSupportsMultiScope(filters.reportType)
  const useMultiDepartment = reportSupportsMultiDepartment(filters.reportType)
  const selectedScopeTypes = useMultiScope ? getSelectedScopeTypes(filters) : [filters.scopeType]
  const showDepartment =
    visible.has('divisionId') &&
    (filters.reportType === 'training_night_monthly' || selectedScopeTypes.includes('department'))
  const showTag = visible.has('tagId') && selectedScopeTypes.includes('tag')
  const showDailyPresenceSort = visible.has('dailyPresenceSort')

  function updateScopeTypes(nextScopeTypes: ReportScopeType[]) {
    const normalized = nextScopeTypes.includes('everyone')
      ? (['everyone'] as ReportScopeType[])
      : nextScopeTypes.length > 0
        ? nextScopeTypes
        : (['everyone'] as ReportScopeType[])
    const includesDepartment = normalized.includes('department')
    const includesTag = normalized.includes('tag')

    updateFilters({
      scopeType: normalized[0] ?? 'everyone',
      scopeTypes: normalized,
      divisionId: includesDepartment ? filters.divisionId : '',
      divisionIds: includesDepartment ? filters.divisionIds : [],
      tagId: includesTag ? filters.tagId : '',
      tagIds: includesTag ? filters.tagIds : [],
    })
  }

  function toggleScopeType(scopeType: ReportScopeType) {
    if (scopeType === 'everyone') {
      updateScopeTypes(['everyone'])
      return
    }

    const withoutEveryone = selectedScopeTypes.filter((value) => value !== 'everyone')
    const nextScopeTypes = withoutEveryone.includes(scopeType)
      ? withoutEveryone.filter((value) => value !== scopeType)
      : [...withoutEveryone, scopeType]
    updateScopeTypes(nextScopeTypes)
  }

  function updateDepartmentIds(divisionIds: string[]) {
    updateFilters({
      divisionIds,
      divisionId: divisionIds[0] ?? '',
    })
  }

  function updateTagIds(tagIds: string[]) {
    updateFilters({
      tagIds,
      tagId: tagIds[0] ?? '',
    })
  }

  return (
    <div className="grid gap-(--space-3) md:grid-cols-2 xl:grid-cols-3">
      {visible.has('date') && (
        <DateInput label="Day" value={filters.date} onChange={(date) => updateFilters({ date })} />
      )}
      {visible.has('weekStartDate') && (
        <DateInput
          label="Week of"
          value={filters.weekStartDate}
          onChange={(weekStartDate) => updateFilters({ weekStartDate })}
        />
      )}
      {visible.has('month') && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Month</span>
          </span>
          <input
            type="month"
            className="input input-bordered w-full"
            value={filters.month}
            onChange={(event) => updateFilters({ month: event.target.value })}
          />
        </label>
      )}
      {visible.has('startDate') && (
        <DateInput
          label="Start date"
          value={filters.startDate}
          onChange={(startDate) => updateFilters({ startDate })}
        />
      )}
      {visible.has('endDate') && (
        <DateInput
          label="End date"
          value={filters.endDate}
          onChange={(endDate) => updateFilters({ endDate })}
        />
      )}
      {showScope && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Scope</span>
          </span>
          {useMultiScope ? (
            <MultiSelectDropdown
              ariaLabel="Scope"
              options={REPORT_SCOPE_OPTIONS}
              selectedValues={selectedScopeTypes}
              emptyLabel="Select scopes"
              summaryLabel={(count) => `${count} scopes`}
              onToggle={(value) => toggleScopeType(value as ReportScopeType)}
            />
          ) : (
            <select
              className="select select-bordered w-full"
              value={filters.scopeType}
              onChange={(event) =>
                updateFilters({
                  scopeType: event.target.value as ReportScopeType,
                  scopeTypes: [event.target.value as ReportScopeType],
                  divisionId: '',
                  divisionIds: [],
                  tagId: '',
                  tagIds: [],
                })
              }
            >
              {REPORT_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {shortcutWarnings.length > 0 && (
            <span className="label pt-(--space-1)">
              <span className="label-text-alt text-warning-fadded-content">
                {shortcutWarnings.join(' ')}
              </span>
            </span>
          )}
        </label>
      )}
      {showDepartment && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Department</span>
          </span>
          {useMultiDepartment ? (
            <MultiSelectDropdown
              ariaLabel="Department"
              options={divisions.map((division) => ({
                value: division.id,
                label: `${division.code} - ${division.name}`,
              }))}
              selectedValues={filters.divisionIds}
              emptyLabel="Select departments"
              summaryLabel={(count) => `${count} departments`}
              onToggle={(divisionId) =>
                updateDepartmentIds(
                  filters.divisionIds.includes(divisionId)
                    ? filters.divisionIds.filter((value) => value !== divisionId)
                    : [...filters.divisionIds, divisionId]
                )
              }
            />
          ) : (
            <select
              className="select select-bordered w-full"
              value={filters.divisionId}
              onChange={(event) =>
                updateFilters({
                  divisionId: event.target.value,
                  divisionIds: event.target.value ? [event.target.value] : [],
                })
              }
            >
              <option value="">Select department</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.code} - {division.name}
                </option>
              ))}
            </select>
          )}
        </label>
      )}
      {showTag && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Tag</span>
          </span>
          {useMultiScope ? (
            <MultiSelectDropdown
              ariaLabel="Tag"
              options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
              selectedValues={filters.tagIds}
              emptyLabel="Select tags"
              summaryLabel={(count) => `${count} tags`}
              onToggle={(tagId) =>
                updateTagIds(
                  filters.tagIds.includes(tagId)
                    ? filters.tagIds.filter((value) => value !== tagId)
                    : [...filters.tagIds, tagId]
                )
              }
            />
          ) : (
            <select
              className="select select-bordered w-full"
              value={filters.tagId}
              onChange={(event) =>
                updateFilters({
                  tagId: event.target.value,
                  tagIds: event.target.value ? [event.target.value] : [],
                })
              }
            >
              <option value="">Select tag</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          )}
        </label>
      )}
      {showDailyPresenceSort && (
        <div className="md:col-span-2 xl:col-span-3">
          <MemberReportSortBuilder
            reportType={filters.reportType}
            rules={filters.dailyPresenceSort}
            tags={tags}
            onChange={(dailyPresenceSort) => updateFilters({ dailyPresenceSort })}
          />
        </div>
      )}
      {visible.has('visitType') && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Visit type</span>
          </span>
          <select
            className="select select-bordered w-full"
            value={filters.visitType}
            onChange={(event) => updateFilters({ visitType: event.target.value })}
          >
            <option value="">All visit types</option>
            {visitTypes.map((visitType) => (
              <option key={visitType.id} value={visitType.code}>
                {visitType.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {visible.has('visitorPurpose') && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Purpose / reason</span>
          </span>
          <input
            className="input input-bordered w-full"
            value={filters.visitorPurpose}
            onChange={(event) => updateFilters({ visitorPurpose: event.target.value })}
            placeholder="Museum, contractor, meeting"
          />
        </label>
      )}
      {visible.has('eventLinked') && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Event link</span>
          </span>
          <select
            className="select select-bordered w-full"
            value={filters.eventLinked}
            onChange={(event) =>
              updateFilters({ eventLinked: event.target.value as ReportFilters['eventLinked'] })
            }
          >
            <option value="all">All visitors</option>
            <option value="linked">Event-linked visitors</option>
            <option value="unlinked">No event link</option>
          </select>
        </label>
      )}
      {visible.has('hostMemberId') && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Host</span>
          </span>
          <select
            className="select select-bordered w-full"
            value={filters.hostMemberId}
            onChange={(event) => updateFilters({ hostMemberId: event.target.value })}
          >
            <option value="">Any host</option>
            {hostMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName || `${member.rank} ${member.firstName} ${member.lastName}`}
              </option>
            ))}
          </select>
        </label>
      )}
      {visible.has('organization') && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Organization</span>
          </span>
          <input
            className="input input-bordered w-full"
            value={filters.organization}
            onChange={(event) => updateFilters({ organization: event.target.value })}
            placeholder="Organization or unit"
          />
        </label>
      )}
    </div>
  )
}

function MultiSelectDropdown({
  ariaLabel,
  options,
  selectedValues,
  emptyLabel,
  summaryLabel,
  onToggle,
}: {
  ariaLabel: string
  options: Array<{ value: string; label: string }>
  selectedValues: string[]
  emptyLabel: string
  summaryLabel: (count: number) => string
  onToggle: (value: string) => void
}) {
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value))
  const buttonLabel =
    selectedOptions.length === 0
      ? emptyLabel
      : selectedOptions.length === 1
        ? selectedOptions[0]?.label
        : summaryLabel(selectedOptions.length)

  return (
    <details className="dropdown w-full">
      <summary
        className="btn btn-outline h-12 w-full justify-between px-(--space-4) font-normal"
        aria-label={ariaLabel}
      >
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
      </summary>
      <div className="dropdown-content z-20 mt-(--space-1) max-h-80 w-full overflow-y-auto rounded-box border border-base-300 bg-base-100 p-(--space-2) shadow-[var(--shadow-2)]">
        {options.map((option) => {
          const checked = selectedValues.includes(option.value)
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-(--space-2) rounded-box px-(--space-2) py-(--space-2) text-sm hover:bg-base-200"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                aria-label={option.label}
                checked={checked}
                onChange={() => onToggle(option.value)}
              />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </label>
          )
        })}
      </div>
    </details>
  )
}

type MemberReportSortField = Extract<DailyPresenceSortCriterion, { type: 'field' }>['field']

const DAILY_PRESENCE_FIELD_OPTIONS: Array<{ value: MemberReportSortField; label: string }> = [
  { value: 'rank', label: 'Rank' },
  { value: 'last_name', label: 'Last name' },
  { value: 'first_name', label: 'First name' },
  { value: 'department', label: 'Department' },
  { value: 'first_in', label: 'First in' },
  { value: 'last_out', label: 'Last out' },
  { value: 'sessions', label: 'Sessions' },
]

const WEEKLY_PRESENCE_FIELD_OPTIONS: Array<{ value: MemberReportSortField; label: string }> = [
  { value: 'rank', label: 'Rank' },
  { value: 'last_name', label: 'Last name' },
  { value: 'first_name', label: 'First name' },
  { value: 'department', label: 'Department' },
  { value: 'total_days_present', label: 'Days present' },
  { value: 'total_sessions', label: 'Sessions' },
  { value: 'training_night_present', label: 'Training night' },
  { value: 'admin_night_present', label: 'Admin night' },
]

const MONTHLY_PRESENCE_FIELD_OPTIONS: Array<{ value: MemberReportSortField; label: string }> = [
  { value: 'rank', label: 'Rank' },
  { value: 'last_name', label: 'Last name' },
  { value: 'first_name', label: 'First name' },
  { value: 'department', label: 'Department' },
  { value: 'total_days_present', label: 'Days present' },
  { value: 'total_sessions', label: 'Sessions' },
  { value: 'training_nights_present', label: 'Training nights' },
  { value: 'admin_nights_present', label: 'Admin nights' },
]

const TRAINING_NIGHT_MONTHLY_FIELD_OPTIONS: Array<{
  value: MemberReportSortField
  label: string
}> = [
  { value: 'rank', label: 'Rank' },
  { value: 'last_name', label: 'Last name' },
  { value: 'first_name', label: 'First name' },
  { value: 'department', label: 'Department' },
  { value: 'attended', label: 'Attended' },
  { value: 'possible', label: 'Possible' },
  { value: 'percentage', label: 'Percentage' },
]

function getMemberReportFieldOptions(
  reportType: AdminReportType
): Array<{ value: MemberReportSortField; label: string }> {
  switch (reportType) {
    case 'weekly_presence':
      return WEEKLY_PRESENCE_FIELD_OPTIONS
    case 'monthly_presence':
      return MONTHLY_PRESENCE_FIELD_OPTIONS
    case 'training_night_monthly':
      return TRAINING_NIGHT_MONTHLY_FIELD_OPTIONS
    case 'daily_presence':
    case 'visitor_activity':
    case 'operational_exceptions':
      return DAILY_PRESENCE_FIELD_OPTIONS
  }
}

function getDefaultMemberReportSortField(
  reportType: AdminReportType,
  group: DailyPresenceSortGroup
): MemberReportSortField {
  if (group === 'secondary') {
    return 'last_name'
  }

  return getMemberReportFieldOptions(reportType).some((option) => option.value === 'department')
    ? 'department'
    : 'rank'
}

function getDefaultMemberReportFieldDirection(field: MemberReportSortField) {
  if (
    field === 'rank' ||
    field === 'sessions' ||
    field === 'total_days_present' ||
    field === 'total_sessions' ||
    field === 'training_nights_present' ||
    field === 'admin_nights_present' ||
    field === 'attended' ||
    field === 'possible' ||
    field === 'percentage' ||
    field === 'training_night_present' ||
    field === 'admin_night_present'
  ) {
    return 'desc'
  }

  return 'asc'
}

function getDailyPresenceFieldDirectionLabels(field: MemberReportSortField) {
  if (field === 'rank') {
    return {
      asc: 'Lowest rank first',
      desc: 'Highest rank first',
    }
  }

  if (field === 'first_in' || field === 'last_out') {
    return {
      asc: 'Earliest first',
      desc: 'Latest first',
    }
  }

  if (field === 'training_night_present' || field === 'admin_night_present') {
    return {
      asc: 'Not present first',
      desc: 'Present first',
    }
  }

  if (
    field === 'sessions' ||
    field === 'total_days_present' ||
    field === 'total_sessions' ||
    field === 'training_nights_present' ||
    field === 'admin_nights_present' ||
    field === 'attended' ||
    field === 'possible' ||
    field === 'percentage'
  ) {
    return {
      asc: 'Low to high',
      desc: 'High to low',
    }
  }

  return {
    asc: 'A to Z',
    desc: 'Z to A',
  }
}

function MemberReportSortBuilder({
  reportType,
  rules,
  tags,
  onChange,
}: {
  reportType: AdminReportType
  rules: DailyPresenceSortRule[]
  tags: Array<{ id: string; name: string }>
  onChange: (rules: DailyPresenceSortRule[]) => void
}) {
  const primaryRules = rules.filter((rule) => rule.sortGroup === 'primary')
  const secondaryRules = rules.filter((rule) => rule.sortGroup === 'secondary')
  const fieldOptions = getMemberReportFieldOptions(reportType)

  function updateGroupRules(
    group: DailyPresenceSortGroup,
    nextGroupRules: DailyPresenceSortRule[]
  ) {
    onChange(
      group === 'primary'
        ? [...nextGroupRules, ...secondaryRules]
        : [...primaryRules, ...nextGroupRules]
    )
  }

  function replaceRule(ruleId: string, nextRule: DailyPresenceSortRule) {
    onChange(rules.map((rule) => (rule.id === ruleId ? nextRule : rule)))
  }

  function updateTagRule(
    ruleId: string,
    next: Partial<Omit<Extract<DailyPresenceSortRule, { type: 'tag' }>, 'id' | 'type'>>
  ) {
    onChange(
      rules.map((rule) => {
        if (rule.id !== ruleId || rule.type !== 'tag') {
          return rule
        }

        return { ...rule, ...next }
      })
    )
  }

  function updateFieldRule(
    ruleId: string,
    next: Partial<Omit<Extract<DailyPresenceSortRule, { type: 'field' }>, 'id' | 'type'>>
  ) {
    onChange(
      rules.map((rule) => {
        if (rule.id !== ruleId || rule.type !== 'field') {
          return rule
        }

        return { ...rule, ...next }
      })
    )
  }

  function updateTagPriorityRule(
    ruleId: string,
    next: Partial<Omit<Extract<DailyPresenceSortRule, { type: 'tag_priority' }>, 'id' | 'type'>>
  ) {
    onChange(
      rules.map((rule) => {
        if (rule.id !== ruleId || rule.type !== 'tag_priority') {
          return rule
        }

        return { ...rule, ...next }
      })
    )
  }

  function moveRule(group: DailyPresenceSortGroup, ruleId: string, direction: -1 | 1) {
    const groupRules = group === 'primary' ? primaryRules : secondaryRules
    const currentIndex = groupRules.findIndex((rule) => rule.id === ruleId)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= groupRules.length) {
      return
    }

    const nextRules = [...groupRules]
    const [rule] = nextRules.splice(currentIndex, 1)
    if (!rule) {
      return
    }
    nextRules.splice(nextIndex, 0, rule)
    updateGroupRules(group, nextRules)
  }

  function removeRule(ruleId: string) {
    onChange(rules.filter((rule) => rule.id !== ruleId))
  }

  function addTagRule(group: DailyPresenceSortGroup) {
    const tag = tags[0]
    if (!tag) {
      return
    }

    const nextRule: DailyPresenceSortRule = {
      id: createDailyPresenceSortRuleId(),
      sortGroup: group,
      type: 'tag',
      tagId: tag.id,
      direction: 'asc',
    }
    updateGroupRules(group, [...(group === 'primary' ? primaryRules : secondaryRules), nextRule])
  }

  function addTagPriorityRule(group: DailyPresenceSortGroup) {
    const nextRule: DailyPresenceSortRule = {
      id: createDailyPresenceSortRuleId(),
      sortGroup: group,
      type: 'tag_priority',
      direction: 'asc',
    }
    updateGroupRules(group, [...(group === 'primary' ? primaryRules : secondaryRules), nextRule])
  }

  function addFieldRule(group: DailyPresenceSortGroup) {
    const field = getDefaultMemberReportSortField(reportType, group)
    updateGroupRules(group, [
      ...(group === 'primary' ? primaryRules : secondaryRules),
      {
        id: createDailyPresenceSortRuleId(),
        sortGroup: group,
        type: 'field',
        field,
        direction: getDefaultMemberReportFieldDirection(field),
      },
    ])
  }

  function renderRule(
    rule: DailyPresenceSortRule,
    index: number,
    groupRules: DailyPresenceSortRule[]
  ) {
    return (
      <div
        key={rule.id}
        className="grid items-center gap-(--space-2) rounded-box border border-base-300 bg-base-100 p-(--space-2) md:grid-cols-[2rem_8rem_minmax(0,1fr)_8rem_auto]"
      >
        <span className="text-center text-xs font-semibold text-base-content/55">{index + 1}</span>
        <select
          className="select select-bordered select-sm w-full"
          value={rule.type}
          onChange={(event) => {
            if (event.target.value === 'tag') {
              const tag = tags[0]
              if (!tag) return
              replaceRule(rule.id, {
                id: rule.id,
                sortGroup: rule.sortGroup,
                type: 'tag',
                tagId: tag.id,
                direction: 'asc',
              })
              return
            }

            if (event.target.value === 'tag_priority') {
              replaceRule(rule.id, {
                id: rule.id,
                sortGroup: rule.sortGroup,
                type: 'tag_priority',
                direction: 'asc',
              })
              return
            }

            replaceRule(rule.id, {
              id: rule.id,
              sortGroup: rule.sortGroup,
              type: 'field',
              field: getDefaultMemberReportSortField(reportType, rule.sortGroup),
              direction: getDefaultMemberReportFieldDirection(
                getDefaultMemberReportSortField(reportType, rule.sortGroup)
              ),
            })
          }}
        >
          <option value="tag">Specific tag</option>
          <option value="tag_priority">Tag priority</option>
          <option value="field">Field</option>
        </select>

        {rule.type === 'tag' ? (
          <select
            className="select select-bordered select-sm w-full"
            value={rule.tagId}
            onChange={(event) => updateTagRule(rule.id, { tagId: event.target.value })}
          >
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        ) : rule.type === 'tag_priority' ? (
          <div className="rounded-box border border-base-300 bg-base-200 px-(--space-3) py-(--space-2) text-sm font-medium text-base-content/70">
            Configured tag order
          </div>
        ) : (
          <select
            className="select select-bordered select-sm w-full"
            value={rule.field}
            onChange={(event) => {
              const field = event.target.value as MemberReportSortField
              updateFieldRule(rule.id, {
                field,
                direction: getDefaultMemberReportFieldDirection(field),
              })
            }}
          >
            {fieldOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {(() => {
          const directionLabels =
            rule.type === 'field'
              ? getDailyPresenceFieldDirectionLabels(rule.field)
              : { asc: 'First', desc: 'Last' }

          return (
            <select
              className="select select-bordered select-sm w-full"
              value={rule.direction}
              onChange={(event) =>
                rule.type === 'tag'
                  ? updateTagRule(rule.id, {
                      direction: event.target.value as DailyPresenceSortCriterion['direction'],
                    })
                  : rule.type === 'tag_priority'
                    ? updateTagPriorityRule(rule.id, {
                        direction: event.target.value as DailyPresenceSortCriterion['direction'],
                      })
                    : updateFieldRule(rule.id, {
                        direction: event.target.value as DailyPresenceSortCriterion['direction'],
                      })
              }
            >
              <option value="asc">{directionLabels.asc}</option>
              <option value="desc">{directionLabels.desc}</option>
            </select>
          )
        })()}

        <div className="flex items-center justify-end gap-(--space-1)">
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            onClick={() => moveRule(rule.sortGroup, rule.id, -1)}
            disabled={index === 0}
            aria-label="Move sort rule up"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            onClick={() => moveRule(rule.sortGroup, rule.id, 1)}
            disabled={index === groupRules.length - 1}
            aria-label="Move sort rule down"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm text-error"
            onClick={() => removeRule(rule.id)}
            aria-label="Remove sort rule"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  function renderSortSection(params: {
    group: DailyPresenceSortGroup
    title: string
    description: string
    rules: DailyPresenceSortRule[]
    emptyText: string
  }) {
    return (
      <div className="rounded-box border border-base-300 bg-base-100 p-(--space-3)">
        <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
          <div>
            <h3 className="text-sm font-semibold">{params.title}</h3>
            <p className="mt-(--space-1) text-xs text-base-content/65">{params.description}</p>
          </div>
          <div className="flex flex-wrap gap-(--space-2)">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => addTagRule(params.group)}
              disabled={tags.length === 0}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Specific tag
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => addTagPriorityRule(params.group)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tag priority
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => addFieldRule(params.group)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Field sort
            </button>
          </div>
        </div>

        <div className="mt-(--space-3) space-y-(--space-2)">
          {params.rules.length === 0 ? (
            <p className="rounded-box border border-dashed border-base-300 bg-base-200 p-(--space-3) text-sm text-base-content/60">
              {params.emptyText}
            </p>
          ) : (
            params.rules.map((rule, index) => renderRule(rule, index, params.rules))
          )}
        </div>
      </div>
    )
  }

  return (
    <fieldset className="rounded-box border border-base-300 bg-base-200/45 p-(--space-3)">
      <div>
        <legend className="font-semibold">Sort order</legend>
        <p className="mt-(--space-1) text-sm text-base-content/65">
          Primary rules create the report groups. Secondary rules sort members inside each primary
          group.
        </p>
      </div>

      <div className="mt-(--space-3) grid gap-(--space-3)">
        {renderSortSection({
          group: 'primary',
          title: 'Primary sort order',
          description:
            'Use tag priority, specific tags, departments, or other fields to build the main buckets.',
          rules: primaryRules,
          emptyText: 'No primary grouping. The secondary sort will apply to the full report.',
        })}
        {renderSortSection({
          group: 'secondary',
          title: 'Secondary sort order',
          description:
            'Use rank, last name, or time fields to order members within each primary bucket.',
          rules: secondaryRules,
          emptyText:
            'No secondary sorting. Members inside each primary group will use backend fallback order.',
        })}
      </div>
    </fieldset>
  )
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="form-control w-full">
      <span className="label pb-(--space-1)">
        <span className="label-text font-semibold">{label}</span>
      </span>
      <input
        type="date"
        className="input input-bordered w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function ReportActionBar({
  isRunDisabled,
  isRunning,
  hasReport,
  onRun,
  onPrint,
  onReset,
}: {
  isRunDisabled: boolean
  isRunning: boolean
  hasReport: boolean
  onRun: () => void
  onPrint: () => void
  onReset: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-(--space-3) border-t border-base-300 pt-(--space-4)">
      <p className="max-w-2xl text-sm text-base-content/62">
        Uses your browser print dialog. Choose “Save to PDF” to create a PDF file.
      </p>
      <div className="flex flex-wrap items-center gap-(--space-2)">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset filters
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={!hasReport}
          onClick={onPrint}
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print / Save PDF
        </button>
        <button
          type="button"
          className={cn('btn btn-primary btn-sm', isRunning && 'btn-disabled')}
          disabled={isRunDisabled}
          onClick={onRun}
        >
          {isRunning ? (
            <span className="loading loading-spinner loading-xs" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          Run report
        </button>
      </div>
    </div>
  )
}
