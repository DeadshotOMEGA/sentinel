'use client'

import { Users, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { useTonightDutyWatch } from '@/hooks/use-schedules'

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
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <div className="btn btn-square btn-primary btn-soft btn-sm no-animation">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="card-title text-lg">Duty Watch Tonight</h2>
          </div>
          <div className="space-y-3">
            <div className="skeleton h-8 w-3/4"></div>
            <div className="skeleton h-6 w-1/2"></div>
            <div className="skeleton h-6 w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="card bg-base-100 shadow-sm border border-error">
        <div className="card-body">
          <div className="flex items-center gap-2 text-error">
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
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="btn btn-square btn-primary btn-soft btn-sm no-animation">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="card-title text-lg">Duty Watch Tonight</h2>
              <p className="text-xs text-base-content/60">
                {new Date(dutyWatch.operationalDate).toLocaleDateString('en-CA', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <span
            className={`badge ${
              team.length === 0
                ? 'badge-ghost'
                : allCheckedIn
                  ? 'badge-success'
                  : 'badge-warning'
            }`}
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
          </span>
        </div>

        {team.length === 0 ? (
          <div className="text-center py-4 text-base-content/60">
            <p className="text-sm">No Duty Watch team assigned for tonight</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTeam.map((member: TeamMember) => (
              <div
                key={member.assignmentId}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  member.isCheckedIn ? 'bg-base-200' : 'bg-warning/10 border border-warning'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`badge badge-outline badge-sm w-14 justify-center font-mono ${
                      member.position?.code === 'SWK'
                        ? 'badge-primary'
                        : member.position?.code === 'DSWK'
                          ? 'badge-info'
                          : ''
                    }`}
                  >
                    {member.position?.code || 'N/A'}
                  </span>
                  <span className="text-sm font-medium">{formatMemberName(member.member)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {member.isCheckedIn ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-warning" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alert indicator for missing members */}
        {hasIssues && (
          <div className="mt-4 pt-4 border-t border-base-300 flex items-center gap-2 text-warning text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {team.length - checkedInCount} team member
              {team.length - checkedInCount === 1 ? ' has' : 's have'} not checked in
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
