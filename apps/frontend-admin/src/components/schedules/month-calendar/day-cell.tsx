import { memo } from 'react'
import { format, isSameMonth, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { EventPill } from './event-pill'
import { useModalContext } from '../modals/modal-context'

interface EventData {
  id: string
  title: string
  eventDate: string
  startTime: string | null
  endTime: string | null
}

interface DutyWatchInfo {
  assignmentCount: number
  hasOverrides: boolean
  weekStartDate: string
}

interface DayCellProps {
  weekIdx: number
  dayOffset: number
  date: Date
  currentMonth: Date
  events: EventData[]
  dutyWatch: DutyWatchInfo | null
  focusedWeek: number
  focusedDay: number
  isPastWeek: boolean
}

const MAX_VISIBLE_ITEMS = 3

export const DayCell = memo(function DayCell({
  weekIdx,
  dayOffset,
  date,
  currentMonth,
  events,
  dutyWatch,
  focusedWeek,
  focusedDay,
  isPastWeek,
}: DayCellProps) {
  const { openDutyWatchModal } = useModalContext()
  const isTodayDate = isToday(date)
  const isCurrentMonthDate = isSameMonth(date, currentMonth)
  const isDutyWatchNight = dayOffset === 1 || dayOffset === 3 // Tue or Thu
  const dateStr = format(date, 'yyyy-MM-dd')

  // Count items: DW button (if Tue/Thu) counts as 1
  const dwItem = isDutyWatchNight ? 1 : 0
  const totalItems = dwItem + events.length
  const overflow = totalItems > MAX_VISIBLE_ITEMS ? totalItems - MAX_VISIBLE_ITEMS + 1 : 0
  const visibleEventCount = events.length - overflow

  return (
    <td
      id={`cal-cell-${weekIdx}-${dayOffset + 1}`}
      role="gridcell"
      tabIndex={weekIdx === focusedWeek && focusedDay === dayOffset + 1 ? 0 : -1}
      className={cn(
        'p-2 align-top focus:outline-2 focus:outline-primary border-b border-r bg-base-100',
        {
          'ring-2 ring-primary ring-inset': isTodayDate,
          'opacity-50': !isCurrentMonthDate,
        }
      )}
      aria-label={format(date, 'EEEE, MMMM d')}
    >
      <div className="flex flex-col gap-1 min-h-16">
        <span className="text-xs font-medium tabular-nums">{format(date, 'd')}</span>

        {isDutyWatchNight && dutyWatch && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (!isPastWeek) openDutyWatchModal(dutyWatch.weekStartDate, dateStr)
            }}
            disabled={isPastWeek}
            aria-label={`Duty Watch ${format(date, 'EEE')}: ${dutyWatch.assignmentCount} assigned`}
          >
            <span
              className={`badge badge-sm ${dutyWatch.assignmentCount > 0 ? (dutyWatch.hasOverrides ? 'badge-accent badge-outline' : 'badge-accent') : 'badge-neutral'}`}
              style={
                dutyWatch.assignmentCount === 0
                  ? { backgroundColor: 'var(--color-neutral)' }
                  : isPastWeek
                    ? {
                        backgroundColor: 'var(--color-accent-fadded)',
                        color: 'var(--color-accent-fadded-content)',
                      }
                    : undefined
              }
            >
              DW ({dutyWatch.assignmentCount}){dutyWatch.hasOverrides ? '*' : ''}
            </span>
          </button>
        )}

        {events.slice(0, Math.max(0, visibleEventCount)).map((event) => (
          <EventPill key={event.id} id={event.id} title={event.title} isPastWeek={isPastWeek} />
        ))}

        {overflow > 0 && (
          <span className="text-xs text-base-content/60 cursor-default">+{overflow} more</span>
        )}
      </div>
    </td>
  )
})
