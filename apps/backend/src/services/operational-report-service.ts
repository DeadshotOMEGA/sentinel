import * as v from 'valibot'
import { DateTime } from 'luxon'
import type {
  DailyPresenceRow,
  DailyPresenceReportConfig,
  DailyPresenceReportResponse,
  DailyPresenceSortCriterion,
  KeyNight,
  MonthlyPresenceReportConfig,
  MonthlyPresenceReportResponse,
  OperationalNightAudienceTarget,
  OperationalNightOccurrence,
  OperationalNightType,
  OperationalExceptionsReportConfig,
  OperationalExceptionsReportResponse,
  PresenceMarker,
  PresenceSession,
  ReportDutyPerson,
  ReportMemberSummary,
  ReportTagSummary,
  TrainingNightMonthlyReportConfig,
  TrainingNightMonthlyReportResponse,
  VisitorActivityReportConfig,
  VisitorActivityReportResponse,
  WeeklyPresenceReportConfig,
  WeeklyPresenceReportResponse,
} from '@sentinel/contracts'
import {
  listOperationalNightOccurrencesInRange,
  OperationalTimingsSettingsSchema,
  ScheduleSettingsValueSchema,
} from '@sentinel/contracts'
import type { PrismaClientInstance } from '@sentinel/database'
import { DEFAULT_TIMEZONE, getOperationalDayStartTime } from '../utils/operational-date.js'
import {
  OperationalReportRepository,
  type OperationalReportCheckinRecord,
  type OperationalReportLockupStatusRecord,
  type OperationalReportMemberRecord,
  type OperationalReportMissedCheckoutRecord,
  type OperationalReportScheduledDutyRoleCode,
  type OperationalReportScheduledDutyRecord,
  type OperationalReportUnitEventRecord,
  type OperationalReportVisitorRecord,
} from '../repositories/operational-report-repository.js'
import { isSentinelBootstrapMember } from '../lib/system-bootstrap.js'

const UNIT_NAME = 'HMCS Chippawa'
const REPORT_LOOKBACK_DAYS = 1
const OPERATIONAL_TIMINGS_SETTING_KEY_V3 = 'operational.timings.v3'

type ReportScopeType = 'everyone' | 'department' | 'tag' | 'fts' | 'geo'
type KeyNightCategory = 'training' | 'administrative'
type KeyNightRequirement = 'required' | 'optional' | 'not_expected'

export interface OperationalReportActor {
  id: string
  rank?: string
  firstName?: string
  lastName?: string
}

interface DateRange {
  start: Date
  end: Date
  startDate: string
  endDate: string
  label: string
}

interface EffectiveScope {
  divisionId?: string
  tagId?: string
  scopeLabel: string
  warnings: string[]
  noResults: boolean
}

export interface PresenceSessionInternal {
  memberId: string
  inAt: Date
  outAt: Date | null
  status: 'complete' | 'open' | 'degraded'
  checkoutKioskId?: string | null
}

interface KeyNightWindow extends KeyNight {
  start: Date | null
  end: Date | null
  requiredAudience: OperationalNightAudienceTarget[]
  optionalAudience: OperationalNightAudienceTarget[]
}

interface PresenceStats {
  present: boolean
  firstIn: string | null
  lastOut: string | null
  sessionCount: number
  note: string | null
}

type ScheduledDutyRolesByMember = Map<string, Set<OperationalReportScheduledDutyRoleCode>>
interface ReportMemberSummaryOptions {
  hideDutyTags?: boolean
}

interface LockupCheckedOutMember {
  id: string
  name: string
}

export interface DailyPresenceSortableMember {
  id: string
  rank: string
  firstName: string
  lastName: string
  displayName: string | null
  division: { code: string; name: string } | null
  memberTags: Array<{ tagId: string }>
  qualifications: Array<{ qualificationType: { tagId: string | null } }>
}

export interface DailyPresenceSortableRow {
  memberRecord: DailyPresenceSortableMember
  row: DailyPresenceRow
}

export function getScheduledDutyTagRole(
  tag: ReportTagSummary
): OperationalReportScheduledDutyRoleCode | null {
  const normalizedName = tag.name.trim().toLowerCase().replace(/[_-]+/g, ' ')

  if (normalizedName === 'dds') {
    return 'DDS'
  }

  if (normalizedName === 'duty watch') {
    return 'DUTY_WATCH'
  }

  if (normalizedName === 'swk' || normalizedName === 'senior watchkeeper') {
    return 'SWK'
  }

  if (normalizedName === 'dswk' || normalizedName === 'deputy senior watchkeeper') {
    return 'DSWK'
  }

  if (normalizedName === 'qm' || normalizedName === 'quartermaster') {
    return 'QM'
  }

  if (normalizedName === 'bm' || normalizedName === 'boatswain mate') {
    return 'BM'
  }

  if (normalizedName === 'aps' || normalizedName === 'access point sentry') {
    return 'APS'
  }

  return null
}

export function filterReportMemberTagsForScheduledDuty(
  tags: ReportTagSummary[],
  scheduledRoleCodes: ReadonlySet<OperationalReportScheduledDutyRoleCode>,
  options: { hideDutyTags?: boolean } = {}
): ReportTagSummary[] {
  return tags.filter((tag) => {
    const requiredRoleCode = getScheduledDutyTagRole(tag)
    if (requiredRoleCode === null) {
      return true
    }

    if (options.hideDutyTags) {
      return false
    }

    return (
      scheduledRoleCodes.has(requiredRoleCode) ||
      (requiredRoleCode !== 'DDS' && scheduledRoleCodes.has('DUTY_WATCH'))
    )
  })
}

export function dailyPresenceSortableMemberHasTag(
  member: DailyPresenceSortableMember,
  tagId: string
): boolean {
  return (
    member.memberTags.some((memberTag) => memberTag.tagId === tagId) ||
    member.qualifications.some((qualification) => qualification.qualificationType.tagId === tagId)
  )
}

