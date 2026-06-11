import { describe, expect, it } from 'vitest'
import type { SecurityAlertResponse } from '@sentinel/contracts'
import { buildSecurityAlertDisplayItems, getSecurityAlertTone } from './security-alerts-bar.logic'

function createAlert(overrides: Partial<SecurityAlertResponse>): SecurityAlertResponse {
  return {
    id: 'alert-1',
    alertType: 'system',
    severity: 'warning',
    badgeSerial: null,
    memberId: null,
    kioskId: 'SYSTEM',
    message: 'Alert message',
    details: null,
    status: 'active',
    createdAt: '2026-06-10T12:00:00.000Z',
    ...overrides,
  }
}

describe('security alerts bar logic', () => {
  it('groups related DDS lockup follow-up alerts into one display item', () => {
    const items = buildSecurityAlertDisplayItems([
      createAlert({
        id: 'lockup',
        alertType: 'lockup_not_executed',
        severity: 'critical',
        message: 'Building lockup is overdue',
        createdAt: '2026-06-10T22:30:00.000Z',
      }),
      createAlert({
        id: 'duty-watch',
        alertType: 'duty_watch_missing',
        severity: 'warning',
        message: 'Duty watch is missing personnel',
        createdAt: '2026-06-11T07:00:00.000Z',
      }),
      createAlert({
        id: 'checkout',
        alertType: 'member_missed_checkout',
        severity: 'warning',
        message: 'Members were force-checked out',
        createdAt: '2026-06-11T06:55:00.000Z',
      }),
    ])

    expect(items).toHaveLength(1)
    expect(items[0]?.kind).toBe('group')

    if (items[0]?.kind !== 'group') {
      throw new Error('Expected grouped DDS alert item')
    }

    expect(items[0].alerts.map((alert) => alert.id)).toEqual(['duty-watch', 'checkout', 'lockup'])
    expect(items[0].severity).toBe('critical')
    expect(items[0].summary).toContain('3 related DDS alerts')
    expect(items[0].summary).toContain('lockup was not completed')
    expect(items[0].summary).toContain('duty watch coverage needs review')
    expect(items[0].summary).toContain('checkout cleanup ran')
    expect(items[0].nextStep).toContain('Confirm the real building state')
    expect(items[0].wikiSlug).toBe('operations/dashboard/alerts/missed-lockup-follow-up')
  })

  it('keeps a single lockup alert ungrouped', () => {
    const items = buildSecurityAlertDisplayItems([
      createAlert({
        id: 'lockup',
        alertType: 'lockup_not_executed',
        severity: 'critical',
      }),
    ])

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'single', id: 'lockup' })
  })

  it('keeps unrelated security alerts separate and orders priority display items first', () => {
    const items = buildSecurityAlertDisplayItems([
      createAlert({
        id: 'old-badge-alert',
        alertType: 'badge_disabled',
        createdAt: '2026-06-11T07:00:00.000Z',
      }),
      createAlert({
        id: 'lockup',
        alertType: 'lockup_not_executed',
        severity: 'critical',
        createdAt: '2026-06-11T06:45:00.000Z',
      }),
      createAlert({
        id: 'building',
        alertType: 'building_not_secured',
        severity: 'critical',
        createdAt: '2026-06-11T07:05:00.000Z',
      }),
    ])

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ kind: 'group', id: 'lockup-follow-up' })
    expect(items[1]).toMatchObject({ kind: 'single', id: 'old-badge-alert' })
  })

  it('orders critical grouped alerts before newer warning alerts', () => {
    const items = buildSecurityAlertDisplayItems([
      createAlert({
        id: 'new-warning',
        alertType: 'badge_disabled',
        severity: 'warning',
        createdAt: '2026-06-11T07:10:00.000Z',
      }),
      createAlert({
        id: 'lockup',
        alertType: 'lockup_not_executed',
        severity: 'critical',
        createdAt: '2026-06-11T06:45:00.000Z',
      }),
      createAlert({
        id: 'building',
        alertType: 'building_not_secured',
        severity: 'critical',
        createdAt: '2026-06-11T07:05:00.000Z',
      }),
    ])

    expect(items[0]).toMatchObject({ kind: 'group', id: 'lockup-follow-up' })
    expect(items[1]).toMatchObject({ kind: 'single', id: 'new-warning' })
  })

  it('maps severity to alert tone', () => {
    expect(getSecurityAlertTone('critical')).toBe('error')
    expect(getSecurityAlertTone('warning')).toBe('warning')
    expect(getSecurityAlertTone('info')).toBe('info')
  })
})
