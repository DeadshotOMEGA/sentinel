'use client'

import type {
  DailyPresenceReportResponse,
  MonthlyPresenceReportResponse,
  OperationalExceptionsReportResponse,
  ReportMemberSummary,
  ReportTagSummary,
  TrainingNightMonthlyReportResponse,
  VisitorActivityReportResponse,
  WeeklyPresenceReportResponse,
} from '@sentinel/contracts'
import type { ReactNode } from 'react'
import { AlertTriangle, FileText } from 'lucide-react'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip, type ChipColor, type ChipVariant } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/loading-skeleton'
import type { AdminReportResponse } from '@/hooks/use-admin-reports'
import { cn } from '@/lib/utils'
import {
  formatBooleanPresence,
  formatDuration,
  formatPercent,
  formatReportDateTime,
  formatReportTime,
} from './report-formatters'

interface ReportPreviewProps {
  report: AdminReportResponse | null
  isLoading: boolean
  errorMessage: string | null
}

const CHIP_VARIANTS = new Set<ChipVariant>([
  'solid',
  'bordered',
  'light',
  'flat',
  'faded',
  'shadow',
  'dot',
  'soft',
])

const CHIP_COLORS = new Set<ChipColor>([
  'default',
  'neutral',
  'primary',
  'secondary',
  'accent',
  'success',
  'warning',
  'info',
  'error',
  'danger',
  'blue',
  'green',
  'pink',
  'purple',
  'red',
  'yellow',
  'cyan',
  'zinc',
])

