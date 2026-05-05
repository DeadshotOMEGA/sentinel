'use client'

import { useDeferredValue, useEffect, useState } from 'react'
import { Activity, RefreshCw, ShieldAlert } from 'lucide-react'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/loading-skeleton'
import { Chip, type ChipColor } from '@/components/ui/chip'
import {
  useAuditActivityFeed,
  type ActivityArea,
  type ActivityEntry,
} from '@/hooks/use-audit-activity'
import { cn } from '@/lib/utils'
import { AccountLevel, useAuthStore } from '@/store/auth-store'

const AREA_OPTIONS: Array<{
  value: 'all' | ActivityArea
  label: string
  color: ChipColor
}> = [
  { value: 'all', label: 'All', color: 'default' },
  { value: 'attendance', label: 'Attendance', color: 'blue' },
  { value: 'members', label: 'Members', color: 'green' },
  { value: 'badges', label: 'Badges', color: 'yellow' },
  { value: 'settings', label: 'Settings', color: 'cyan' },
  { value: 'responsibility', label: 'DDS & lockup', color: 'red' },
  { value: 'access', label: 'Access', color: 'neutral' },
  { value: 'admin', label: 'Admin', color: 'neutral' },
]

type InspectionRowTone = 'default' | 'mono' | 'muted'

interface InspectionRow {
  label: string
  value: string
  tone?: InspectionRowTone
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function getAreaLabel(area: ActivityArea): string {
  return AREA_OPTIONS.find((option) => option.value === area)?.label ?? area
}

function getAreaColor(area: ActivityArea): ChipColor {
  return AREA_OPTIONS.find((option) => option.value === area)?.color ?? 'default'
}

function formatEntityType(value: string): string {
  if (!value) {
    return 'Not recorded'
  }

  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getDetailValue(details: Record<string, unknown> | null, keys: string[]): string | null {
  if (!details) {
    return null
  }

  for (const key of keys) {
    const value = details[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return null
}

function looksTechnicalValue(value: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value) ||
    /^[a-z0-9_.:-]{14,}$/i.test(value) ||
    value.includes('_')
  )
}

function buildInspectionRows(entry: ActivityEntry): InspectionRow[] {
  const details = entry.raw.details ?? null
  const remoteSystem =
    getDetailValue(details, ['remoteSystemName', 'remoteSystemCode', 'kioskId']) ?? null
  const serviceNumber =
    getDetailValue(details, ['actorServiceNumber', 'serviceNumber', 'memberServiceNumber']) ?? null
  const reason = getDetailValue(details, ['reason', 'editReason', 'purposeDetails']) ?? null
  const rows: InspectionRow[] = [
    { label: 'Actor', value: entry.actorName },
    { label: 'Action', value: entry.actionLabel },
    {
      label: 'Subject / entity',
      value: entry.subjectLabel || entry.raw.entityType || 'Not recorded',
      tone: looksTechnicalValue(entry.subjectLabel) ? 'mono' : 'default',
    },
    { label: 'Logged at', value: formatDateTime(entry.timestamp) },
    { label: 'Area', value: getAreaLabel(entry.area) },
    { label: 'Entity type', value: formatEntityType(entry.raw.entityType) },
  ]

  if (remoteSystem) {
    rows.push({ label: 'Remote system / location', value: remoteSystem })
  }

  if (serviceNumber) {
    rows.push({ label: 'Service number', value: serviceNumber, tone: 'mono' })
  }

  rows.push({ label: reason ? 'Reason' : 'Summary', value: reason ?? entry.summary })

  return rows
}

function renderDetails(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) {
    return 'No structured details'
  }

  return JSON.stringify(details, null, 2)
}

function matchesSearch(entry: ActivityEntry, search: string): boolean {
  if (!search) {
    return true
  }

  const haystack = [
    entry.actionLabel,
    entry.actorName,
    entry.subjectLabel,
    entry.summary,
    entry.raw.action,
    entry.raw.entityType,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(search)
}

function LogsPageContent() {
  const member = useAuthStore((state) => state.member)
  const canAccessLogs = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim().toLowerCase())
  const [areaFilter, setAreaFilter] = useState<'all' | ActivityArea>('all')
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const { data, error, isError, isFetching, isLoading, refetch } =
    useAuditActivityFeed(canAccessLogs)

  const entries = data?.entries ?? []
  const filteredEntries = entries.filter((entry) => {
    if (areaFilter !== 'all' && entry.area !== areaFilter) {
      return false
    }

    return matchesSearch(entry, deferredSearch)
  })
  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedEntryId) ??
    entries.find((entry) => entry.id === selectedEntryId) ??
    null

  const attendanceCount = filteredEntries.filter((entry) => entry.area === 'attendance').length
  const profileCount = filteredEntries.filter(
    (entry) => entry.area === 'members' || entry.area === 'badges' || entry.area === 'settings'
  ).length
  const responsibilityCount = filteredEntries.filter(
    (entry) => entry.area === 'responsibility'
  ).length
  const selectedInspectionRows = selectedEntry ? buildInspectionRows(selectedEntry) : []

