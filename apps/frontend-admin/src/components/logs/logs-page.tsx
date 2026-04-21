'use client'

import { useEffect } from 'react'
import { Activity, Cable, PauseCircle, PlayCircle, Search, ShieldAlert, Trash2 } from 'lucide-react'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppBadge, type AppBadgeStatus } from '@/components/ui/AppBadge'
import { EmptyState } from '@/components/ui/empty-state'
import { Chip, type ChipColor } from '@/components/ui/chip'
import {
  DEFAULT_LOG_FILTERS,
  LOG_STREAM_LEVELS,
  type LogStreamLevel,
  useFilteredLogs,
  useLogStats,
  useLogViewer,
  useLogViewerStore,
} from '@/hooks/use-log-viewer'
import { TID } from '@/lib/test-ids'
import { cn } from '@/lib/utils'
import { AccountLevel, useAuthStore } from '@/store/auth-store'

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: '2-digit',
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

function getLevelStatus(level: string): AppBadgeStatus {
  switch (level) {
    case 'error':
      return 'error'
    case 'warn':
      return 'warning'
    case 'info':
    case 'http':
      return 'info'
    default:
      return 'neutral'
  }
}

function getLevelChipColor(level: string): ChipColor {
  switch (level) {
    case 'error':
      return 'error'
    case 'warn':
      return 'warning'
    case 'info':
    case 'http':
      return 'info'
    case 'verbose':
      return 'secondary'
    case 'debug':
      return 'accent'
    case 'silly':
      return 'neutral'
    default:
      return 'default'
  }
}

function describeConnection(
  isConnected: boolean,
  isPaused: boolean
): {
  cardStatus: AppBadgeStatus
  label: string
  detail: string
} {
  if (!isConnected) {
    return {
      cardStatus: 'error',
      label: 'Disconnected',
      detail: 'Waiting for a live socket connection to the backend.',
    }
  }

  if (isPaused) {
    return {
      cardStatus: 'warning',
      label: 'Paused',
      detail: 'Incoming entries are buffered locally until you resume.',
    }
  }

  return {
    cardStatus: 'success',
    label: 'Streaming',
    detail: 'Live entries are flowing into the viewer.',
  }
}

function renderMetadata(metadata: Record<string, unknown> | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return 'No structured metadata'
  }

  return JSON.stringify(metadata, null, 2)
}

