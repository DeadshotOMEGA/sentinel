import React, { memo } from 'react'
import { format } from 'date-fns'
import { useModalContext } from '../modals/modal-context'

interface ScheduleData {
  id: string
  weekStartDate: string
  status: string
  dutyRole: {
    id: string
    code: string
    name: string
  }
  assignments?: Array<{
    id: string
    memberId: string
    member: {
      id: string
      rank: string
      firstName: string
      lastName: string
    }
    dutyPosition?: { id: string; code: string; name: string } | null
    [key: string]: unknown
  }>
  nightOverrides?: Array<{
    nightDate: string
    overrideType: 'replace' | 'add' | 'remove'
    baseMemberId: string | null
    memberId: string | null
  }>
  [key: string]: unknown
}

interface WeekDdsCellProps {
  weekIdx: number
  weekStart: Date
  weekStartStr: string
  ddsSchedule: ScheduleData | undefined
  dutyWatchSchedule: ScheduleData | undefined
  focusedWeek: number
  focusedDay: number
  onWeekClick?: (weekStartDate: string) => void
  isPastWeek: boolean
}

export const WeekDdsCell = memo(function WeekDdsCell({
  weekIdx,
  weekStart,
  weekStartStr,
  ddsSchedule,
  dutyWatchSchedule,
  focusedWeek,
  focusedDay,
  onWeekClick,
  isPastWeek,
}: WeekDdsCellProps) {
  const { openDdsModal, openDutyWatchModal } = useModalContext()

  const ddsAssignment = ddsSchedule?.assignments?.[0]
  const dwCount = dutyWatchSchedule?.assignments?.length ?? 0
  const hasOverrides = (dutyWatchSchedule?.nightOverrides?.length ?? 0) > 0

  const ddsLabel = ddsAssignment
    ? `${ddsAssignment.member.rank} ${ddsAssignment.member.lastName}`
    : null

  return (
    <td
      id={`cal-cell-${weekIdx}-0`}
      role="gridcell"
      tabIndex={weekIdx === focusedWeek && focusedDay === 0 ? 0 : -1}
      className="p-2 align-top focus:outline-2 focus:outline-primary border-b border-r bg-base-200 w-36 sticky left-0 z-10"
    >
      <div className="flex flex-col gap-1.5">
        {/* Week date link */}
        <button
          type="button"
          onClick={() => onWeekClick?.(weekStartStr)}
          className="text-xs font-medium hover:text-primary transition-colors text-left"
          aria-label={`Week starting ${format(weekStart, 'MMM d')}`}
        >
          {format(weekStart, 'MMM d')}
        </button>

        {/* DDS badge/button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!isPastWeek) openDdsModal(weekStartStr)
          }}
          disabled={isPastWeek}
          aria-label={`DDS: ${ddsLabel ?? 'Unassigned'}`}
        >
          <span
            className={`badge badge-sm ${ddsLabel ? 'badge-primary' : 'badge-neutral'}`}
            style={
              !ddsLabel
                ? { backgroundColor: 'var(--color-neutral)' }
                : isPastWeek
                  ? {
                      backgroundColor: 'var(--color-primary-fadded)',
                      color: 'var(--color-primary-fadded-content)',
                    }
                  : undefined
            }
          >
            {ddsLabel ?? 'DDS'}
          </span>
        </button>

        {/* Duty Watch summary button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!isPastWeek) openDutyWatchModal(weekStartStr)
          }}
          disabled={isPastWeek}
          aria-label={`Duty Watch: ${dwCount} assigned${hasOverrides ? ', has night overrides' : ''}`}
        >
          <span
            className={`badge badge-sm ${dwCount > 0 ? (hasOverrides ? 'badge-accent badge-outline' : 'badge-accent') : 'badge-neutral'}`}
            style={
              dwCount === 0
                ? { backgroundColor: 'var(--color-neutral)' }
                : isPastWeek
                  ? {
                      backgroundColor: 'var(--color-accent-fadded)',
                      color: 'var(--color-accent-fadded-content)',
                    }
                  : undefined
            }
          >
            DW ({dwCount}){hasOverrides ? '*' : ''}
          </span>
        </button>
      </div>
    </td>
  )
})
