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
        <div className="flex flex-wrap items-center gap-(--space-2)">
          <AppBadge status="info">Latest {entries.length}</AppBadge>
          <AppBadge status="info">15s refresh</AppBadge>
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
        <AppCard status="info" variant="elevated">
          <AppCardHeader>
            <AppCardTitle className="flex items-center gap-(--space-2)">
              <Activity className="h-4 w-4" />
              Visible events
            </AppCardTitle>
            <AppCardDescription>Rows matching the current filters.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold">{filteredEntries.length}</p>
            <p className="mt-(--space-1) text-xs text-base-content/70">
              {data?.total ?? 0} total audited rows available
            </p>
          </AppCardContent>
        </AppCard>

        <AppCard status="info">
          <AppCardHeader>
            <AppCardTitle>Attendance</AppCardTitle>
            <AppCardDescription>Scans, manual attendance, and checkout edits.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold">{attendanceCount}</p>
          </AppCardContent>
        </AppCard>

        <AppCard status="neutral">
          <AppCardHeader>
            <AppCardTitle>Profiles & settings</AppCardTitle>
            <AppCardDescription>Members, badges, and configuration changes.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold">{profileCount}</p>
          </AppCardContent>
        </AppCard>

        <AppCard status="warning">
          <AppCardHeader>
            <AppCardTitle>DDS & lockup</AppCardTitle>
            <AppCardDescription>Responsibility changes that affect operations.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold">{responsibilityCount}</p>
          </AppCardContent>
        </AppCard>
      </section>

      <div className="grid gap-(--space-4) xl:grid-cols-[minmax(0,2.1fr)_minmax(24rem,1fr)]">
        <AppCard status="info">
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
                {AREA_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setAreaFilter(option.value)
                    }}
                  >
                    <Chip
                      color={option.color}
                      variant={areaFilter === option.value ? 'solid' : 'soft'}
                    >
                      {option.label}
                    </Chip>
                  </button>
                ))}
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
                    {filteredEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className={cn(
                          'cursor-pointer border-base-300/60 transition-colors',
                          selectedEntry?.id === entry.id
                            ? 'bg-info-fadded text-info-fadded-content'
                            : 'hover:bg-base-200'
                        )}
                        onClick={() => {
                          setSelectedEntryId(entry.id)
                        }}
                      >
                        <td className="font-mono text-xs">{formatTimestamp(entry.timestamp)}</td>
                        <td>
                          <Chip color={getAreaColor(entry.area)} variant="soft" size="sm">
                            {getAreaLabel(entry.area)}
                          </Chip>
                        </td>
                        <td className="font-medium">{entry.actionLabel}</td>
                        <td>{entry.actorName}</td>
                        <td>{entry.subjectLabel}</td>
                        <td className="max-w-[28rem] truncate">{entry.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AppCardContent>
        </AppCard>

        <AppCard status={selectedEntry ? 'info' : 'neutral'}>
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
                    <AppBadge status="info">{selectedEntry.actionLabel}</AppBadge>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{selectedEntry.subjectLabel}</p>
                    <p className="text-sm text-base-content/70">{selectedEntry.summary}</p>
                  </div>
                </div>

                <div className="grid gap-(--space-3) text-sm sm:grid-cols-2">
                  <div className="rounded-none bg-base-200 p-(--space-3)">
                    <p className="text-xs uppercase tracking-[0.08em] text-base-content/60">
                      Actor
                    </p>
                    <p className="mt-(--space-1) font-medium">{selectedEntry.actorName}</p>
                  </div>
                  <div className="rounded-none bg-base-200 p-(--space-3)">
                    <p className="text-xs uppercase tracking-[0.08em] text-base-content/60">
                      Logged at
                    </p>
                    <p className="mt-(--space-1) font-medium">
                      {formatDateTime(selectedEntry.timestamp)}
                    </p>
                  </div>
                  <div className="rounded-none bg-base-200 p-(--space-3)">
                    <p className="text-xs uppercase tracking-[0.08em] text-base-content/60">
                      Action code
                    </p>
                    <p className="mt-(--space-1) font-mono text-xs">{selectedEntry.raw.action}</p>
                  </div>
                  <div className="rounded-none bg-base-200 p-(--space-3)">
                    <p className="text-xs uppercase tracking-[0.08em] text-base-content/60">
                      Entity type
                    </p>
                    <p className="mt-(--space-1) font-mono text-xs">
                      {selectedEntry.raw.entityType}
                    </p>
                  </div>
                </div>

                <div className="space-y-(--space-2)">
                  <p className="text-xs uppercase tracking-[0.08em] text-base-content/60">
                    Structured details
                  </p>
                  <pre className="max-h-[32rem] overflow-auto rounded-none bg-base-200 p-(--space-3) text-xs leading-6 text-base-content/80">
                    {renderDetails(selectedEntry.raw.details)}
                  </pre>
                </div>
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
