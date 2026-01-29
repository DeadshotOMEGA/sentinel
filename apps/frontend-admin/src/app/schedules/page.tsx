'use client'

import { useState } from 'react'
import { WeekPicker } from '@/components/schedules/week-picker'
import { DdsScheduleCard } from '@/components/schedules/dds-schedule-card'
import { DutyWatchCard } from '@/components/schedules/duty-watch-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CalendarDays, Info } from 'lucide-react'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateISO(date: Date): string {
  return date.toISOString().substring(0, 10)
}

export default function SchedulesPage() {
  const [weekStartDate, setWeekStartDate] = useState(() => {
    return formatDateISO(getMonday(new Date()))
  })

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6" />
              Weekly Schedules
            </h1>
            <p className="text-base-content/60">
              Manage DDS and Duty Watch assignments for each week
            </p>
          </div>
          <WeekPicker weekStartDate={weekStartDate} onWeekChange={setWeekStartDate} />
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How Schedules Work</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              <li>
                <strong>DDS</strong> is assigned weekly and holds lockup responsibility Mon-Wed-Fri
              </li>
              <li>
                <strong>Duty Watch</strong> team operates on Tuesday &amp; Thursday evenings
              </li>
              <li>
                Draft schedules can be edited. Published schedules are locked.
              </li>
              <li>
                Lockup transfers automatically to scheduled DDS at 3:00 AM each day
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Schedule Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          <DdsScheduleCard weekStartDate={weekStartDate} />
          <DutyWatchCard weekStartDate={weekStartDate} />
        </div>
    </div>
  )
}
