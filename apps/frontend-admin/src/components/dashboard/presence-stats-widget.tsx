'use client'

import { Users } from 'lucide-react'
import { usePresence } from '@/hooks/use-presence'

export function PresenceStatsWidget() {
  const { data, isLoading, isError } = usePresence()

  if (isError) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">Currently Present</h2>
        </div>
        <p className="text-sm text-destructive">Failed to load presence data</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const totalPresent = data?.totalPresent ?? 0

  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Currently Present</h2>
      </div>

      <div className="text-5xl font-bold text-primary mb-2">{totalPresent}</div>

      <p className="text-sm text-muted-foreground">
        {totalPresent === 1 ? 'member' : 'members'} on site
      </p>
    </div>
  )
}
