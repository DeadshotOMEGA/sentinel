'use client'

import { Users, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { useTonightDutyWatch } from '@/hooks/use-schedules'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function formatMemberName(member: { rank: string; firstName: string; lastName: string }): string {
  return `${member.rank} ${member.lastName}`
}

interface TeamMember {
  assignmentId: string
  position: { id: string; code: string; name: string } | null
  member: { id: string; firstName: string; lastName: string; rank: string; serviceNumber: string }
  status: string
  isCheckedIn: boolean
}

export function DutyWatchWidget() {
  const { data: dutyWatch, isLoading, isError } = useTonightDutyWatch()

  // Don't render anything if it's not a Duty Watch night
  if (!isLoading && !isError && !dutyWatch?.isDutyWatchNight) {
    return null
  }

  // Show loading state on Duty Watch nights
  if (isLoading) {
    return (
      <div className="relative isolate overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Duty Watch Tonight</h2>
          </div>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-6 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="relative isolate overflow-hidden rounded-lg border border-destructive/50 bg-card shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load Duty Watch data</span>
          </div>
        </div>
      </div>
    )
  }

  if (!dutyWatch?.isDutyWatchNight) {
    return null
  }

  // Calculate check-in status
  const team = dutyWatch.team || []
  const checkedInCount = team.filter((m: TeamMember) => m.isCheckedIn).length
  const allCheckedIn = checkedInCount === team.length && team.length > 0
  const hasIssues = team.length > 0 && !allCheckedIn

  // Get position priority order for sorting
  const positionOrder: Record<string, number> = {
    SWK: 1,
    DSWK: 2,
    QM: 3,
    BM: 4,
    APS: 5,
  }

  const sortedTeam = [...team].sort((a, b) => {
    const aOrder = a.position?.code ? positionOrder[a.position.code] ?? 99 : 99
    const bOrder = b.position?.code ? positionOrder[b.position.code] ?? 99 : 99
    return aOrder - bOrder
  })

  return (
    <div className="relative isolate overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Duty Watch Tonight</h2>
              <p className="text-xs text-muted-foreground">
                {new Date(dutyWatch.operationalDate).toLocaleDateString('en-CA', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <Badge
            className={cn(
              allCheckedIn && 'bg-green-600 hover:bg-green-600',
              hasIssues && 'bg-yellow-500 text-yellow-900 hover:bg-yellow-500'
            )}
            variant={team.length === 0 ? 'secondary' : 'default'}
          >
            {team.length === 0 ? (
              'Not Assigned'
            ) : allCheckedIn ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                All Present
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                {checkedInCount}/{team.length} Present
              </>
            )}
          </Badge>
        </div>

        {team.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No Duty Watch team assigned for tonight</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTeam.map((member: TeamMember) => (
              <div
                key={member.assignmentId}
                className={cn(
                  'flex items-center justify-between p-2 rounded-md',
                  member.isCheckedIn ? 'bg-muted/30' : 'bg-yellow-500/10 border border-yellow-500/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      'w-14 justify-center text-xs font-mono',
                      member.position?.code === 'SWK' && 'border-primary text-primary',
                      member.position?.code === 'DSWK' && 'border-blue-500 text-blue-600'
                    )}
                  >
                    {member.position?.code || 'N/A'}
                  </Badge>
                  <span className="text-sm font-medium">{formatMemberName(member.member)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {member.isCheckedIn ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-yellow-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alert indicator for missing members */}
        {hasIssues && (
          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-yellow-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {team.length - checkedInCount} team member
              {team.length - checkedInCount === 1 ? ' has' : 's have'} not checked in
            </span>
          </div>
        )}

        {/* Subtle background effect */}
        <div
          className={cn(
            'absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl',
            allCheckedIn && 'bg-green-500/10',
            hasIssues && 'bg-yellow-500/10'
          )}
        />
      </div>
    </div>
  )
}
