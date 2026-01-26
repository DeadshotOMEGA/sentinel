'use client'

import { Users } from 'lucide-react'
import { usePresence } from '@/hooks/use-presence'

export function PresenceStatsWidget() {
  const { data, isLoading, isError } = usePresence()

  if (isError) {
    return (
      <div className="relative isolate overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <Users className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Currently Present</h2>
          </div>
          <p className="text-sm text-destructive">Failed to load presence data</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="relative isolate overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-10 bg-muted rounded-lg"></div>
            <div className="h-16 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  const totalPresent = data?.totalPresent ?? 0

  return (
    <div className="relative isolate overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Currently Present</h2>
        </div>

        <div className="space-y-2">
          <div className="text-6xl font-bold tracking-tight text-primary">{totalPresent}</div>

          <p className="text-sm text-muted-foreground">
            {totalPresent === 1 ? 'member' : 'members'} on site
          </p>
        </div>

        {/* Optional: Add a subtle gradient background effect */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
      </div>
    </div>
  )
}
