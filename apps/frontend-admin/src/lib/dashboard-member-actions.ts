import type {
  DutyPositionResponse,
  DutyWatchTeamResponse,
  PresentPerson,
} from '@sentinel/contracts'

export const LIVE_DUTY_POSITION_CODES = ['SWK', 'DSWK', 'QM', 'BM', 'APS'] as const

type LiveDutyPositionCode = (typeof LIVE_DUTY_POSITION_CODES)[number]

function isLiveDutyPositionCode(code: string): code is LiveDutyPositionCode {
  return LIVE_DUTY_POSITION_CODES.includes(code as LiveDutyPositionCode)
}

function getQualifiedDutyCodes(person: PresentPerson): Set<string> {
  return new Set(
    (person.tags ?? [])
      .filter(
        (tag) =>
          tag.source === 'qualification' || tag.isPositional || isLiveDutyPositionCode(tag.name)
      )
      .map((tag) => tag.name)
  )
}

export function getDashboardDutyPositionCode(person: PresentPerson): string | null {
  if (person.type !== 'member') {
    return null
  }

  return (
    person.liveDutyAssignment?.dutyPosition.code ??
    person.scheduledDutyTonight?.dutyPosition?.code ??
    null
  )
}

export function getQualifiedTemporaryDutyPositions(
  person: PresentPerson,
  positions: DutyPositionResponse[] | undefined
): DutyPositionResponse[] {
  if (person.type !== 'member' || !positions) {
    return []
  }

  const qualifiedCodes = getQualifiedDutyCodes(person)

  return positions.filter(
    (position) => isLiveDutyPositionCode(position.code) && qualifiedCodes.has(position.code)
  )
}

export interface TonightReplacementOption {
  assignmentId: string
  scheduleId: string
  positionId: string
  positionCode: string
  positionName: string
  replacingMemberId: string
  replacingMemberLabel: string
}

export function getTonightReplacementOptions(
  person: PresentPerson,
  dutyWatch: DutyWatchTeamResponse | undefined
): TonightReplacementOption[] {
  if (person.type !== 'member' || !dutyWatch?.isDutyWatchNight || !dutyWatch.scheduleId) {
    return []
  }

  const qualifiedCodes = getQualifiedDutyCodes(person)

  return dutyWatch.team
    .filter(
      (assignment) =>
        assignment.source === 'schedule' &&
        Boolean(assignment.position) &&
        assignment.member.id !== person.id &&
        qualifiedCodes.has(assignment.position?.code ?? '')
    )
    .map((assignment) => ({
      assignmentId: assignment.assignmentId,
      scheduleId: dutyWatch.scheduleId as string,
      positionId: assignment.position?.id ?? '',
      positionCode: assignment.position?.code ?? '',
      positionName: assignment.position?.name ?? 'Duty Watch',
      replacingMemberId: assignment.member.id,
      replacingMemberLabel: `${assignment.member.rank} ${assignment.member.lastName}`,
    }))
}

export interface DutyWatchCoverageSummary {
  plannedCount: number
  coveredCount: number
  uncoveredCount: number
  liveOnlyCount: number
  allCovered: boolean
}

export function getDutyWatchCoverageSummary(
  dutyWatch: DutyWatchTeamResponse | undefined
): DutyWatchCoverageSummary {
  const team = dutyWatch?.team ?? []
  const plannedAssignments = team.filter((assignment) => assignment.source !== 'live_only')
  const coveredPlannedCount = plannedAssignments.filter(
    (assignment) => assignment.isCheckedIn || Boolean(assignment.liveCoverage)
  ).length
  const liveOnlyCount = team.length - plannedAssignments.length
  const plannedCount = plannedAssignments.length
  const uncoveredCount = Math.max(plannedCount - coveredPlannedCount, 0)

  return {
    plannedCount,
    coveredCount: plannedCount > 0 ? coveredPlannedCount : liveOnlyCount,
    uncoveredCount,
    liveOnlyCount,
    allCovered: plannedCount > 0 ? uncoveredCount === 0 : liveOnlyCount > 0,
  }
}