export function ReportPreview({ report, isLoading, errorMessage }: ReportPreviewProps) {
  if (isLoading && !report) {
    return (
      <section className="reports-preview rounded-box border border-base-300 bg-base-100 shadow-[var(--shadow-1)]">
        <div className="border-b border-base-300 p-(--space-4)">
          <div className="h-6 w-64 skeleton" />
          <div className="mt-(--space-2) h-4 w-96 skeleton" />
        </div>
        <TableSkeleton rows={8} cols={5} />
      </section>
    )
  }

  if (errorMessage && !report) {
    return (
      <section className="rounded-box border border-error/35 bg-error-fadded p-(--space-6) text-error-fadded-content shadow-[var(--shadow-1)]">
        <div className="flex items-start gap-(--space-3)" role="alert">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Report could not be generated</h2>
            <p className="mt-(--space-1) text-sm">{errorMessage}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!report) {
    return (
      <section className="rounded-box border border-base-300 bg-base-100 shadow-[var(--shadow-1)]">
        <EmptyState
          icon={FileText}
          title="No report run yet"
          description="Choose a report type, set the filters, and run the report to preview it here."
        />
      </section>
    )
  }

  return (
    <ReportDocumentFrame report={report} isRefreshing={isLoading}>
      {report.reportType === 'daily_presence' && <DailyPresenceReport report={report} />}
      {report.reportType === 'weekly_presence' && <WeeklyPresenceReport report={report} />}
      {report.reportType === 'monthly_presence' && <MonthlyPresenceReport report={report} />}
      {report.reportType === 'training_night_monthly' && (
        <TrainingNightMonthlyReport report={report} />
      )}
      {report.reportType === 'visitor_activity' && <VisitorActivityReport report={report} />}
      {report.reportType === 'operational_exceptions' && (
        <OperationalExceptionsReport report={report} />
      )}
    </ReportDocumentFrame>
  )
}

function ReportDocumentFrame({
  report,
  isRefreshing,
  children,
}: {
  report: AdminReportResponse
  isRefreshing: boolean
  children: ReactNode
}) {
  const isMatrixReport =
    report.reportType === 'weekly_presence' ||
    report.reportType === 'monthly_presence' ||
    report.reportType === 'training_night_monthly' ||
    report.reportType === 'operational_exceptions'

  return (
    <section
      className={cn(
        'reports-print-document rounded-box border border-base-300 bg-base-100 shadow-[var(--shadow-1)]',
        isMatrixReport && 'reports-print-landscape'
      )}
      aria-live="polite"
    >
      <div className="border-b border-base-300 p-(--space-5)">
        <div className="flex flex-wrap items-start justify-between gap-(--space-4)">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
              {report.unitName}
            </p>
            <h2 className="mt-(--space-1) font-display text-2xl font-bold leading-tight">
              {report.title}
            </h2>
            <p className="mt-(--space-1) text-sm text-base-content/65">
              {report.dateRange.label} · {report.filters.scopeLabel}
            </p>
          </div>
          <dl className="grid gap-(--space-1) text-right text-xs text-base-content/65">
            <div>
              <dt className="font-semibold uppercase tracking-wide">Generated</dt>
              <dd className="font-mono">{formatReportDateTime(report.generatedAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide">By</dt>
              <dd>{report.generatedBy.displayName}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-(--space-4) flex flex-wrap gap-(--space-2) text-xs text-base-content/65">
          <span className="rounded-box bg-base-200 px-(--space-2) py-(--space-1)">
            {report.dateRange.startDate} to {report.dateRange.endDate}
          </span>
          {report.filters.divisionId && (
            <span className="rounded-box bg-base-200 px-(--space-2) py-(--space-1)">
              Department filter
            </span>
          )}
          {report.filters.tagId && (
            <span className="rounded-box bg-base-200 px-(--space-2) py-(--space-1)">
              Tag filter
            </span>
          )}
          {report.filters.visitorType && (
            <span className="rounded-box bg-base-200 px-(--space-2) py-(--space-1)">
              Visit type: {report.filters.visitorType}
            </span>
          )}
          {report.filters.visitorPurpose && (
            <span className="rounded-box bg-base-200 px-(--space-2) py-(--space-1)">
              Purpose: {report.filters.visitorPurpose}
            </span>
          )}
          {isRefreshing && (
            <AppBadge status="info" size="sm">
              Refreshing
            </AppBadge>
          )}
        </div>
      </div>

      {report.warnings.length > 0 && (
        <div
          className="mx-(--space-5) mt-(--space-4) rounded-box border border-warning/40 bg-warning-fadded p-(--space-3) text-sm text-warning-fadded-content"
          role="status"
        >
          <div className="flex items-start gap-(--space-2)">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Report warnings</p>
              <ul className="mt-(--space-1) list-disc space-y-1 pl-(--space-4)">
                {report.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="p-(--space-5)">{children}</div>
    </section>
  )
}

function SummaryGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <dl className="reports-summary-grid mb-(--space-4) grid grid-cols-2 gap-px overflow-hidden rounded-box border border-base-300 bg-base-300 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-base-100 p-(--space-3)">
          <dt className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
            {item.label}
          </dt>
          <dd className="mt-(--space-1) text-2xl font-bold">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function DailyPresenceReport({ report }: { report: DailyPresenceReportResponse }) {
  const { summary, rows } = report.data

  return (
    <>
      <SummaryGrid
        items={[
          { label: 'Present', value: summary.presentMembers },
          { label: 'Scoped members', value: summary.totalScopedMembers },
          { label: 'Sessions', value: summary.totalSessions },
          { label: 'Left and returned', value: summary.leftAndReturnedCount },
        ]}
      />

      {rows.length === 0 ? (
        <ReportEmptyMessage
          title="No attendance records"
          detail="No members matched the selected day and filters."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm reports-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Department</th>
                <th>Tags</th>
                <th>First in</th>
                <th>Last out</th>
                <th>Left / returned</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.member.id}>
                  <td>
                    <MemberName member={row.member} />
                  </td>
                  <td>{row.member.division?.code ?? row.member.division?.name ?? 'Unassigned'}</td>
                  <td>
                    <TagList tags={row.member.tags} />
                  </td>
                  <td className="font-mono">{formatReportTime(row.firstIn)}</td>
                  <td className="font-mono">
                    {row.lastOut ? formatReportTime(row.lastOut) : 'Still present'}
                  </td>
                  <td>
                    <AppBadge status={row.leftAndReturned ? 'warning' : 'neutral'} size="sm">
                      {row.leftAndReturned ? `Yes — ${row.sessionCount} sessions` : 'No'}
                    </AppBadge>
                  </td>
                  <td>
                    <details className="reports-screen-only">
                      <summary className="cursor-pointer text-sm font-semibold text-info">
                        {row.sessionCount}
                      </summary>
                      <div className="mt-(--space-2) space-y-(--space-1) text-xs text-base-content/70">
                        {row.sessions.map((session) => (
                          <p key={`${row.member.id}-${session.inAt}`}>
                            {formatReportTime(session.inAt)} -{' '}
                            {session.outAt ? formatReportTime(session.outAt) : 'Open'} ·{' '}
                            {formatDuration(session.durationMinutes)}
                          </p>
                        ))}
                      </div>
                    </details>
                    <span className="hidden reports-print-inline">{row.sessionCount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function WeeklyPresenceReport({ report }: { report: WeeklyPresenceReportResponse }) {
  const { summary, rows, days } = report.data

  return (
    <>
      <SummaryGrid
        items={[
          { label: 'Members', value: summary.totalMembers },
          { label: 'With presence', value: summary.membersWithPresence },
          { label: 'Training nights', value: summary.trainingNightCount },
          { label: 'Admin nights', value: summary.adminNightCount },
        ]}
      />
      {rows.length === 0 ? (
        <ReportEmptyMessage
          title="No matching members"
          detail="No active members matched the selected filters."
        />
      ) : (
        <PresenceMatrixTable
          rows={rows.map((row) => ({
            member: row.member,
            days: row.days,
            total: row.totalDaysPresent,
            trailing: [
              formatBooleanPresence(row.trainingNightPresent),
              formatBooleanPresence(row.adminNightPresent),
            ],
          }))}
          days={days}
          trailingHeaders={['Training', 'Admin']}
        />
      )}
    </>
  )
}

function MonthlyPresenceReport({ report }: { report: MonthlyPresenceReportResponse }) {
  const { summary, rows, days } = report.data

  return (
    <>
      <SummaryGrid
        items={[
          { label: 'Members', value: summary.totalMembers },
          { label: 'With presence', value: summary.membersWithPresence },
          { label: 'Member-days', value: summary.totalMemberDaysPresent },
          { label: 'Key nights', value: summary.trainingNightCount + summary.adminNightCount },
        ]}
      />
      {rows.length === 0 ? (
        <ReportEmptyMessage
          title="No matching members"
          detail="No active members matched the selected filters."
        />
      ) : (
        <PresenceMatrixTable
          rows={rows.map((row) => ({
            member: row.member,
            days: row.days,
            total: row.totalDaysPresent,
            trailing: [String(row.trainingNightsPresent), String(row.adminNightsPresent)],
          }))}
          days={days}
          trailingHeaders={['Training', 'Admin']}
          compactDays
        />
      )}
    </>
  )
}

function TrainingNightMonthlyReport({ report }: { report: TrainingNightMonthlyReportResponse }) {
  const { summary, rows, trainingNights } = report.data

  return (
    <>
      <SummaryGrid
        items={[
          { label: 'Department members', value: summary.totalMembers },
          { label: 'Training nights', value: summary.trainingNightCount },
          {
            label: 'Average attendance',
            value: formatPercent(summary.averageAttendancePercentage),
          },
          { label: 'Department', value: report.data.department?.code ?? 'Unassigned' },
        ]}
      />
      {trainingNights.length === 0 ? (
        <ReportEmptyMessage
          title="No Training Nights found"
          detail="No reliable Training Night dates were found for this month."
        />
      ) : rows.length === 0 ? (
        <ReportEmptyMessage
          title="No department members"
          detail="No active members were found in the selected department."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm reports-table">
            <thead>
              <tr>
                <th>Member</th>
                {trainingNights.map((night) => (
                  <th key={night.id} className="text-center">
                    {night.label}
                  </th>
                ))}
                <th className="text-right">Attended</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.member.id}>
                  <td>
                    <MemberName member={row.member} />
                  </td>
                  {trainingNights.map((night) => {
                    const marker = row.nights.find((item) => item.keyNightId === night.id)
                    return (
                      <td key={night.id} className="text-center">
                        <PresenceSymbol
                          present={marker?.present ?? false}
                          requirement={marker?.requirement ?? 'required'}
                        />
                      </td>
                    )
                  })}
                  <td className="text-right font-mono">
                    {row.attended}/{row.possible} · {formatPercent(row.percentage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function VisitorActivityReport({ report }: { report: VisitorActivityReportResponse }) {
  const { summary, rows } = report.data

  return (
    <>
      <SummaryGrid
        items={[
          { label: 'Visitors', value: summary.totalVisitors },
          { label: 'Active at end', value: summary.activeAtEnd },
          { label: 'Visit types', value: summary.byVisitType.length },
          {
            label: 'Events',
            value: summary.byEvent.filter((item) => item.label !== 'No event link').length,
          },
        ]}
      />
      {rows.length === 0 ? (
        <ReportEmptyMessage
          title="No visitor activity"
          detail="No visitors matched the selected date range and filters."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm reports-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Type / purpose</th>
                <th>Organization</th>
                <th>In</th>
                <th>Out</th>
                <th>Event</th>
                <th>Host</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.displayName}</td>
                  <td>
                    <div className="flex flex-wrap gap-(--space-1)">
                      <Chip size="sm" variant="faded" color="blue">
                        {row.visitType}
                      </Chip>
                      {(row.visitPurpose || row.visitReason) && (
                        <span className="text-xs text-base-content/65">
                          {row.visitPurpose ?? row.visitReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{row.organization ?? '—'}</td>
                  <td className="font-mono">{formatReportDateTime(row.checkInTime)}</td>
                  <td className="font-mono">
                    {row.checkOutTime ? formatReportDateTime(row.checkOutTime) : 'Still present'}
                  </td>
                  <td>{row.event?.name ?? '—'}</td>
                  <td>{row.host?.displayName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function OperationalExceptionsReport({ report }: { report: OperationalExceptionsReportResponse }) {
  const { summary, forcedCheckouts, lockupExceptions } = report.data

  return (
    <>
      <SummaryGrid
        items={[
          { label: 'Forced out', value: summary.forcedCheckoutCount },
          { label: 'System', value: summary.systemForcedCheckoutCount },
          { label: 'Admin', value: summary.adminForcedCheckoutCount },
          { label: 'Lockup issues', value: summary.lockupExceptionCount },
        ]}
      />

      {forcedCheckouts.length === 0 && lockupExceptions.length === 0 ? (
        <ReportEmptyMessage
          title="No operational exceptions"
          detail="No forced checkouts or lockup exceptions matched the selected range."
        />
      ) : (
        <div className="space-y-(--space-5)">
          <section>
            <h3 className="mb-(--space-2) text-sm font-semibold uppercase tracking-wide text-base-content/60">
              Forced checkouts
            </h3>
            {forcedCheckouts.length === 0 ? (
              <p className="text-sm text-base-content/55">No forced checkouts.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm reports-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Member</th>
                      <th>Original in</th>
                      <th>Forced out</th>
                      <th>Resolved by</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forcedCheckouts.map((row) => (
                      <tr key={row.id}>
                        <td className="font-mono">{row.operationalDate}</td>
                        <td className="font-semibold">{row.member.displayName}</td>
                        <td className="font-mono">{formatReportDateTime(row.originalCheckinAt)}</td>
                        <td className="font-mono">{formatReportDateTime(row.forcedCheckoutAt)}</td>
                        <td>{row.resolverLabel}</td>
                        <td>{row.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-(--space-2) text-sm font-semibold uppercase tracking-wide text-base-content/60">
              Lockup exceptions
            </h3>
            {lockupExceptions.length === 0 ? (
              <p className="text-sm text-base-content/55">No lockup exceptions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm reports-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Expected DDS</th>
                      <th>Expected SWK</th>
                      <th>Lockup holder</th>
                      <th>System outs</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lockupExceptions.map((row) => (
                      <tr key={row.id}>
                        <td className="font-mono">{row.operationalDate}</td>
                        <td>{row.buildingStatus}</td>
                        <td>{row.expectedDds?.displayName ?? '—'}</td>
                        <td>{row.expectedSwk?.displayName ?? '—'}</td>
                        <td>{row.expectedLockupHolder?.displayName ?? '—'}</td>
                        <td className="font-mono">{row.systemForcedCheckoutCount}</td>
                        <td>{row.notes.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function PresenceMatrixTable({
  rows,
  days,
  trailingHeaders,
  compactDays = false,
}: {
  rows: Array<{
    member: ReportMemberSummary
    days: Array<{ date: string; label: string; present: boolean; note: string | null }>
    total: number
    trailing: string[]
  }>
  days: Array<{ date: string; label: string; isTrainingNight: boolean; isAdminNight: boolean }>
  trailingHeaders: string[]
  compactDays?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm reports-table">
        <thead>
          <tr>
            <th>Member</th>
            {days.map((day) => (
              <th key={day.date} className="text-center">
                <span>{compactDays ? day.label : day.label.replace(' ', '\u00a0')}</span>
                {(day.isTrainingNight || day.isAdminNight) && (
                  <span className="ml-(--space-1) text-[0.65rem] font-semibold text-base-content/55">
                    {day.isTrainingNight ? 'T' : 'A'}
                  </span>
                )}
              </th>
            ))}
            <th className="text-right">Days</th>
            {trailingHeaders.map((header) => (
              <th key={header} className="text-right">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.member.id}>
              <td>
                <MemberName member={row.member} />
              </td>
              {row.days.map((day) => (
                <td key={day.date} className="text-center">
                  <PresenceSymbol present={day.present} note={day.note} />
                </td>
              ))}
              <td className="text-right font-mono">{row.total}</td>
              {row.trailing.map((value, index) => (
                <td key={`${row.member.id}-${trailingHeaders[index]}`} className="text-right">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PresenceSymbol({
  present,
  note,
  requirement = 'required',
}: {
  present: boolean
  note?: string | null
  requirement?: 'required' | 'optional' | 'not_expected'
}) {
  const label =
    requirement === 'optional'
      ? present
        ? 'Optional and present'
        : 'Optional and absent'
      : requirement === 'not_expected'
        ? present
          ? 'Not expected but present'
          : 'Not expected'
        : present
          ? `Present${note ? `, ${note}` : ''}`
          : 'Absent'
  const display =
    requirement === 'optional'
      ? present
        ? 'O'
        : 'opt'
      : requirement === 'not_expected'
        ? present
          ? 'P'
          : 'n/a'
        : present
          ? 'P'
          : '—'
  const presenceClasses =
    requirement === 'optional'
      ? 'border-info/40 bg-info/10 text-info'
      : requirement === 'not_expected'
        ? 'border-base-300 bg-base-100 text-base-content/45'
        : present
          ? 'border-success/40 bg-success-fadded text-success-fadded-content'
          : 'border-base-300 bg-base-200 text-base-content/55'

  return (
    <span
      className={cn(
        'inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border px-(--space-1) text-xs font-bold',
        presenceClasses
      )}
      aria-label={label}
      title={label}
    >
      {display}
    </span>
  )
}

function MemberName({ member }: { member: ReportMemberSummary }) {
  return (
    <div>
      <p className="font-semibold leading-tight">{member.displayName}</p>
      <p className="text-xs text-base-content/55">
        {member.memberType ?? 'Member'} · {member.status}
      </p>
    </div>
  )
}

function TagList({ tags }: { tags: ReportTagSummary[] }) {
  if (tags.length === 0) {
    return <span className="text-xs text-base-content/45">No tags</span>
  }

  return (
    <div className="flex max-w-72 flex-wrap gap-(--space-1)">
      {tags.slice(0, 4).map((tag) => (
        <Chip
          key={`${tag.id}-${tag.source}`}
          size="sm"
          variant={getChipVariant(tag.chipVariant)}
          color={getChipColor(tag.chipColor)}
        >
          {tag.name}
        </Chip>
      ))}
      {tags.length > 4 && <span className="text-xs text-base-content/55">+{tags.length - 4}</span>}
    </div>
  )
}

function ReportEmptyMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-200 p-(--space-6) text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-(--space-1) text-sm text-base-content/65">{detail}</p>
    </div>
  )
}

function getChipVariant(value: string | null): ChipVariant {
  return value && CHIP_VARIANTS.has(value as ChipVariant) ? (value as ChipVariant) : 'faded'
}

function getChipColor(value: string | null): ChipColor {
  return value && CHIP_COLORS.has(value as ChipColor) ? (value as ChipColor) : 'default'
}