function compareNullableString(left: string | null | undefined, right: string | null | undefined) {
  const leftValue = left?.trim() ?? ''
  const rightValue = right?.trim() ?? ''

  if (leftValue.length === 0 && rightValue.length > 0) return 1
  if (leftValue.length > 0 && rightValue.length === 0) return -1

  return leftValue.localeCompare(rightValue, undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function compareDailyPresenceField(
  left: DailyPresenceSortableRow,
  right: DailyPresenceSortableRow,
  field: Extract<DailyPresenceSortCriterion, { type: 'field' }>['field']
): number {
  switch (field) {
    case 'first_name':
      return (
        compareNullableString(left.memberRecord.firstName, right.memberRecord.firstName) ||
        compareNullableString(left.memberRecord.lastName, right.memberRecord.lastName)
      )
    case 'department':
      return (
        compareNullableString(
          left.memberRecord.division?.code,
          right.memberRecord.division?.code
        ) || compareNullableString(left.memberRecord.lastName, right.memberRecord.lastName)
      )
    case 'first_in':
      return compareNullableString(left.row.firstIn, right.row.firstIn)
    case 'last_out':
      return compareNullableString(left.row.lastOut, right.row.lastOut)
    case 'sessions':
      return left.row.sessionCount - right.row.sessionCount
    case 'last_name':
      return (
        compareNullableString(left.memberRecord.lastName, right.memberRecord.lastName) ||
        compareNullableString(left.memberRecord.firstName, right.memberRecord.firstName)
      )
  }
}

function compareDailyPresenceCriterion(
  left: DailyPresenceSortableRow,
  right: DailyPresenceSortableRow,
  criterion: DailyPresenceSortCriterion
): number {
  const direction = criterion.direction === 'desc' ? -1 : 1

  if (criterion.type === 'tag') {
    const leftHasTag = dailyPresenceSortableMemberHasTag(left.memberRecord, criterion.tagId)
    const rightHasTag = dailyPresenceSortableMemberHasTag(right.memberRecord, criterion.tagId)

    if (leftHasTag === rightHasTag) {
      return 0
    }

    return (leftHasTag ? -1 : 1) * direction
  }

  return compareDailyPresenceField(left, right, criterion.field) * direction
}

export function sortDailyPresenceRows<T extends DailyPresenceSortableRow>(
  rows: T[],
  sort: DailyPresenceSortCriterion[] | undefined
): T[] {
  const sortCriteria = sort ?? []

  if (sortCriteria.length === 0) {
    return rows
  }

  return [...rows].sort((left, right) => {
    for (const criterion of sortCriteria) {
      const result = compareDailyPresenceCriterion(left, right, criterion)
      if (result !== 0) {
        return result
      }
    }

    return (
      compareNullableString(left.memberRecord.lastName, right.memberRecord.lastName) ||
      compareNullableString(left.memberRecord.firstName, right.memberRecord.firstName) ||
      compareNullableString(left.memberRecord.displayName, right.memberRecord.displayName) ||
      left.memberRecord.id.localeCompare(right.memberRecord.id)
    )
  })
}

export function presenceSessionOverlapsRange(
  session: PresenceSessionInternal,
  start: Date,
  end: Date,
  asOf: Date = new Date()
): boolean {
  if (session.inAt > asOf) {
    return false
  }

  const rawOut = session.outAt ?? asOf
  const effectiveOut = rawOut > asOf ? asOf : rawOut

  return session.inAt < end && effectiveOut > start
}

export function isStaleForcedCheckoutSession(
  session: PresenceSessionInternal,
  start: Date
): boolean {
  if (!session.outAt || session.inAt >= start) {
    return false
  }

  const checkoutKioskId = session.checkoutKioskId ?? ''
  return checkoutKioskId === 'SYSTEM' || checkoutKioskId === 'lockup-force-checkout'
}

export function pairOperationalPresenceSessions(
  checkins: OperationalReportCheckinRecord[],
  warnings: Set<string>
): Map<string, PresenceSessionInternal[]> {
  const grouped = new Map<string, OperationalReportCheckinRecord[]>()
  for (const checkin of checkins) {
    if (!checkin.memberId) {
      continue
    }
    const items = grouped.get(checkin.memberId) ?? []
    items.push(checkin)
    grouped.set(checkin.memberId, items)
  }

  const sessionsByMember = new Map<string, PresenceSessionInternal[]>()

  for (const [memberId, records] of grouped) {
    const sorted = [...records].sort(
      (left, right) => left.timestamp.getTime() - right.timestamp.getTime()
    )
    const sessions: PresenceSessionInternal[] = []
    let openIn: OperationalReportCheckinRecord | null = null

    for (const record of sorted) {
      const direction = record.direction.toLowerCase()

      if (direction === 'in') {
        if (openIn) {
          warnings.add(
            'Some members have multiple check-ins without an intervening checkout; affected sessions are marked as degraded.'
          )
          sessions.push({
            memberId,
            inAt: openIn.timestamp,
            outAt: null,
            status: 'degraded',
          })
        }
        openIn = record
        continue
      }

      if (direction === 'out') {
        if (!openIn) {
          warnings.add(
            'Some checkout records could not be paired with a prior check-in and were ignored.'
          )
          continue
        }

        if (record.timestamp < openIn.timestamp) {
          warnings.add(
            'Some checkout records were earlier than their paired check-in and were ignored.'
          )
          openIn = null
          continue
        }

        sessions.push({
          memberId,
          inAt: openIn.timestamp,
          outAt: record.timestamp,
          status: 'complete',
          checkoutKioskId: record.kioskId,
        })
        openIn = null
        continue
      }

      warnings.add('Some check-in records used an unknown direction and were ignored.')
    }

    if (openIn) {
      sessions.push({
        memberId,
        inAt: openIn.timestamp,
        outAt: null,
        status: 'open',
      })
    }

    sessionsByMember.set(memberId, sessions)
  }

  return sessionsByMember
}

export class OperationalReportService {
  private repository: OperationalReportRepository

  constructor(prismaClient?: PrismaClientInstance, repository?: OperationalReportRepository) {
    this.repository = repository ?? new OperationalReportRepository(prismaClient)
  }

  async generateDailyPresence(
    config: DailyPresenceReportConfig,
    actor: OperationalReportActor
  ): Promise<DailyPresenceReportResponse> {
    const range = this.getDayRange(config.date)
    const warnings = new Set<string>()
    const scope = await this.resolveScope(config, warnings)
    const members = scope.noResults
      ? []
      : await this.repository.findActiveMembers({
          divisionId: scope.divisionId,
          tagId: scope.tagId,
        })
    const sessionsByMember = await this.getSessionsByMember(members, range, warnings)
    const scheduledDutyRolesByMember = await this.getScheduledDutyRolesByMember(members, range)

    const sortableRows = members
      .map((member) => {
        const memberSessions = sessionsByMember.get(member.id) ?? []
        const overlappingSessions = memberSessions.filter((session) =>
          this.sessionOverlaps(session, range.start, range.end)
        )

        if (overlappingSessions.length === 0) {
          return null
        }

        const stats = this.getPresenceStats(overlappingSessions, range.start, range.end)

        return {
          memberRecord: member,
          row: {
            member: this.toMemberSummary(member, scheduledDutyRolesByMember.get(member.id)),
            firstIn: stats.firstIn,
            lastOut: stats.lastOut,
            sessionCount: stats.sessionCount,
            leftAndReturned: stats.sessionCount > 1,
            sessions: overlappingSessions.map((session) =>
              this.toPresenceSession(session, range.start, range.end)
            ),
          },
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
    const rows = sortDailyPresenceRows(sortableRows, config.sort).map(({ row }) => row)

    return {
      ...this.getEnvelopeBase('daily_presence', 'Daily Presence Report', actor, range, {
        scopeLabel: scope.scopeLabel,
        divisionId: scope.divisionId,
        tagId: scope.tagId,
      }),
      warnings: Array.from(warnings),
      data: {
        summary: {
          totalScopedMembers: members.length,
          presentMembers: rows.length,
          totalSessions: rows.reduce((total, row) => total + row.sessionCount, 0),
          leftAndReturnedCount: rows.filter((row) => row.leftAndReturned).length,
          openSessionCount: rows.reduce(
            (total, row) =>
              total + row.sessions.filter((session) => session.status !== 'complete').length,
            0
          ),
        },
        rows,
      },
    }
  }

  async generateWeeklyPresence(
    config: WeeklyPresenceReportConfig,
    actor: OperationalReportActor
  ): Promise<WeeklyPresenceReportResponse> {
    const range = this.getWeekRange(config.weekStartDate)
    const warnings = new Set<string>()
    const scope = await this.resolveScope(config, warnings)
    const members = scope.noResults
      ? []
      : await this.repository.findActiveMembers({
          divisionId: scope.divisionId,
          tagId: scope.tagId,
        })
    const sessionsByMember = await this.getSessionsByMember(members, range, warnings)
    const scheduledDutyRolesByMember = await this.getScheduledDutyRolesByMember(members, range)
    const keyNights = await this.getKeyNights(range, ['training', 'administrative'], warnings)
    const days = this.getDatesInRange(range).map((date) => ({
      date,
      label: this.formatShortDate(date),
      isTrainingNight: keyNights.some(
        (night) => night.category === 'training' && night.date === date
      ),
      isAdminNight: keyNights.some(
        (night) => night.category === 'administrative' && night.date === date
      ),
    }))

    const rows = members.map((member) => {
      const memberSessions = sessionsByMember.get(member.id) ?? []
      const dayMarkers = days.map((day) =>
        this.getPresenceMarker(day.date, memberSessions, this.formatShortDate(day.date))
      )
      const keyNightMarkers = keyNights.map((night) =>
        this.getKeyNightPresenceMarker(night, member, memberSessions)
      )

      return {
        member: this.toMemberSummary(member, scheduledDutyRolesByMember.get(member.id)),
        days: dayMarkers,
        trainingNightPresent: this.getCategoryPresence('training', keyNights, keyNightMarkers),
        adminNightPresent: this.getCategoryPresence('administrative', keyNights, keyNightMarkers),
        keyNights: keyNightMarkers,
        totalDaysPresent: dayMarkers.filter((marker) => marker.present).length,
        totalSessions: memberSessions.filter((session) =>
          this.sessionOverlaps(session, range.start, range.end)
        ).length,
      }
    })

    return {
      ...this.getEnvelopeBase('weekly_presence', 'Weekly Presence Report', actor, range, {
        scopeLabel: scope.scopeLabel,
        divisionId: scope.divisionId,
        tagId: scope.tagId,
      }),
      warnings: Array.from(warnings),
      data: {
        summary: {
          totalMembers: members.length,
          membersWithPresence: rows.filter((row) => row.totalDaysPresent > 0).length,
          trainingNightCount: keyNights.filter((night) => night.category === 'training').length,
          adminNightCount: keyNights.filter((night) => night.category === 'administrative').length,
        },
        days,
        keyNights: keyNights.map(this.toApiKeyNight),
        rows,
      },
    }
  }

  async generateMonthlyPresence(
    config: MonthlyPresenceReportConfig,
    actor: OperationalReportActor
  ): Promise<MonthlyPresenceReportResponse> {
    const range = this.getMonthRange(config.month)
    const warnings = new Set<string>()
    const scope = await this.resolveScope(config, warnings)
    const members = scope.noResults
      ? []
      : await this.repository.findActiveMembers({
          divisionId: scope.divisionId,
          tagId: scope.tagId,
        })
    const sessionsByMember = await this.getSessionsByMember(members, range, warnings)
    const keyNights = await this.getKeyNights(range, ['training', 'administrative'], warnings)
    const days = this.getDatesInRange(range).map((date) => ({
      date,
      label: DateTime.fromISO(date, { zone: DEFAULT_TIMEZONE }).toFormat('d'),
      isTrainingNight: keyNights.some(
        (night) => night.category === 'training' && night.date === date
      ),
      isAdminNight: keyNights.some(
        (night) => night.category === 'administrative' && night.date === date
      ),
    }))

    const rows = members.map((member) => {
      const memberSessions = sessionsByMember.get(member.id) ?? []
      const dayMarkers = days.map((day) =>
        this.getPresenceMarker(day.date, memberSessions, day.label)
      )
      const keyNightMarkers = keyNights.map((night) =>
        this.getKeyNightPresenceMarker(night, member, memberSessions)
      )

      return {
        member: this.toMemberSummary(member, new Set(), { hideDutyTags: true }),
        days: dayMarkers,
        keyNights: keyNightMarkers,
        totalDaysPresent: dayMarkers.filter((marker) => marker.present).length,
        totalSessions: memberSessions.filter((session) =>
          this.sessionOverlaps(session, range.start, range.end)
        ).length,
        trainingNightsPresent: this.countCategoryPresence('training', keyNights, keyNightMarkers),
        adminNightsPresent: this.countCategoryPresence(
          'administrative',
          keyNights,
          keyNightMarkers
        ),
      }
    })

    return {
      ...this.getEnvelopeBase('monthly_presence', 'Monthly Presence Report', actor, range, {
        scopeLabel: scope.scopeLabel,
        divisionId: scope.divisionId,
        tagId: scope.tagId,
      }),
      warnings: Array.from(warnings),
      data: {
        summary: {
          totalMembers: members.length,
          membersWithPresence: rows.filter((row) => row.totalDaysPresent > 0).length,
          totalMemberDaysPresent: rows.reduce((total, row) => total + row.totalDaysPresent, 0),
          trainingNightCount: keyNights.filter((night) => night.category === 'training').length,
          adminNightCount: keyNights.filter((night) => night.category === 'administrative').length,
        },
        days,
        keyNights: keyNights.map(this.toApiKeyNight),
        rows,
      },
    }
  }

  async generateTrainingNightMonthly(
    config: TrainingNightMonthlyReportConfig,
    actor: OperationalReportActor
  ): Promise<TrainingNightMonthlyReportResponse> {
    const range = this.getMonthRange(config.month)
    const warnings = new Set<string>()
    const division = await this.repository.findDivisionById(config.divisionId)
    if (!division) {
      warnings.add('Selected department was not found. The report has no department members.')
    }
    const members = division
      ? await this.repository.findActiveMembers({ divisionId: config.divisionId })
      : []
    const sessionsByMember = await this.getSessionsByMember(members, range, warnings)
    const keyNights = await this.getKeyNights(range, ['training'], warnings)
    const trainingNights = keyNights.filter((night) => night.category === 'training')

    if (trainingNights.length === 0) {
      warnings.add('No Training Nights were found for the selected month.')
    }

    const rows = members.map((member) => {
      const memberSessions = sessionsByMember.get(member.id) ?? []
      const nightMarkers = trainingNights.map((night) =>
        this.getKeyNightPresenceMarker(night, member, memberSessions)
      )
      const attended = nightMarkers.filter(
        (marker) => marker.present && marker.requirement === 'required'
      ).length
      const possible = nightMarkers.filter((marker) => marker.requirement === 'required').length

      return {
        member: this.toMemberSummary(member, new Set(), { hideDutyTags: true }),
        nights: nightMarkers,
        attended,
        possible,
        percentage: possible > 0 ? Math.round((attended / possible) * 100) : 0,
      }
    })

    return {
      ...this.getEnvelopeBase(
        'training_night_monthly',
        'Training Night Monthly Report',
        actor,
        range,
        {
          scopeLabel: division ? division.name : 'Selected department',
          divisionId: config.divisionId,
        }
      ),
      warnings: Array.from(warnings),
      data: {
        department: division
          ? {
              id: division.id,
              code: division.code,
              name: division.name,
            }
          : null,
        trainingNights: trainingNights.map(this.toApiKeyNight),
        rows,
        summary: {
          totalMembers: members.length,
          trainingNightCount: trainingNights.length,
          averageAttendancePercentage:
            rows.length > 0
              ? Math.round(rows.reduce((total, row) => total + row.percentage, 0) / rows.length)
              : 0,
        },
      },
    }
  }

  async generateVisitorActivity(
    config: VisitorActivityReportConfig,
    actor: OperationalReportActor
  ): Promise<VisitorActivityReportResponse> {
    const range = this.getCustomRange(config.startDate, config.endDate)
    const visitors = await this.repository.findVisitors({
      start: range.start,
      end: range.end,
      visitType: this.blankToUndefined(config.visitType),
      visitorPurpose: this.blankToUndefined(config.visitorPurpose),
      eventLinked: config.eventLinked,
      hostMemberId: config.hostMemberId,
      organization: this.blankToUndefined(config.organization),
    })

    const rows = visitors.map((visitor) => this.toVisitorActivityRow(visitor))

    return {
      ...this.getEnvelopeBase('visitor_activity', 'Visitor Activity Report', actor, range, {
        scopeLabel: 'Visitor activity',
        visitorType: this.blankToUndefined(config.visitType),
        visitorPurpose: this.blankToUndefined(config.visitorPurpose),
        eventCategory:
          config.eventLinked === undefined
            ? undefined
            : config.eventLinked
              ? 'Event-linked visitors'
              : 'Visitors without event link',
      }),
      warnings: [],
      data: {
        summary: {
          totalVisitors: rows.length,
          activeAtEnd: visitors.filter(
            (visitor) => !visitor.checkOutTime || visitor.checkOutTime >= range.end
          ).length,
          byVisitType: this.countByLabel(rows.map((row) => row.visitType)),
          byPurpose: this.countByLabel(rows.map((row) => row.visitPurpose ?? 'Unspecified')),
          byEvent: this.countByLabel(
            visitors.map(
              (visitor) => visitor.unitEvent?.title ?? visitor.event?.name ?? 'No event link'
            )
          ),
        },
        rows,
      },
    }
  }

  async generateOperationalExceptions(
    config: OperationalExceptionsReportConfig,
    actor: OperationalReportActor
  ): Promise<OperationalExceptionsReportResponse> {
    const range = this.getCustomRange(config.startDate, config.endDate)
    const warnings = new Set<string>()
    const scheduleWeekRange = this.getScheduleWeekRange(range)
    const [missedCheckouts, lockupStatuses, scheduledDuties] = await Promise.all([
      this.repository.findMissedCheckouts(range.start, range.end),
      this.repository.findLockupStatuses(range.start, range.end),
      this.repository.findScheduledDutySchedules(
        scheduleWeekRange.firstWeekStart,
        scheduleWeekRange.lastWeekStart
      ),
    ])
    const scheduledDutiesByWeek = this.indexScheduledDutiesByWeek(scheduledDuties)
    const systemForcedCheckoutCountByDate = new Map<string, number>()

    for (const missedCheckout of missedCheckouts) {
      if (missedCheckout.resolvedBy !== 'daily_reset') {
        continue
      }

      const date = this.toLocalDate(missedCheckout.date)
      systemForcedCheckoutCountByDate.set(
        date,
        (systemForcedCheckoutCountByDate.get(date) ?? 0) + 1
      )
    }

    const forcedCheckouts = [
      ...missedCheckouts.map((missedCheckout) => this.toForcedCheckoutRow(missedCheckout)),
      ...lockupStatuses.flatMap((status) => this.toLockupExecutionForcedCheckoutRows(status)),
    ].sort(
      (left, right) =>
        right.forcedCheckoutAt.localeCompare(left.forcedCheckoutAt) ||
        right.operationalDate.localeCompare(left.operationalDate)
    )

    const lockupExceptions = lockupStatuses
      .map((status) => {
        const operationalDate = this.toLocalDate(status.date)
        const systemForcedCheckoutCount = systemForcedCheckoutCountByDate.get(operationalDate) ?? 0
        const notes: string[] = []

        if (status.buildingStatus !== 'secured') {
          notes.push(`Building status remained ${status.buildingStatus}`)
        }

        if (!status.execution) {
          notes.push('No Execute Lockup record')
        }

        if (systemForcedCheckoutCount > 0) {
          notes.push(
            `System forced ${systemForcedCheckoutCount} member${
              systemForcedCheckoutCount === 1 ? '' : 's'
            } out during daily reset`
          )
        }

        if (notes.length === 0) {
          return null
        }

        const scheduledDuty = scheduledDutiesByWeek.get(this.getWeekKeyForDate(operationalDate))
        const expectedDds = scheduledDuty?.dds ?? null
        const expectedSwk = scheduledDuty?.swk ?? null
        const expectedLockupHolder = status.currentHolder
          ? this.toDutyPerson(status.currentHolder)
          : status.securedByMember
            ? this.toDutyPerson(status.securedByMember)
            : (expectedSwk ?? expectedDds)

        return {
          id: status.id,
          operationalDate,
          buildingStatus: status.buildingStatus,
          securedAt: status.securedAt?.toISOString() ?? null,
          expectedDds,
          expectedSwk,
          expectedLockupHolder,
          systemForcedCheckoutCount,
          lockupExecutionId: status.execution?.id ?? null,
          notes,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)

    if (forcedCheckouts.length === 0 && lockupExceptions.length === 0) {
      warnings.add('No forced checkouts or lockup exceptions were found for the selected range.')
    }

    return {
      ...this.getEnvelopeBase(
        'operational_exceptions',
        'Operational Exceptions Report',
        actor,
        range,
        {
          scopeLabel: 'Forced checkouts and lockup exceptions',
        }
      ),
      warnings: Array.from(warnings),
      data: {
        summary: {
          forcedCheckoutCount: forcedCheckouts.length,
          systemForcedCheckoutCount: forcedCheckouts.filter(
            (row) => row.resolvedBy === 'daily_reset'
          ).length,
          adminForcedCheckoutCount: forcedCheckouts.filter((row) => row.resolvedBy === 'admin')
            .length,
          lockupExceptionCount: lockupExceptions.length,
        },
        forcedCheckouts,
        lockupExceptions,
      },
    }
  }

  private getEnvelopeBase<
    TReportType extends
      | 'daily_presence'
      | 'weekly_presence'
      | 'monthly_presence'
      | 'training_night_monthly'
      | 'visitor_activity'
      | 'operational_exceptions',
  >(
    reportType: TReportType,
    title: string,
    actor: OperationalReportActor,
    range: DateRange,
    filters: {
      scopeLabel: string
      divisionId?: string
      tagId?: string
      visitorType?: string
      visitorPurpose?: string
      eventCategory?: string
    }
  ) {
    return {
      reportType,
      title,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: actor.id,
        displayName: this.formatActorName(actor),
      },
      unitName: UNIT_NAME,
      dateRange: {
        startDate: range.startDate,
        endDate: range.endDate,
        label: range.label,
      },
      filters,
    }
  }

  private async resolveScope(
    config: {
      scopeType?: ReportScopeType
      divisionId?: string
      tagId?: string
    },
    warnings: Set<string>
  ): Promise<EffectiveScope> {
    const scopeType = config.scopeType ?? 'everyone'

    if (scopeType === 'department') {
      if (!config.divisionId) {
        warnings.add('Department scope was selected, but no department was provided.')
        return {
          scopeLabel: 'Department',
          warnings: Array.from(warnings),
          noResults: true,
        }
      }

      const division = await this.repository.findDivisionById(config.divisionId)
      if (!division) {
        warnings.add('Selected department was not found.')
        return {
          divisionId: config.divisionId,
          scopeLabel: 'Selected department',
          warnings: Array.from(warnings),
          noResults: true,
        }
      }

      return {
        divisionId: division.id,
        scopeLabel: division.name,
        warnings: Array.from(warnings),
        noResults: false,
      }
    }

    if (scopeType === 'tag') {
      if (!config.tagId) {
        warnings.add('Tag scope was selected, but no tag was provided.')
        return {
          scopeLabel: 'Specific tag',
          warnings: Array.from(warnings),
          noResults: true,
        }
      }

      const tag = await this.repository.findTagById(config.tagId)
      if (!tag) {
        warnings.add('Selected tag was not found.')
        return {
          tagId: config.tagId,
          scopeLabel: 'Specific tag',
          warnings: Array.from(warnings),
          noResults: true,
        }
      }

      return {
        tagId: tag.id,
        scopeLabel: tag.name,
        warnings: Array.from(warnings),
        noResults: false,
      }
    }

    if (scopeType === 'fts' || scopeType === 'geo') {
      const tag = await this.repository.findTagShortcut(scopeType)
      if (!tag) {
        warnings.add(`${scopeType.toUpperCase()} tag was not found. No tag IDs were hardcoded.`)
        return {
          scopeLabel: `${scopeType.toUpperCase()} tag shortcut`,
          warnings: Array.from(warnings),
          noResults: true,
        }
      }

      return {
        tagId: tag.id,
        scopeLabel: tag.name,
        warnings: Array.from(warnings),
        noResults: false,
      }
    }

    return {
      scopeLabel: 'Everyone',
      warnings: Array.from(warnings),
      noResults: false,
    }
  }

  private async getSessionsByMember(
    members: OperationalReportMemberRecord[],
    range: DateRange,
    warnings: Set<string>
  ): Promise<Map<string, PresenceSessionInternal[]>> {
    const memberIds = members.map((member) => member.id)
    const queryStart = DateTime.fromJSDate(range.start, { zone: DEFAULT_TIMEZONE })
      .minus({ days: REPORT_LOOKBACK_DAYS })
      .toJSDate()
    const checkins = await this.repository.findCheckinsForMembers(memberIds, queryStart, range.end)
    return this.pairSessions(checkins, warnings)
  }

  private pairSessions(
    checkins: OperationalReportCheckinRecord[],
    warnings: Set<string>
  ): Map<string, PresenceSessionInternal[]> {
    return pairOperationalPresenceSessions(checkins, warnings)
  }

  private getPresenceMarker(
    date: string,
    sessions: PresenceSessionInternal[],
    label: string
  ): PresenceMarker {
    const range = this.getDayRange(date)
    const overlapping = sessions.filter((session) =>
      this.sessionOverlaps(session, range.start, range.end)
    )
    const stats = this.getPresenceStats(overlapping, range.start, range.end)

    return {
      date,
      label,
      present: stats.present,
      firstIn: stats.firstIn,
      lastOut: stats.lastOut,
      sessionCount: stats.sessionCount,
      note: stats.note,
    }
  }

  private getPresenceStats(
    sessions: PresenceSessionInternal[],
    start: Date,
    end: Date
  ): PresenceStats {
    const overlapping = sessions.filter((session) => this.sessionOverlaps(session, start, end))
    const firstIn = this.minDate(
      overlapping.map((session) => session.inAt).filter((date) => date >= start && date < end)
    )
    const lastOut = this.maxDate(
      overlapping
        .map((session) => session.outAt)
        .filter((date): date is Date => date !== null && date >= start && date < end)
    )
    const hasOpen = overlapping.some((session) => session.outAt === null)

    return {
      present: overlapping.length > 0,
      firstIn: firstIn?.toISOString() ?? null,
      lastOut: lastOut?.toISOString() ?? null,
      sessionCount: overlapping.length,
      note: hasOpen ? 'Still present / no checkout recorded' : null,
    }
  }

  private getKeyNightPresenceMarker(
    night: KeyNightWindow,
    member: OperationalReportMemberRecord,
    sessions: PresenceSessionInternal[]
  ) {
    const range =
      night.start && night.end
        ? { start: night.start, end: night.end }
        : this.getDayRange(night.date)
    const stats = this.getPresenceStats(sessions, range.start, range.end)

    return {
      keyNightId: night.id,
      present: stats.present,
      firstIn: stats.firstIn,
      lastOut: stats.lastOut,
      requirement: this.getKeyNightRequirement(night, member),
    }
  }

  private async getKeyNights(
    range: DateRange,
    categories: KeyNightCategory[],
    warnings: Set<string>
  ): Promise<KeyNightWindow[]> {
    const events = await this.repository.findUnitEvents(range.start, range.end, categories)
    const eventNights = events.map((event) => this.toKeyNightFromEvent(event))
    const operationalTimingResult = await this.getOperationalTimingKeyNights(
      range,
      categories,
      warnings
    )
    const fallbackNights = operationalTimingResult.hasConfiguredRules
      ? []
      : await this.getScheduleKeyNights(range, categories, warnings)
    const deduped = new Map<string, KeyNightWindow>()

    for (const night of fallbackNights) {
      deduped.set(`${night.category}:${night.date}`, night)
    }

    for (const night of operationalTimingResult.nights) {
      deduped.set(`${night.category}:${night.date}`, night)
    }

    for (const night of eventNights) {
      deduped.set(`${night.category}:${night.date}`, night)
    }

    const result = Array.from(deduped.values()).sort((left, right) =>
      `${left.date}:${left.category}`.localeCompare(`${right.date}:${right.category}`)
    )

    for (const category of categories) {
      if (!result.some((night) => night.category === category)) {
        warnings.add(
          `No ${category === 'training' ? 'Training' : 'Admin'} Nights were found from Unit Events, Operational Timings rules, or report schedule settings.`
        )
      }
    }

    return result
  }

  private async getOperationalTimingKeyNights(
    range: DateRange,
    categories: KeyNightCategory[],
    warnings: Set<string>
  ): Promise<{ nights: KeyNightWindow[]; hasConfiguredRules: boolean }> {
    const value = await this.repository.findAppSettingValue(OPERATIONAL_TIMINGS_SETTING_KEY_V3)
    if (!value) {
      return { nights: [], hasConfiguredRules: false }
    }

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, value)
    if (!parsed.success) {
      warnings.add(
        'Operational Timings settings are present but invalid; generated Training/Admin Nights were omitted.'
      )
      return { nights: [], hasConfiguredRules: false }
    }

    const rules = parsed.output.operational.nightRules
    const hasConfiguredRules = rules.length > 0
    if (!hasConfiguredRules) {
      return { nights: [], hasConfiguredRules }
    }

    const dates = this.getDatesInRange(range)
    const startDate = dates[0]
    const endDate = dates.at(-1)
    if (!startDate || !endDate) {
      return { nights: [], hasConfiguredRules }
    }

    const nightTypes = categories.map((category) => this.toOperationalNightType(category))
    const occurrences = listOperationalNightOccurrencesInRange(
      rules,
      parsed.output.operational.nightCancellations,
      startDate,
      endDate,
      { nightTypes }
    )

    return {
      nights: occurrences.map((occurrence) => this.toOperationalTimingKeyNight(occurrence)),
      hasConfiguredRules,
    }
  }

  private async getScheduleKeyNights(
    range: DateRange,
    categories: KeyNightCategory[],
    warnings: Set<string>
  ): Promise<KeyNightWindow[]> {
    const value = await this.repository.findReportSettingValue('schedule')
    if (!value) {
      return []
    }

    const parsed = v.safeParse(ScheduleSettingsValueSchema, value)
    if (!parsed.success) {
      warnings.add(
        'Report schedule settings are present but invalid; schedule nights were omitted.'
      )
      return []
    }

    const schedule = parsed.output
    const nights: KeyNightWindow[] = []
    const dates = this.getDatesInRange(range)

    for (const date of dates) {
      const weekday = DateTime.fromISO(date, { zone: DEFAULT_TIMEZONE }).weekday

      if (
        categories.includes('training') &&
        weekday === this.dayNameToIsoWeekday(schedule.trainingNightDay)
      ) {
        nights.push(
          this.toScheduleKeyNight(
            'training',
            date,
            'Training Night',
            schedule.trainingNightStart,
            schedule.trainingNightEnd
          )
        )
      }

      if (
        categories.includes('administrative') &&
        weekday === this.dayNameToIsoWeekday(schedule.adminNightDay)
      ) {
        nights.push(
          this.toScheduleKeyNight(
            'administrative',
            date,
            'Admin Night',
            schedule.adminNightStart,
            schedule.adminNightEnd
          )
        )
      }
    }

    return nights
  }

  private toKeyNightFromEvent(event: OperationalReportUnitEventRecord): KeyNightWindow {
    const date = event.eventDate.toISOString().substring(0, 10)
    const endDate = event.endDate?.toISOString().substring(0, 10) ?? date
    const category = event.eventType?.category === 'administrative' ? 'administrative' : 'training'
    const startTime = event.startTime ? event.startTime.toISOString().substring(11, 16) : null
    const endTime = event.endTime ? event.endTime.toISOString().substring(11, 16) : null
    const start = startTime ? this.dateTimeFromLocalDateAndTime(date, startTime) : null
    const end = start
      ? endTime
        ? this.ensureEndAfterStart(start, this.dateTimeFromLocalDateAndTime(endDate, endTime))
        : DateTime.fromJSDate(start, { zone: DEFAULT_TIMEZONE })
            .plus({ minutes: event.eventType?.defaultDurationMinutes ?? 120 })
            .toJSDate()
      : null

    return {
      id: `unit-event:${event.id}`,
      category,
      source: 'unit_event',
      ruleId: null,
      date,
      label: this.formatShortDate(date),
      title: event.title,
      startAt: start?.toISOString() ?? null,
      endAt: end?.toISOString() ?? null,
      requiredAudienceLabel: null,
      optionalAudienceLabel: null,
      start,
      end,
      requiredAudience: [],
      optionalAudience: [],
    }
  }

  private toOperationalTimingKeyNight(occurrence: OperationalNightOccurrence): KeyNightWindow {
    const category = this.toKeyNightCategory(occurrence.nightType)
    const start = this.dateTimeFromLocalDateAndTime(occurrence.date, occurrence.startTime)
    const end = this.ensureEndAfterStart(
      start,
      this.dateTimeFromLocalDateAndTime(occurrence.date, occurrence.endTime)
    )

    return {
      id: `operational-timings:${occurrence.ruleId}:${occurrence.date}`,
      category,
      source: 'operational_timings',
      ruleId: occurrence.ruleId,
      date: occurrence.date,
      label: this.formatShortDate(occurrence.date),
      title: occurrence.ruleName,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      requiredAudienceLabel: this.formatAudienceSummary(occurrence.requiredAudience),
      optionalAudienceLabel: this.formatAudienceSummary(occurrence.optionalAudience),
      start,
      end,
      requiredAudience: occurrence.requiredAudience,
      optionalAudience: occurrence.optionalAudience,
    }
  }

  private toScheduleKeyNight(
    category: KeyNightCategory,
    date: string,
    title: string,
    startTime: string,
    endTime: string
  ): KeyNightWindow {
    const start = this.dateTimeFromLocalDateAndTime(date, startTime)
    const end = this.ensureEndAfterStart(start, this.dateTimeFromLocalDateAndTime(date, endTime))

    return {
      id: `report-settings:${category}:${date}`,
      category,
      source: 'report_settings',
      ruleId: null,
      date,
      label: this.formatShortDate(date),
      title,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      requiredAudienceLabel: 'Everyone',
      optionalAudienceLabel: null,
      start,
      end,
      requiredAudience: [{ targetType: 'everyone', targetId: null }],
      optionalAudience: [],
    }
  }

  private toApiKeyNight(night: KeyNightWindow): KeyNight {
    return {
      id: night.id,
      category: night.category,
      source: night.source,
      ruleId: night.ruleId,
      date: night.date,
      label: night.label,
      title: night.title,
      startAt: night.startAt,
      endAt: night.endAt,
      requiredAudienceLabel: night.requiredAudienceLabel,
      optionalAudienceLabel: night.optionalAudienceLabel,
    }
  }

  private toOperationalNightType(category: KeyNightCategory): OperationalNightType {
    return category === 'administrative' ? 'administrative' : 'training'
  }

  private toKeyNightCategory(nightType: OperationalNightType): KeyNightCategory {
    return nightType === 'administrative' ? 'administrative' : 'training'
  }

  private formatAudienceSummary(targets: OperationalNightAudienceTarget[]): string | null {
    if (targets.length === 0) {
      return null
    }

    if (targets.some((target) => target.targetType === 'everyone')) {
      return 'Everyone'
    }

    const labels = targets.map((target) => {
      if (target.targetType === 'division') {
        return 'Department'
      }
      if (target.targetType === 'tag') {
        return 'Tag'
      }
      return 'Member type'
    })
    const counts = this.countByLabel(labels)

    return counts
      .map((item) => `${item.count} ${item.label}${item.count === 1 ? '' : 's'}`)
      .join(', ')
  }

  private getKeyNightRequirement(
    night: KeyNightWindow,
    member: OperationalReportMemberRecord
  ): KeyNightRequirement {
    if (night.requiredAudience.length === 0 && night.optionalAudience.length === 0) {
      return 'required'
    }

    if (this.memberMatchesAudience(member, night.requiredAudience)) {
      return 'required'
    }

    if (this.memberMatchesAudience(member, night.optionalAudience)) {
      return 'optional'
    }

    return 'not_expected'
  }

  private memberMatchesAudience(
    member: OperationalReportMemberRecord,
    targets: OperationalNightAudienceTarget[]
  ): boolean {
    return targets.some((target) => this.memberMatchesAudienceTarget(member, target))
  }

  private memberMatchesAudienceTarget(
    member: OperationalReportMemberRecord,
    target: OperationalNightAudienceTarget
  ): boolean {
    if (target.targetType === 'everyone') {
      return true
    }

    if (target.targetType === 'division') {
      return member.divisionId === target.targetId
    }

    if (target.targetType === 'member_type') {
      return member.memberTypeId === target.targetId
    }

    return this.memberHasTag(member, target.targetId)
  }

  private memberHasTag(member: OperationalReportMemberRecord, tagId: string | null): boolean {
    if (!tagId) {
      return false
    }

    return (
      member.memberTags.some((memberTag) => memberTag.tagId === tagId) ||
      member.qualifications.some((qualification) => qualification.qualificationType.tagId === tagId)
    )
  }

  private toMemberSummary(
    member: OperationalReportMemberRecord,
    scheduledRoleCodes: ReadonlySet<OperationalReportScheduledDutyRoleCode> = new Set(),
    options: ReportMemberSummaryOptions = {}
  ): ReportMemberSummary {
    const directTags = member.memberTags.map<ReportTagSummary>((memberTag) => ({
      id: memberTag.tag.id,
      name: memberTag.tag.name,
      chipVariant: memberTag.tag.chipVariant,
      chipColor: memberTag.tag.chipColor,
      isPositional: memberTag.tag.isPositional,
      source: 'direct',
    }))
    const qualificationTags = member.qualifications
      .map((qualification) => qualification.qualificationType.tag)
      .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
      .map<ReportTagSummary>((tag) => ({
        id: tag.id,
        name: tag.name,
        chipVariant: tag.chipVariant,
        chipColor: tag.chipColor,
        isPositional: tag.isPositional,
        source: 'qualification',
      }))
    const tags = filterReportMemberTagsForScheduledDuty(
      this.dedupeTags([...directTags, ...qualificationTags]),
      scheduledRoleCodes,
      options
    )

    return {
      id: member.id,
      displayName:
        member.displayName ??
        [member.rank, member.firstName, member.lastName].filter(Boolean).join(' '),
      rank: member.rank,
      status: member.memberStatusRef?.name ?? member.status,
      division: member.division
        ? {
            id: member.division.id,
            code: member.division.code,
            name: member.division.name,
          }
        : null,
      memberType: member.memberTypeRef?.name ?? member.memberType,
      tags,
    }
  }

  private toPresenceSession(
    session: PresenceSessionInternal,
    start: Date,
    end: Date
  ): PresenceSession {
    const clippedIn = session.inAt < start ? start : session.inAt
    const rawOut = session.outAt && session.outAt > end ? end : session.outAt
    const clippedOut = rawOut && rawOut < start ? start : rawOut

    return {
      inAt: clippedIn.toISOString(),
      outAt: clippedOut?.toISOString() ?? null,
      durationMinutes: clippedOut
        ? Math.max(0, Math.round((clippedOut.getTime() - clippedIn.getTime()) / 60_000))
        : null,
      status: session.status,
    }
  }

  private toVisitorActivityRow(visitor: OperationalReportVisitorRecord) {
    const displayName = visitor.displayName ?? visitor.name
    const hostMember =
      visitor.hostMember && !isSentinelBootstrapMember(visitor.hostMember)
        ? visitor.hostMember
        : null
    const hostName = hostMember
      ? (hostMember.displayName ??
        [hostMember.rank, hostMember.firstName, hostMember.lastName].filter(Boolean).join(' '))
      : null

    return {
      id: visitor.id,
      displayName,
      organization: visitor.organization,
      visitType: visitor.visitType,
      visitPurpose: visitor.visitPurpose,
      visitReason: visitor.visitReason,
      checkInTime: visitor.checkInTime.toISOString(),
      checkOutTime: visitor.checkOutTime?.toISOString() ?? null,
      durationMinutes: visitor.checkOutTime
        ? Math.max(
            0,
            Math.round((visitor.checkOutTime.getTime() - visitor.checkInTime.getTime()) / 60_000)
          )
        : null,
      event: visitor.unitEvent
        ? {
            id: visitor.unitEvent.id,
            name: visitor.unitEvent.title,
          }
        : visitor.event
          ? {
              id: visitor.event.id,
              name: visitor.event.name,
            }
          : null,
      host:
        hostMember && hostName
          ? {
              id: hostMember.id,
              displayName: hostName,
            }
          : null,
    }
  }

  private toForcedCheckoutRow(missedCheckout: OperationalReportMissedCheckoutRecord) {
    return {
      id: missedCheckout.id,
      operationalDate: this.toLocalDate(missedCheckout.date),
      member: this.toDutyPerson(missedCheckout.member),
      originalCheckinAt: missedCheckout.originalCheckinAt.toISOString(),
      forcedCheckoutAt: missedCheckout.forcedCheckoutAt.toISOString(),
      resolvedBy: missedCheckout.resolvedBy,
      resolverLabel: this.getForcedCheckoutResolverLabel(missedCheckout),
      notes: missedCheckout.notes,
    }
  }

  private toLockupExecutionForcedCheckoutRows(status: OperationalReportLockupStatusRecord) {
    if (!status.execution) {
      return []
    }

    const members = this.getLockupCheckedOutMembers(status.execution.membersCheckedOut)
    const executorName = this.formatDutyPerson(status.execution.executedByMember)

    return members
      .filter((member) => member.id !== status.execution?.executedBy)
      .map((member) => ({
        id: `${status.execution?.id ?? status.id}-${member.id}`,
        operationalDate: this.toLocalDate(status.date),
        member: {
          id: member.id,
          displayName: member.name,
          rank: '',
        },
        originalCheckinAt:
          status.execution?.executedAt.toISOString() ?? status.createdAt.toISOString(),
        forcedCheckoutAt:
          status.execution?.executedAt.toISOString() ?? status.createdAt.toISOString(),
        resolvedBy: 'lockup_execution',
        resolverLabel: `Execute Lockup by ${executorName}`,
        notes: 'Checked out during Execute Lockup',
      }))
  }

  private getForcedCheckoutResolverLabel(
    missedCheckout: OperationalReportMissedCheckoutRecord
  ): string {
    if (missedCheckout.resolvedBy === 'daily_reset') {
      return 'System daily reset'
    }

    if (missedCheckout.resolvedBy === 'admin') {
      return missedCheckout.resolvedByAdmin?.displayName ?? 'Admin manual checkout'
    }

    if (missedCheckout.resolvedBy === 'lockup_sequence') {
      return 'Execute Lockup'
    }

    return missedCheckout.resolvedBy
  }

  private getLockupCheckedOutMembers(value: unknown): LockupCheckedOutMember[] {
    if (!Array.isArray(value)) {
      return []
    }

    return value.filter((item): item is LockupCheckedOutMember => {
      if (typeof item !== 'object' || item === null) {
        return false
      }

      const candidate = item as { id?: unknown; name?: unknown }
      return typeof candidate.id === 'string' && typeof candidate.name === 'string'
    })
  }

  private indexScheduledDutiesByWeek(schedules: OperationalReportScheduledDutyRecord[]) {
    const result = new Map<string, { dds: ReportDutyPerson | null; swk: ReportDutyPerson | null }>()

    for (const schedule of schedules) {
      const weekKey = this.toLocalDate(schedule.weekStartDate)
      const current = result.get(weekKey) ?? { dds: null, swk: null }

      if (schedule.dutyRole.code === 'DDS') {
        const assignment = schedule.assignments[0]
        current.dds = assignment ? this.toDutyPerson(assignment.member) : current.dds
      }

      if (schedule.dutyRole.code === 'DUTY_WATCH') {
        const swkAssignment = schedule.assignments.find(
          (assignment) => assignment.dutyPosition?.code === 'SWK'
        )
        current.swk = swkAssignment ? this.toDutyPerson(swkAssignment.member) : current.swk
      }

      result.set(weekKey, current)
    }

    return result
  }

  private getWeekKeyForDate(date: string): string {
    return DateTime.fromISO(date, { zone: DEFAULT_TIMEZONE }).startOf('week').toISODate() ?? date
  }

  private toLocalDate(date: Date): string {
    return DateTime.fromJSDate(date, { zone: DEFAULT_TIMEZONE }).toISODate() ?? date.toISOString()
  }

  private toDutyPerson(member: {
    id: string
    rank: string
    firstName: string
    lastName: string
    displayName: string | null
  }): ReportDutyPerson {
    return {
      id: member.id,
      rank: member.rank,
      displayName: this.formatDutyPerson(member),
    }
  }

  private formatDutyPerson(member: {
    rank: string
    firstName: string
    lastName: string
    displayName: string | null
  }): string {
    return member.displayName ?? [member.rank, member.firstName, member.lastName].join(' ')
  }

  private sessionOverlaps(session: PresenceSessionInternal, start: Date, end: Date): boolean {
    if (isStaleForcedCheckoutSession(session, start)) {
      return false
    }

    return presenceSessionOverlapsRange(session, start, end)
  }

  private getCategoryPresence(
    category: KeyNightCategory,
    keyNights: KeyNightWindow[],
    markers: Array<{ keyNightId: string; present: boolean }>
  ): boolean | null {
    const categoryNights = keyNights.filter((night) => night.category === category)
    if (categoryNights.length === 0) {
      return null
    }

    return categoryNights.some((night) =>
      markers.some((marker) => marker.keyNightId === night.id && marker.present)
    )
  }

  private countCategoryPresence(
    category: KeyNightCategory,
    keyNights: KeyNightWindow[],
    markers: Array<{ keyNightId: string; present: boolean }>
  ): number {
    const categoryNightIds = new Set(
      keyNights.filter((night) => night.category === category).map((night) => night.id)
    )
    return markers.filter((marker) => categoryNightIds.has(marker.keyNightId) && marker.present)
      .length
  }

  private dedupeTags(tags: ReportTagSummary[]): ReportTagSummary[] {
    const seen = new Set<string>()
    const result: ReportTagSummary[] = []

    for (const tag of tags) {
      if (seen.has(tag.id)) {
        continue
      }
      seen.add(tag.id)
      result.push(tag)
    }

    return result.sort((left, right) => left.name.localeCompare(right.name))
  }

  private async getScheduledDutyRolesByMember(
    members: OperationalReportMemberRecord[],
    range: DateRange
  ): Promise<ScheduledDutyRolesByMember> {
    if (members.length === 0) {
      return new Map()
    }

    const memberIds = members.map((member) => member.id)
    const { firstWeekStart, lastWeekStart } = this.getScheduleWeekRange(range)
    const ddsStartDate = DateTime.fromISO(range.startDate, { zone: 'utc' }).startOf('day')
    const ddsEndDate = DateTime.fromISO(range.endDate, { zone: 'utc' })
      .plus({ days: 1 })
      .startOf('day')
    const [scheduledAssignments, ddsAssignments, liveAssignments] = await Promise.all([
      this.repository.findScheduledDutyAssignmentsForMembers(
        memberIds,
        firstWeekStart,
        lastWeekStart
      ),
      this.repository.findDdsAssignmentsForMembers(
        memberIds,
        ddsStartDate.toJSDate(),
        ddsEndDate.toJSDate()
      ),
      this.repository.findLiveDutyAssignmentsForMembers(memberIds, range.start, range.end),
    ])
    const scheduledRolesByMember: ScheduledDutyRolesByMember = new Map()

    for (const assignment of [...scheduledAssignments, ...ddsAssignments, ...liveAssignments]) {
      const roleCodes = scheduledRolesByMember.get(assignment.memberId) ?? new Set()
      roleCodes.add(assignment.dutyRoleCode)
      scheduledRolesByMember.set(assignment.memberId, roleCodes)
    }

    return scheduledRolesByMember
  }

  private countByLabel(labels: string[]) {
    const counts = new Map<string, number>()
    for (const label of labels) {
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
  }

  private minDate(dates: Date[]): Date | null {
    if (dates.length === 0) {
      return null
    }
    return new Date(Math.min(...dates.map((date) => date.getTime())))
  }

  private maxDate(dates: Date[]): Date | null {
    if (dates.length === 0) {
      return null
    }
    return new Date(Math.max(...dates.map((date) => date.getTime())))
  }

  private getDayRange(date: string): DateRange {
    const dayStart = getOperationalDayStartTime()
    const start = DateTime.fromISO(date, { zone: DEFAULT_TIMEZONE }).set({
      hour: dayStart.hour,
      minute: dayStart.minute,
      second: 0,
      millisecond: 0,
    })
    const end = start.plus({ days: 1 })
    return {
      start: start.toJSDate(),
      end: end.toJSDate(),
      startDate: start.toISODate() ?? date,
      endDate: start.toISODate() ?? date,
      label: start.toFormat('cccc, LLL d, yyyy'),
    }
  }

  private getWeekRange(weekStartDate: string): DateRange {
    const start = DateTime.fromISO(weekStartDate, { zone: DEFAULT_TIMEZONE })
      .startOf('week')
      .startOf('day')
    const end = start.plus({ days: 7 })
    const endInclusive = end.minus({ days: 1 })
    return {
      start: start.toJSDate(),
      end: end.toJSDate(),
      startDate: start.toISODate() ?? weekStartDate,
      endDate: endInclusive.toISODate() ?? weekStartDate,
      label: `${start.toFormat('LLL d')} - ${endInclusive.toFormat('LLL d, yyyy')}`,
    }
  }

  private getMonthRange(month: string): DateRange {
    const start = DateTime.fromISO(`${month}-01`, { zone: DEFAULT_TIMEZONE }).startOf('month')
    const end = start.plus({ months: 1 })
    const endInclusive = end.minus({ days: 1 })
    return {
      start: start.toJSDate(),
      end: end.toJSDate(),
      startDate: start.toISODate() ?? `${month}-01`,
      endDate: endInclusive.toISODate() ?? `${month}-01`,
      label: start.toFormat('LLLL yyyy'),
    }
  }

  private getScheduleWeekRange(range: DateRange): {
    firstWeekStart: Date
    lastWeekStart: Date
  } {
    const firstWeekStart = DateTime.fromJSDate(range.start, { zone: DEFAULT_TIMEZONE })
      .startOf('week')
      .startOf('day')
    const lastReportDay = DateTime.fromJSDate(range.end, { zone: DEFAULT_TIMEZONE })
      .minus({ days: 1 })
      .startOf('day')
    const lastWeekStart = lastReportDay.startOf('week').startOf('day')

    return {
      firstWeekStart: firstWeekStart.toJSDate(),
      lastWeekStart: lastWeekStart.toJSDate(),
    }
  }

  private getCustomRange(startDate: string, endDate: string): DateRange {
    const start = DateTime.fromISO(startDate, { zone: DEFAULT_TIMEZONE }).startOf('day')
    const endInclusive = DateTime.fromISO(endDate, { zone: DEFAULT_TIMEZONE }).startOf('day')
    const end = endInclusive.plus({ days: 1 })
    return {
      start: start.toJSDate(),
      end: end.toJSDate(),
      startDate: start.toISODate() ?? startDate,
      endDate: endInclusive.toISODate() ?? endDate,
      label:
        start.toISODate() === endInclusive.toISODate()
          ? start.toFormat('cccc, LLL d, yyyy')
          : `${start.toFormat('LLL d, yyyy')} - ${endInclusive.toFormat('LLL d, yyyy')}`,
    }
  }

  private getDatesInRange(range: DateRange): string[] {
    const dates: string[] = []
    let cursor = DateTime.fromJSDate(range.start, { zone: DEFAULT_TIMEZONE }).startOf('day')
    const end = DateTime.fromJSDate(range.end, { zone: DEFAULT_TIMEZONE }).startOf('day')

    while (cursor < end) {
      const date = cursor.toISODate()
      if (date) {
        dates.push(date)
      }
      cursor = cursor.plus({ days: 1 })
    }

    return dates
  }

  private dateTimeFromLocalDateAndTime(date: string, time: string): Date {
    return DateTime.fromISO(`${date}T${time}:00`, { zone: DEFAULT_TIMEZONE }).toJSDate()
  }

  private ensureEndAfterStart(start: Date, end: Date): Date {
    if (end > start) {
      return end
    }

    return DateTime.fromJSDate(end, { zone: DEFAULT_TIMEZONE }).plus({ days: 1 }).toJSDate()
  }

  private formatShortDate(date: string): string {
    return DateTime.fromISO(date, { zone: DEFAULT_TIMEZONE }).toFormat('ccc LLL d')
  }

  private dayNameToIsoWeekday(dayName: string): number {
    const map: Record<string, number> = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 7,
    }

    return map[dayName] ?? 1
  }

  private formatActorName(actor: OperationalReportActor): string {
    return [actor.rank, actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.id
  }

  private blankToUndefined(value: string | undefined): string | undefined {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
  }
}