function LogsPageContent() {
  const member = useAuthStore((state) => state.member)
  const canAccessLogs = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN

  useLogViewer(canAccessLogs)

  const logs = useFilteredLogs()
  const stats = useLogStats()
  const allLogs = useLogViewerStore((state) => state.logs)
  const filters = useLogViewerStore((state) => state.filters)
  const isConnected = useLogViewerStore((state) => state.isConnected)
  const isPaused = useLogViewerStore((state) => state.isPaused)
  const bufferedEntries = useLogViewerStore((state) => state.bufferedEntries)
  const selectedLogId = useLogViewerStore((state) => state.selectedLogId)
  const streamLevel = useLogViewerStore((state) => state.streamLevel)
  const setFilter = useLogViewerStore((state) => state.setFilter)
  const clearLogs = useLogViewerStore((state) => state.clearLogs)
  const togglePause = useLogViewerStore((state) => state.togglePause)
  const setSelectedLogId = useLogViewerStore((state) => state.setSelectedLogId)
  const setStreamLevel = useLogViewerStore((state) => state.setStreamLevel)

  const modules = [...new Set(allLogs.flatMap((log) => (log.module ? [log.module] : [])))].sort(
    (left, right) => left.localeCompare(right)
  )
  const selectedLog =
    logs.find((entry) => entry.id === selectedLogId) ??
    allLogs.find((entry) => entry.id === selectedLogId) ??
    null
  const connection = describeConnection(isConnected, isPaused)

  useEffect(() => {
    if (!canAccessLogs) {
      if (selectedLogId !== null) {
        setSelectedLogId(null)
      }
      return
    }

    if (logs.length === 0) {
      if (selectedLogId !== null) {
        setSelectedLogId(null)
      }
      return
    }

    if (!selectedLogId || !logs.some((entry) => entry.id === selectedLogId)) {
      setSelectedLogId(logs[0]?.id ?? null)
    }
  }, [canAccessLogs, logs, selectedLogId, setSelectedLogId])

  if (!canAccessLogs) {
    return (
      <div className="space-y-(--space-4)">
        <div>
          <h1 className="text-3xl font-semibold">Logs</h1>
          <p className="mt-(--space-1) max-w-3xl text-sm text-base-content/70">
            Live operational log viewer for short-horizon incident triage and correlation-driven
            debugging.
          </p>
        </div>

        <AppCard status="warning">
          <AppCardContent className="p-(--space-6)">
            <EmptyState
              icon={ShieldAlert}
              title="Admin access required"
              description="The live logs viewer is restricted to admin and developer accounts because it can expose operational diagnostics and sensitive context."
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
          <h1 className="text-3xl font-semibold">Logs</h1>
          <p className="mt-(--space-1) max-w-3xl text-sm text-base-content/70">
            Filter by severity, module, search terms, and correlation IDs before broad scans. This
            viewer uses live socket updates plus a short in-memory history buffer from the backend.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-(--space-2)">
          <AppBadge status={connection.cardStatus}>{connection.label}</AppBadge>
          {isPaused && bufferedEntries.length > 0 ? (
            <AppBadge status="warning">{bufferedEntries.length} buffered</AppBadge>
          ) : null}
          <AppBadge status="info">Level {streamLevel}</AppBadge>
        </div>
      </div>

      <section className="grid gap-(--space-4) md:grid-cols-2 xl:grid-cols-4">
        <AppCard status={connection.cardStatus} variant="elevated">
          <AppCardHeader>
            <AppCardTitle className="flex items-center gap-(--space-2)">
              <Cable className="h-4 w-4" />
              Connection
            </AppCardTitle>
            <AppCardDescription>{connection.detail}</AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold">{connection.label}</p>
          </AppCardContent>
        </AppCard>

        <AppCard status="info">
          <AppCardHeader>
            <AppCardTitle className="flex items-center gap-(--space-2)">
              <Activity className="h-4 w-4" />
              Live rate
            </AppCardTitle>
            <AppCardDescription>
              Average events per second across the visible stream.
            </AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold">{stats.rate.toFixed(1)}/s</p>
            <p className="mt-(--space-1) text-xs text-base-content/70">
              {stats.total} retained entries in memory
            </p>
          </AppCardContent>
        </AppCard>

        <AppCard status={stats.errors > 0 ? 'error' : 'neutral'}>
          <AppCardHeader>
            <AppCardTitle>Errors</AppCardTitle>
            <AppCardDescription>
              Critical entries that usually need immediate triage.
            </AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold">{stats.errors}</p>
            <p className="mt-(--space-1) text-xs text-base-content/70">
              {stats.warnings} warnings currently retained
            </p>
          </AppCardContent>
        </AppCard>

        <AppCard status="neutral">
          <AppCardHeader>
            <AppCardTitle>Viewer state</AppCardTitle>
            <AppCardDescription>
              Entries that match the active filters in this session.
            </AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="pt-0">
            <p className="text-2xl font-semibold">{logs.length}</p>
            <p className="mt-(--space-1) text-xs text-base-content/70">
              {filters.levels.length} level filters, {filters.modules.length} module filters
            </p>
          </AppCardContent>
        </AppCard>
      </section>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle>Viewer controls</AppCardTitle>
          <AppCardDescription>
            Pause the live stream when bursts get noisy, or narrow scope before searching.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="space-y-(--space-4)">
          <div className="grid gap-(--space-3) xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_12rem_auto]">
            <label className="form-control w-full">
              <span className="mb-(--space-1) text-xs font-medium uppercase tracking-wide text-base-content/65">
                Search
              </span>
              <div className="input input-bordered input-sm flex items-center gap-(--space-2)">
                <Search className="h-4 w-4 text-base-content/50" />
                <input
                  type="text"
                  className="grow"
                  placeholder="Message or metadata"
                  value={filters.search}
                  onChange={(event) => setFilter({ search: event.target.value })}
                  data-testid={TID.logs.search}
                />
              </div>
            </label>

            <label className="form-control w-full">
              <span className="mb-(--space-1) text-xs font-medium uppercase tracking-wide text-base-content/65">
                Correlation ID
              </span>
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                placeholder="Filter a related incident chain"
                value={filters.correlationId}
                onChange={(event) => setFilter({ correlationId: event.target.value })}
              />
            </label>

            <label className="form-control w-full">
              <span className="mb-(--space-1) text-xs font-medium uppercase tracking-wide text-base-content/65">
                Stream level
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={streamLevel}
                onChange={(event) => setStreamLevel(event.target.value as LogStreamLevel)}
                data-testid={TID.logs.streamLevel}
              >
                {LOG_STREAM_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-(--space-2)">
              <button
                type="button"
                className={cn('btn btn-sm', isPaused ? 'btn-warning' : 'btn-outline')}
                onClick={() => togglePause()}
                data-testid={TID.logs.pauseResumeBtn}
              >
                {isPaused ? (
                  <PlayCircle className="h-4 w-4" />
                ) : (
                  <PauseCircle className="h-4 w-4" />
                )}
                {isPaused ? 'Resume stream' : 'Pause stream'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setFilter({ ...DEFAULT_LOG_FILTERS })}
                data-testid={TID.logs.clearFiltersBtn}
              >
                Clear filters
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => clearLogs()}
                data-testid={TID.logs.clearLogsBtn}
              >
                <Trash2 className="h-4 w-4" />
                Clear history
              </button>
            </div>
          </div>

          <div className="space-y-(--space-3)">
            <div className="space-y-(--space-2)">
              <div className="flex flex-wrap items-center gap-(--space-2)">
                <p className="text-xs font-medium uppercase tracking-wide text-base-content/65">
                  Level filters
                </p>
                <p className="text-xs text-base-content/55">
                  Narrow to the severity band you want to investigate.
                </p>
              </div>
              <div className="flex flex-wrap gap-(--space-2)">
                {LOG_STREAM_LEVELS.map((level) => {
                  const isActive = filters.levels.includes(level)

                  return (
                    <button
                      key={level}
                      type="button"
                      className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      aria-pressed={isActive}
                      onClick={() =>
                        setFilter({
                          levels: isActive
                            ? filters.levels.filter((value) => value !== level)
                            : [...filters.levels, level],
                        })
                      }
                      data-testid={TID.logs.levelToggle(level)}
                    >
                      <Chip
                        color={getLevelChipColor(level)}
                        variant={isActive ? 'soft' : 'bordered'}
                        size="sm"
                        showDot
                      >
                        {level}
                      </Chip>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-(--space-2)">
              <div className="flex flex-wrap items-center gap-(--space-2)">
                <p className="text-xs font-medium uppercase tracking-wide text-base-content/65">
                  Module filters
                </p>
                <p className="text-xs text-base-content/55">
                  Use modules to isolate a subsystem before broad search terms.
                </p>
              </div>
              <div className="flex flex-wrap gap-(--space-2)">
                {modules.length > 0 ? (
                  modules.map((moduleName) => {
                    const isActive = filters.modules.includes(moduleName)

                    return (
                      <button
                        key={moduleName}
                        type="button"
                        className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        aria-pressed={isActive}
                        onClick={() =>
                          setFilter({
                            modules: isActive
                              ? filters.modules.filter((value) => value !== moduleName)
                              : [...filters.modules, moduleName],
                          })
                        }
                        data-testid={TID.logs.moduleToggle(moduleName)}
                      >
                        <Chip variant={isActive ? 'soft' : 'bordered'} size="sm">
                          {moduleName}
                        </Chip>
                      </button>
                    )
                  })
                ) : (
                  <p className="text-sm text-base-content/55">
                    Module chips will appear once the stream includes named subsystems.
                  </p>
                )}
              </div>
            </div>
          </div>
        </AppCardContent>
      </AppCard>

      <div className="grid gap-(--space-4) xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
        <AppCard className="overflow-hidden">
          <AppCardHeader>
            <AppCardTitle>Live entries</AppCardTitle>
            <AppCardDescription>
              Select a row to inspect stack traces, correlation IDs, and metadata.
            </AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="min-h-0 p-0">
            {logs.length > 0 ? (
              <div className="max-h-[65vh] overflow-auto">
                <table className="table table-pin-rows table-sm" data-testid={TID.logs.table}>
                  <thead className="bg-base-200 text-xs uppercase tracking-wide text-base-content/65">
                    <tr>
                      <th>Time</th>
                      <th>Level</th>
                      <th>Module</th>
                      <th>Message</th>
                      <th>Correlation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((entry) => {
                      const isSelected = entry.id === selectedLog?.id

                      return (
                        <tr
                          key={entry.id}
                          className={cn(
                            'cursor-pointer align-top transition-colors',
                            isSelected
                              ? 'bg-primary-fadded text-primary-fadded-content'
                              : 'hover:bg-base-200/70'
                          )}
                          onClick={() => setSelectedLogId(entry.id)}
                          data-testid={TID.logs.row}
                        >
                          <td className="font-mono text-xs whitespace-nowrap">
                            {formatTimestamp(entry.timestamp)}
                          </td>
                          <td>
                            <AppBadge status={getLevelStatus(entry.level)} size="sm">
                              {entry.level}
                            </AppBadge>
                          </td>
                          <td className="font-mono text-xs text-base-content/70">
                            {entry.module ?? 'system'}
                          </td>
                          <td className="max-w-xl">
                            <div className="line-clamp-2 text-sm leading-snug">{entry.message}</div>
                          </td>
                          <td className="font-mono text-xs text-base-content/70">
                            {entry.correlationId ? (
                              <span className="truncate">{entry.correlationId}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-(--space-6)">
                <EmptyState
                  icon={Activity}
                  title="No matching logs"
                  description="Adjust the filters or wait for the live stream to deliver the next entries."
                />
              </div>
            )}
          </AppCardContent>
        </AppCard>

        <AppCard className="overflow-hidden">
          <AppCardHeader>
            <AppCardTitle>Selected entry</AppCardTitle>
            <AppCardDescription>
              Use this panel for full message context, stack traces, and structured metadata.
            </AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="space-y-(--space-4)">
            {selectedLog ? (
              <>
                <div className="flex flex-wrap items-center gap-(--space-2)">
                  <AppBadge status={getLevelStatus(selectedLog.level)}>
                    {selectedLog.level}
                  </AppBadge>
                  <Chip variant="soft" size="sm">
                    {selectedLog.module ?? 'system'}
                  </Chip>
                  {selectedLog.correlationId ? (
                    <Chip variant="bordered" size="sm">
                      {selectedLog.correlationId}
                    </Chip>
                  ) : null}
                </div>

                <div className="space-y-(--space-2)">
                  <div className="rounded-box border border-base-300 bg-base-200 p-(--space-3)">
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/65">
                      Message
                    </p>
                    <p className="mt-(--space-2) text-sm leading-relaxed">{selectedLog.message}</p>
                  </div>

                  <dl className="grid gap-(--space-2) sm:grid-cols-2">
                    <div className="rounded-box border border-base-300 bg-base-100 p-(--space-3)">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/65">
                        Timestamp
                      </dt>
                      <dd className="mt-(--space-1) font-mono text-xs">
                        {formatDateTime(selectedLog.timestamp)}
                      </dd>
                    </div>
                    <div className="rounded-box border border-base-300 bg-base-100 p-(--space-3)">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/65">
                        User ID
                      </dt>
                      <dd className="mt-(--space-1) font-mono text-xs">
                        {selectedLog.userId ?? 'Unavailable'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-(--space-2)">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/65">
                      Metadata
                    </p>
                    <pre className="mt-(--space-2) overflow-auto rounded-box border border-base-300 bg-base-100 p-(--space-3) text-xs leading-relaxed text-base-content/80">
                      {renderMetadata(selectedLog.metadata)}
                    </pre>
                  </div>

                  {selectedLog.stack ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-base-content/65">
                        Stack trace
                      </p>
                      <pre className="mt-(--space-2) overflow-auto rounded-box border border-base-300 bg-base-100 p-(--space-3) text-xs leading-relaxed text-base-content/80">
                        {selectedLog.stack}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <EmptyState
                icon={Cable}
                title="Select a log entry"
                description="Click an entry in the table to inspect its complete details."
                className="py-(--space-10)"
              />
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
