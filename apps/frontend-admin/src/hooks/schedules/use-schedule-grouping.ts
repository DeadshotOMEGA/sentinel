import { useMemo } from 'react'

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
    member: {
      id: string
      rank: string
      firstName: string
      lastName: string
    }
  }>
  [key: string]: unknown
}

/** Groups schedules by weekStartDate into a Map */
export function useSchedulesByWeekGrouping(schedulesData: { data: ScheduleData[] } | undefined) {
  return useMemo(() => {
    const map = new Map<string, ScheduleData[]>()
    const schedules = schedulesData?.data ?? []
    for (const schedule of schedules) {
      const weekKey = schedule.weekStartDate
      if (!map.has(weekKey)) {
        map.set(weekKey, [])
      }
      map.get(weekKey)!.push(schedule)
    }
    return map
  }, [schedulesData])
}
