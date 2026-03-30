'use client'

import { useEffect, useMemo, useState } from 'react'
import { getOperationalDateKey } from '@/lib/date-utils'

export function useOperationalDateKey(rolloverTime: string) {
  const getKey = useMemo(
    () => () => getOperationalDateKey(new Date(), rolloverTime),
    [rolloverTime]
  )
  const [dateKey, setDateKey] = useState<string>(() => getKey())

  useEffect(() => {
    setDateKey(getKey())

    const intervalId = window.setInterval(() => {
      setDateKey((current) => {
        const next = getKey()
        return current === next ? current : next
      })
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [getKey])

  return dateKey
}
