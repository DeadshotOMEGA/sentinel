'use client'

import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { ArrowDown, ArrowUp, CalendarClock, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { AppBadge } from '@/components/ui/AppBadge'
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from '@/components/ui/AppCard'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { scheduleKeys, useShiftDdsSchedule } from '@/hooks/use-schedules'
import { apiClient } from '@/lib/api-client'
import { formatDateISO, parseDateString } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { useModalContext } from './modals/modal-context'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const DDS_PANEL_WEEK_COUNT = 24

interface WeeklyDdsPanelProps {
  startWeekDate: string
  selectedWeekDate: string
}

interface PendingShift {
  weekStartDate: string
  direction: 'forward' | 'backward'
}

function formatWeekLabel(weekStartDate: string): string {
  const startDate = parseDateString(weekStartDate)
  return format(startDate, 'MMM d')
}

function formatMemberName(
  member:
    | {
        rank: string
        firstName: string
        lastName: string
      }
    | undefined
): string {
  if (!member) return 'Assign DDS'
  return `${member.rank} ${member.lastName}, ${member.firstName}`
}

function getShiftDescription(pendingShift: PendingShift | null): string {
  if (!pendingShift) return ''

  const weekLabel = formatWeekLabel(pendingShift.weekStartDate)
  if (pendingShift.direction === 'forward') {
    return `This clears ${weekLabel} and moves each later DDS assignment one week down the list.`
  }

  return `This pulls later DDS assignments one week up the list starting at ${weekLabel}.`
}

export function WeeklyDdsPanel({ startWeekDate, selectedWeekDate }: WeeklyDdsPanelProps) {
  const { openDdsModal } = useModalContext()
  const shiftDdsSchedule = useShiftDdsSchedule()
  const [pendingShift, setPendingShift] = useState<PendingShift | null>(null)

  const weekDateStrings = useMemo(() => {
    const startDate = parseDateString(startWeekDate)
    return Array.from({ length: DDS_PANEL_WEEK_COUNT }, (_, index) =>
      formatDateISO(addDays(startDate, index * 7))
    )
  }, [startWeekDate])

  const weekQueries = useQueries({
    queries: weekDateStrings.map((date) => ({
      queryKey: scheduleKeys.week(date),
      queryFn: async () => {
        const response = await apiClient.schedules.getSchedulesByWeek({
          params: { date },
        })
        if (response.status !== 200) {
          throw new Error('Failed to fetch schedules for week')
        }
        return response.body
      },
      enabled: !!date,
    })),
  })

  const isLoading = weekQueries.some((query) => query.isLoading)
  const isError = weekQueries.some((query) => query.isError)

  const handleConfirmShift = async () => {
    if (!pendingShift) return

    const shift = pendingShift

    try {
      const result = await shiftDdsSchedule.mutateAsync({
        startWeekDate: shift.weekStartDate,
        direction: shift.direction,
      })
      toast.success(
        `DDS schedule shifted ${result.direction}; ${result.assignmentsMoved} assignment${result.assignmentsMoved === 1 ? '' : 's'} moved.`
      )
      setPendingShift(null)
      if (shift.direction === 'forward') {
        openDdsModal(shift.weekStartDate)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to shift DDS schedule'
      toast.error(message)
    }
  }

  return (
    <>
      <AppCard className="h-fit" data-help-id="schedules.weekly-dds-panel">
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-(--space-2) text-base">
            <CalendarClock className="size-5 text-info" />
            DDS sequence
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent className="p-0">
          {isLoading && (
            <div className="flex h-32 items-center justify-center">
              <span className="loading loading-dots loading-md" aria-label="Loading DDS list" />
            </div>
          )}

          {isError && (
            <div className="p-(--space-4) text-sm text-error">Failed to load DDS sequence.</div>
          )}

          {!isLoading && !isError && (
            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">
              <table className="table table-xs">
                <tbody>
                  {weekDateStrings.map((weekStartDate, index) => {
                    const schedules = weekQueries[index]?.data?.data ?? []
                    const ddsSchedule = schedules.find(
                      (schedule) => schedule.dutyRole.code === 'DDS'
                    )
                    const assignment = ddsSchedule?.assignments.find(
                      (item) => item.status !== 'released'
                    )
                    const isSelected = weekStartDate === selectedWeekDate

                    return (
                      <tr
                        key={weekStartDate}
                        className={cn(
                          'cursor-pointer align-middle hover:bg-base-200/70',
                          isSelected && 'bg-primary-fadded text-primary-fadded-content'
                        )}
                        onClick={() => openDdsModal(weekStartDate)}
                      >
                        <td className="w-20">
                          <div className="font-mono text-xs">{formatWeekLabel(weekStartDate)}</div>
                          {ddsSchedule?.status === 'draft' && (
                            <AppBadge status="warning" size="sm">
                              Draft
                            </AppBadge>
                          )}
                        </td>
                        <td className="min-w-0">
                          <div className="flex min-w-0 items-center gap-(--space-2)">
                            <UserRound className="size-4 shrink-0 text-base-content/55" />
                            <span className="truncate text-sm font-medium">
                              {formatMemberName(assignment?.member)}
                            </span>
                          </div>
                        </td>
                        <td className="w-20">
                          <div className="flex justify-end gap-(--space-1)">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs btn-square"
                              title="Shift DDS backward from this week"
                              disabled={shiftDdsSchedule.isPending}
                              onClick={(event) => {
                                event.stopPropagation()
                                setPendingShift({ weekStartDate, direction: 'backward' })
                              }}
                            >
                              <ArrowUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs btn-square"
                              title="Shift DDS forward from this week"
                              disabled={shiftDdsSchedule.isPending}
                              onClick={(event) => {
                                event.stopPropagation()
                                setPendingShift({ weekStartDate, direction: 'forward' })
                              }}
                            >
                              <ArrowDown className="size-3.5" />
                            </button>
                          </div>
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

      <AlertDialog
        open={pendingShift !== null}
        onOpenChange={(open) => !open && setPendingShift(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shift DDS schedule?</AlertDialogTitle>
            <AlertDialogDescription>{getShiftDescription(pendingShift)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={shiftDdsSchedule.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmShift}
              disabled={shiftDdsSchedule.isPending}
              className="btn-primary"
            >
              {shiftDdsSchedule.isPending && <ButtonSpinner />}
              Shift
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
