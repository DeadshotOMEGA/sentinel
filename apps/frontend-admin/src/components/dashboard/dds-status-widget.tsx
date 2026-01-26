'use client'

import { CheckCircle2 } from 'lucide-react'
import { useDdsStatus } from '@/hooks/use-dds'
import { Badge } from '@/components/ui/badge'

export function DdsStatusWidget() {
  const { data: ddsStatus, isLoading } = useDdsStatus()

  const getDdsStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <Badge variant="default" className="bg-green-600">
            Accepted
          </Badge>
        )
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'transferred':
        return <Badge variant="outline">Transferred</Badge>
      case 'released':
        return <Badge>Released</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="relative isolate overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Daily Duty Staff</h2>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-2/3"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        ) : ddsStatus?.assignment ? (
          <div className="space-y-3">
            <p className="font-semibold text-2xl">{ddsStatus.assignment.member.name}</p>
            <div className="flex items-center gap-2">
              {getDdsStatusBadge(ddsStatus.assignment.status)}
              <span className="text-sm text-muted-foreground">
                {new Date(ddsStatus.assignment.assignedDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No DDS assigned for today</p>
        )}

        {/* Optional: Add a subtle gradient background effect */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
      </div>
    </div>
  )
}
