'use client'

import { useSchedulesByWeek, useDutyRoles } from '@/hooks/use-schedules'
import { DdsScheduleCard } from './dds-schedule-card'
import { DutyWatchCard } from './duty-watch-card'
import { parseDateString } from '@/lib/date-utils'

interface WeekColumnProps {
  weekStartDate: string
}

export function WeekColumn({ weekStartDate }: WeekColumnProps) {
  // Fetch once for both cards to eliminate duplicate requests
  const { data: schedules, isLoading: schedulesLoading } = useSchedulesByWeek(weekStartDate)
  const { data: dutyRoles, isLoading: rolesLoading } = useDutyRoles()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Week of{' '}
        {parseDateString(weekStartDate).toLocaleDateString('en-CA', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </h2>
      <DdsScheduleCard
        weekStartDate={weekStartDate}
        schedules={schedules}
        dutyRoles={dutyRoles}
        isLoading={schedulesLoading || rolesLoading}
      />
      <DutyWatchCard
        weekStartDate={weekStartDate}
        schedules={schedules}
        dutyRoles={dutyRoles}
        isLoading={schedulesLoading || rolesLoading}
      />
    </div>
  )
}