  useEffect(() => {
    if (!canAccessLogs) {
      if (selectedEntryId !== null) {
        setSelectedEntryId(null)
      }
      return
    }

    if (filteredEntries.length === 0) {
      if (selectedEntryId !== null) {
        setSelectedEntryId(null)
      }
      return
    }

    if (!selectedEntryId || !filteredEntries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(filteredEntries[0]?.id ?? null)
    }
  }, [canAccessLogs, filteredEntries, selectedEntryId])

  if (!canAccessLogs) {
    return (
      <div className="space-y-(--space-4)">
        <div>
          <h1 id="admin-page-title" className="text-3xl font-semibold">
            Activity log
          </h1>
          <p className="mt-(--space-1) max-w-3xl text-sm text-base-content/70">
            Recent admin actions, attendance scans, and responsibility handoffs.
          </p>
        </div>

        <AppCard status="warning">
          <AppCardContent className="p-(--space-6)">
            <EmptyState
              icon={ShieldAlert}
              title="Admin access required"
              description="The activity log is restricted to admin and developer accounts."
            />
          </AppCardContent>
        </AppCard>
      </div>
    )
  }

  return (
    <div className="space-y-(--space-4)">
      <div className="flex flex-wrap items-end justify-between gap-(--space-4)">
        <div>
          <h1 id="admin-page-title" className="text-3xl font-semibold">
            Activity log
          </h1>
          <p className="mt-(--space-1) max-w-3xl text-sm text-base-content/70">
            Recent admin actions, attendance scans, and responsibility handoffs. This view now
            prioritizes what operators actually do instead of backend socket noise.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-(--space-2) rounded-box border border-base-300 bg-base-100 px-(--space-2) py-(--space-2) shadow-[var(--shadow-1)]">
          <span className="rounded-box bg-base-200 px-(--space-2) py-1 text-xs font-medium text-base-content/70">
            Latest {entries.length}
          </span>
          <span className="rounded-box bg-base-200 px-(--space-2) py-1 text-xs font-medium text-base-content/70">
            Auto-refresh 15s
          </span>
          <AppBadge status={isFetching ? 'warning' : 'success'} pulse={isFetching}>
            {isFetching ? 'Refreshing' : 'Current'}
          </AppBadge>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              void refetch()
            }}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      <section className="grid gap-(--space-4) md:grid-cols-2 xl:grid-cols-4">
        <AppCard>
          <AppCardHeader>
            <AppCardTitle className="flex items-center gap-(--space-2) text-base">
              <Activity className="h-4 w-4 text-base-content/55" />
              Visible events
            </AppCardTitle>
            <AppCardDescription>Rows matching the current filters.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold text-base-content">{filteredEntries.length}</p>
            <p className="mt-(--space-1) text-xs text-base-content/70">
              {data?.total ?? 0} total audited rows available
            </p>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle className="text-base">Attendance</AppCardTitle>
            <AppCardDescription>Scans, manual attendance, and checkout edits.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold text-base-content">{attendanceCount}</p>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle className="text-base">Profiles & settings</AppCardTitle>
            <AppCardDescription>Members, badges, and configuration changes.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold text-base-content">{profileCount}</p>
          </AppCardContent>
        </AppCard>

        <AppCard status="warning">
          <AppCardHeader>
            <AppCardTitle className="text-base">DDS & lockup</AppCardTitle>
            <AppCardDescription>Responsibility changes that affect operations.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold text-base-content">{responsibilityCount}</p>
          </AppCardContent>
        </AppCard>
      </section>

      <div className="grid gap-(--space-4) xl:grid-cols-[minmax(0,2.1fr)_minmax(24rem,1fr)]">
        <AppCard>
          <AppCardHeader>
            <AppCardTitle>Recent activity</AppCardTitle>
            <AppCardDescription>
              Search across actors, subjects, actions, and summaries.
            </AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="space-y-(--space-4)">
            <div className="flex flex-wrap items-center gap-(--space-3)">
              <label className="input input-bordered flex min-w-[18rem] flex-1 items-center gap-(--space-2)">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-base-content/60">
                  Search
                </span>
                <input
                  type="text"
                  className="grow"
                  placeholder="Member, badge, setting, DDS, lockup..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                  }}
                />
              </label>
              <div className="flex flex-wrap gap-(--space-2)">
                {AREA_OPTIONS.map((option) => {
                  const isActive = areaFilter === option.value
                  const isResponsibility = option.value === 'responsibility'

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      onClick={() => {
                        setAreaFilter(option.value)
                      }}
                      aria-pressed={isActive}
                    >
                      <Chip
                        color={isActive ? option.color : isResponsibility ? 'yellow' : 'neutral'}
                        variant={isActive ? 'solid' : 'soft'}
                        className={!isActive && !isResponsibility ? 'text-base-content/65' : ''}
                      >
                        {option.label}
                      </Chip>
                    </button>
                  )
                })}
              </div>
            </div>

            {isLoading ? (
              <TableSkeleton rows={10} cols={6} />
            ) : isError ? (
              <EmptyState
                icon={ShieldAlert}
                title="Unable to load the activity log"
                description={
                  error instanceof Error ? error.message : 'The activity log could not be loaded.'
                }
              />
            ) : filteredEntries.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No matching activity"
                description="Try broadening the filters or clearing the search text."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.08em] text-base-content/60">
                      <th>Time</th>
                      <th>Area</th>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Subject</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => {
                      const isSelected = selectedEntry?.id === entry.id
                      const subjectIsTechnical = looksTechnicalValue(entry.subjectLabel)

                      return (
                        <tr
                          key={entry.id}
                          tabIndex={0}
                          aria-selected={isSelected}
                          className={cn(
                            'cursor-pointer border-base-300/60 text-base-content transition-colors duration-(--duration-fast) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
                            isSelected
                              ? 'border-l-2 border-l-primary bg-primary/10'
                              : 'border-l-2 border-l-transparent hover:bg-base-200/70'
                          )}
                          onClick={() => {
                            setSelectedEntryId(entry.id)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              setSelectedEntryId(entry.id)
                            }
                          }}
                        >
                          <td className="font-mono text-xs text-base-content/60">
                            {formatTimestamp(entry.timestamp)}
                          </td>
                          <td>
                            <Chip color={getAreaColor(entry.area)} variant="soft" size="sm">
                              {getAreaLabel(entry.area)}
                            </Chip>
                          </td>
                          <td className="font-medium text-base-content">{entry.actionLabel}</td>
                          <td className="max-w-[10rem] truncate text-base-content/70">
                            {entry.actorName}
                          </td>
                          <td
                            className={cn(
                              'max-w-[14rem] truncate text-base-content/65',
                              subjectIsTechnical && 'font-mono text-xs'
                            )}
                          >
                            {entry.subjectLabel}
                          </td>
                          <td className="max-w-[30rem] truncate text-sm font-medium text-base-content">
                            {entry.summary}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle>Selected activity</AppCardTitle>
            <AppCardDescription>
              Structured details for the currently highlighted entry.
            </AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="space-y-(--space-4)">
            {!selectedEntry ? (
              <EmptyState
                icon={Activity}
                title="Choose an activity row"
                description="Select an entry from the table to inspect its details."
              />
            ) : (
              <>
                <div className="space-y-(--space-3)">
                  <div className="flex flex-wrap items-center gap-(--space-2)">
                    <Chip color={getAreaColor(selectedEntry.area)} variant="soft">
                      {getAreaLabel(selectedEntry.area)}
                    </Chip>
                    <span className="rounded-box bg-base-200 px-(--space-2) py-1 text-xs font-semibold text-base-content/75">
                      {selectedEntry.actionLabel}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-base-content">
                      {selectedEntry.actorName}
                    </p>
                    <p className="mt-0.5 text-lg font-semibold leading-tight text-base-content">
                      {selectedEntry.subjectLabel}
                    </p>
                    <p className="mt-(--space-1) text-sm leading-5 text-base-content/70">
                      {selectedEntry.summary}
                    </p>
                  </div>
                </div>

                <section className="space-y-(--space-2)" aria-labelledby="activity-key-details">
                  <h2
                    id="activity-key-details"
                    className="text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55"
                  >
                    Key details
                  </h2>
                  <dl className="grid gap-(--space-2) text-sm sm:grid-cols-2">
                    {selectedInspectionRows.map((row) => (
                      <div
                        key={row.label}
                        className="min-w-0 border border-base-300 bg-base-200/55 p-(--space-3)"
                      >
                        <dt className="text-xs uppercase tracking-[0.08em] text-base-content/55">
                          {row.label}
                        </dt>
                        <dd
                          className={cn(
                            'mt-(--space-1) truncate font-medium text-base-content',
                            row.tone === 'mono' && 'font-mono text-xs text-base-content/70',
                            row.tone === 'muted' && 'text-base-content/65'
                          )}
                        >
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <details className="collapse collapse-arrow border border-base-300 bg-base-100">
                  <summary className="collapse-title min-h-0 py-(--space-3) text-sm font-semibold text-base-content">
                    Technical details
                  </summary>
                  <div className="collapse-content">
                    <pre className="max-h-[32rem] overflow-auto bg-base-200 p-(--space-3) text-xs leading-6 text-base-content/75">
                      {renderDetails(selectedEntry.raw.details)}
                    </pre>
                  </div>
                </details>
              </>
            )}
          </AppCardContent>
        </AppCard>
      </div>
    </div>
  )
}

export function LogsPage() {
  return <LogsPageContent />
}
