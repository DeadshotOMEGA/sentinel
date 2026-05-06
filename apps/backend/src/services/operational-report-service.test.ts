import { describe, expect, it } from 'vitest'
import {
  pairOperationalPresenceSessions,
  type PresenceSessionInternal,
} from './operational-report-service.js'
import type { OperationalReportCheckinRecord } from '../repositories/operational-report-repository.js'

function checkin(
  id: string,
  memberId: string,
  direction: 'in' | 'out',
  timestamp: string
): OperationalReportCheckinRecord {
  return {
    id,
    memberId,
    direction,
    timestamp: new Date(timestamp),
  }
}

function getSessions(
  sessionsByMember: Map<string, PresenceSessionInternal[]>,
  memberId: string
): PresenceSessionInternal[] {
  return sessionsByMember.get(memberId) ?? []
}

describe('pairOperationalPresenceSessions', () => {
  it('pairs each check-in with the next valid checkout for the same member', () => {
    const warnings = new Set<string>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [
        checkin('1', 'member-1', 'in', '2026-05-05T08:00:00.000Z'),
        checkin('2', 'member-1', 'out', '2026-05-05T12:00:00.000Z'),
        checkin('3', 'member-1', 'in', '2026-05-05T13:00:00.000Z'),
        checkin('4', 'member-1', 'out', '2026-05-05T16:00:00.000Z'),
      ],
      warnings
    )

    const sessions = getSessions(sessionsByMember, 'member-1')
    expect(sessions).toHaveLength(2)
    expect(sessions.map((session) => session.status)).toEqual(['complete', 'complete'])
    expect(sessions[0]?.inAt.toISOString()).toBe('2026-05-05T08:00:00.000Z')
    expect(sessions[0]?.outAt?.toISOString()).toBe('2026-05-05T12:00:00.000Z')
    expect(warnings.size).toBe(0)
  })

  it('marks repeated check-ins without checkout as degraded and keeps the latest session open', () => {
    const warnings = new Set<string>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [
        checkin('1', 'member-1', 'in', '2026-05-05T08:00:00.000Z'),
        checkin('2', 'member-1', 'in', '2026-05-05T09:00:00.000Z'),
      ],
      warnings
    )

    const sessions = getSessions(sessionsByMember, 'member-1')
    expect(sessions).toHaveLength(2)
    expect(sessions.map((session) => session.status)).toEqual(['degraded', 'open'])
    expect(sessions[0]?.outAt).toBeNull()
    expect(Array.from(warnings)).toContain(
      'Some members have multiple check-ins without an intervening checkout; affected sessions are marked as degraded.'
    )
  })

  it('warns and ignores unmatched checkouts', () => {
    const warnings = new Set<string>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [checkin('1', 'member-1', 'out', '2026-05-05T12:00:00.000Z')],
      warnings
    )

    expect(getSessions(sessionsByMember, 'member-1')).toHaveLength(0)
    expect(Array.from(warnings)).toContain(
      'Some checkout records could not be paired with a prior check-in and were ignored.'
    )
  })
})
