'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, FileText, Play, Plus, Printer, RotateCcw, X } from 'lucide-react'
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
  type DailyPresenceSortRule,
  type ReportFilters,
  type ReportScopeType,
} from './report-definitions'
import { ReportPreview } from './report-preview'

const SENTINEL_BOOTSTRAP_SERVICE_NUMBER = 'SENTINEL-SYSTEM'

function optionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function scopeRequiresDepartment(scopeType: ReportScopeType): boolean {
  return scopeType === 'department'
}

function scopeRequiresTag(scopeType: ReportScopeType): boolean {
  return scopeType === 'tag'
}

function createDailyPresenceSortRuleId(): string {
  return `daily-sort-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function toDailyPresenceSortCriteria(rules: DailyPresenceSortRule[]): DailyPresenceSortCriterion[] {
  const criteria: DailyPresenceSortCriterion[] = []

  for (const rule of rules) {
    if (rule.type === 'tag') {
      if (rule.tagId) {
        criteria.push({ type: 'tag', tagId: rule.tagId, direction: rule.direction })
      }
      continue
    }

    criteria.push({ type: 'field', field: rule.field, direction: rule.direction })
  }

  return criteria
}

function buildRunInput(filters: ReportFilters): RunAdminReportInput {
  const scopeType = filters.scopeType
  const divisionId = scopeRequiresDepartment(scopeType)
    ? optionalString(filters.divisionId)
    : undefined
  const tagId = scopeRequiresTag(scopeType) ? optionalString(filters.tagId) : undefined

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
          divisionId,
          tagId,
        },
      }
    case 'monthly_presence':
      return {
        reportType: 'monthly_presence',
        body: {
          month: filters.month,
          scopeType,
          divisionId,
          tagId,
        },
      }
    case 'training_night_monthly':
      return {
        reportType: 'training_night_monthly',
        body: {
          month: filters.month,
          divisionId: filters.divisionId,
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
  const shortcutWarning =
    filters.scopeType === 'fts' && !ftsTag
      ? 'FTS tag was not found. The shortcut is disabled until the tag exists.'
      : filters.scopeType === 'geo' && !geoTag
        ? 'GEO tag was not found. The shortcut is disabled until the tag exists.'
        : null

  const validationMessages = useMemo(() => {
    const messages: string[] = []
    for (const key of definition.requiredFilters) {
      if (!filters[key]) {
        messages.push(`Select ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}.`)
      }
    }

    if (scopeRequiresDepartment(filters.scopeType) && !filters.divisionId) {
      messages.push('Select a department for the department scope.')
    }

    if (scopeRequiresTag(filters.scopeType) && !filters.tagId) {
      messages.push('Select a tag for the specific tag scope.')
    }

    if (
      filters.reportType === 'daily_presence' &&
      filters.dailyPresenceSort.some((rule) => rule.type === 'tag' && !rule.tagId)
    ) {
      messages.push('Select a tag for each tag sort rule.')
    }

    if (shortcutWarning) {
      messages.push(shortcutWarning)
    }

    return messages
  }, [definition.requiredFilters, filters, shortcutWarning])

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
    const report = await reportRunner.mutateAsync(buildRunInput(filters))
    setLastReport(report)
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
              shortcutWarning={shortcutWarning}
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
  shortcutWarning,
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
  shortcutWarning: string | null
}) {
  const definition = getReportDefinition(filters.reportType)
  const visible = new Set(definition.visibleFilters)
  const showScope = visible.has('scopeType')
  const showDepartment =
    visible.has('divisionId') &&
    (filters.reportType === 'training_night_monthly' || filters.scopeType === 'department')
  const showTag = visible.has('tagId') && filters.scopeType === 'tag'
  const showDailyPresenceSort = visible.has('dailyPresenceSort')

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
          <select
            className="select select-bordered w-full"
            value={filters.scopeType}
            onChange={(event) =>
              updateFilters({
                scopeType: event.target.value as ReportScopeType,
                divisionId: '',
                tagId: '',
              })
            }
          >
            <option value="everyone">Everyone</option>
            <option value="department">Department</option>
            <option value="tag">Specific tag</option>
            <option value="fts">FTS tag shortcut</option>
            <option value="geo">GEO tag shortcut</option>
          </select>
          {shortcutWarning && (
            <span className="label pt-(--space-1)">
              <span className="label-text-alt text-warning-fadded-content">{shortcutWarning}</span>
            </span>
          )}
        </label>
      )}
      {showDepartment && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Department</span>
          </span>
          <select
            className="select select-bordered w-full"
            value={filters.divisionId}
            onChange={(event) => updateFilters({ divisionId: event.target.value })}
          >
            <option value="">Select department</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.code} — {division.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {showTag && (
        <label className="form-control w-full">
          <span className="label pb-(--space-1)">
            <span className="label-text font-semibold">Tag</span>
          </span>
          <select
            className="select select-bordered w-full"
            value={filters.tagId}
            onChange={(event) => updateFilters({ tagId: event.target.value })}
          >
            <option value="">Select tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {showDailyPresenceSort && (
        <div className="md:col-span-2 xl:col-span-3">
          <DailyPresenceSortBuilder
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

const DAILY_PRESENCE_FIELD_OPTIONS: Array<{
  value: Extract<DailyPresenceSortCriterion, { type: 'field' }>['field']
  label: string
}> = [
  { value: 'last_name', label: 'Last name' },
  { value: 'first_name', label: 'First name' },
  { value: 'department', label: 'Department' },
  { value: 'first_in', label: 'First in' },
  { value: 'last_out', label: 'Last out' },
  { value: 'sessions', label: 'Sessions' },
]

function DailyPresenceSortBuilder({
  rules,
  tags,
  onChange,
}: {
  rules: DailyPresenceSortRule[]
  tags: Array<{ id: string; name: string }>
  onChange: (rules: DailyPresenceSortRule[]) => void
}) {
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

  function moveRule(ruleId: string, direction: -1 | 1) {
    const currentIndex = rules.findIndex((rule) => rule.id === ruleId)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= rules.length) {
      return
    }

    const nextRules = [...rules]
    const [rule] = nextRules.splice(currentIndex, 1)
    if (!rule) {
      return
    }
    nextRules.splice(nextIndex, 0, rule)
    onChange(nextRules)
  }

  function removeRule(ruleId: string) {
    onChange(rules.filter((rule) => rule.id !== ruleId))
  }

  function addTagRule() {
    const tag = tags[0]
    if (!tag) {
      return
    }

    const nextRule: DailyPresenceSortRule = {
      id: createDailyPresenceSortRuleId(),
      type: 'tag',
      tagId: tag.id,
      direction: 'asc',
    }
    const firstFieldIndex = rules.findIndex((rule) => rule.type === 'field')

    if (firstFieldIndex === -1) {
      onChange([...rules, nextRule])
      return
    }

    onChange([...rules.slice(0, firstFieldIndex), nextRule, ...rules.slice(firstFieldIndex)])
  }

  function addFieldRule() {
    onChange([
      ...rules,
      {
        id: createDailyPresenceSortRuleId(),
        type: 'field',
        field: 'last_name',
        direction: 'asc',
      },
    ])
  }

  return (
    <fieldset className="rounded-box border border-base-300 bg-base-200/45 p-(--space-3)">
      <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
        <div>
          <legend className="font-semibold">Sort order</legend>
          <p className="mt-(--space-1) text-sm text-base-content/65">
            Rules run from top to bottom. Add tag priorities first, then a name or time field.
          </p>
        </div>
        <div className="flex flex-wrap gap-(--space-2)">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={addTagRule}
            disabled={tags.length === 0}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tag priority
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={addFieldRule}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Field sort
          </button>
        </div>
      </div>

      <div className="mt-(--space-3) space-y-(--space-2)">
        {rules.length === 0 ? (
          <p className="rounded-box border border-dashed border-base-300 bg-base-100 p-(--space-3) text-sm text-base-content/60">
            No custom sort rules. The report will use the backend default order.
          </p>
        ) : (
          rules.map((rule, index) => (
            <div
              key={rule.id}
              className="grid items-center gap-(--space-2) rounded-box border border-base-300 bg-base-100 p-(--space-2) md:grid-cols-[2rem_8rem_minmax(0,1fr)_8rem_auto]"
            >
              <span className="text-center text-xs font-semibold text-base-content/55">
                {index + 1}
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={rule.type}
                onChange={(event) => {
                  if (event.target.value === 'tag') {
                    const tag = tags[0]
                    if (!tag) return
                    replaceRule(rule.id, {
                      id: rule.id,
                      type: 'tag',
                      tagId: tag.id,
                      direction: 'asc',
                    })
                    return
                  }

                  replaceRule(rule.id, {
                    id: rule.id,
                    type: 'field',
                    field: 'last_name',
                    direction: 'asc',
                  })
                }}
              >
                <option value="tag">Tag</option>
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
              ) : (
                <select
                  className="select select-bordered select-sm w-full"
                  value={rule.field}
                  onChange={(event) =>
                    updateFieldRule(rule.id, {
                      field: event.target.value as Extract<
                        DailyPresenceSortCriterion,
                        { type: 'field' }
                      >['field'],
                    })
                  }
                >
                  {DAILY_PRESENCE_FIELD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              <select
                className="select select-bordered select-sm w-full"
                value={rule.direction}
                onChange={(event) =>
                  rule.type === 'tag'
                    ? updateTagRule(rule.id, {
                        direction: event.target.value as DailyPresenceSortCriterion['direction'],
                      })
                    : updateFieldRule(rule.id, {
                        direction: event.target.value as DailyPresenceSortCriterion['direction'],
                      })
                }
              >
                <option value="asc">{rule.type === 'tag' ? 'First' : 'A to Z'}</option>
                <option value="desc">{rule.type === 'tag' ? 'Last' : 'Z to A'}</option>
              </select>

              <div className="flex items-center justify-end gap-(--space-1)">
                <button
                  type="button"
                  className="btn btn-ghost btn-square btn-sm"
                  onClick={() => moveRule(rule.id, -1)}
                  disabled={index === 0}
                  aria-label="Move sort rule up"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-square btn-sm"
                  onClick={() => moveRule(rule.id, 1)}
                  disabled={index === rules.length - 1}
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
          ))
        )}
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
