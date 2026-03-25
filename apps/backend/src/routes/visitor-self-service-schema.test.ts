import { CreateVisitorSchema } from '@sentinel/contracts'
import { describe, expect, it } from 'vitest'
import * as v from 'valibot'

describe('CreateVisitorSchema self-service validation', () => {
  it('accepts a military self-service visitor with required fields', () => {
    const parsed = v.safeParse(CreateVisitorSchema, {
      firstName: 'Jamie',
      lastName: 'Smith',
      rankPrefix: 'PO2',
      unit: 'HMCS Example',
      mobilePhone: '204-555-0184',
      visitType: 'military',
      visitPurpose: 'appointment',
      purposeDetails: 'Meeting with the Coxswain',
      kioskId: 'DASHBOARD_KIOSK',
      checkInMethod: 'kiosk_self_service',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects recruitment self-service visitors without a recruitment step', () => {
    const parsed = v.safeParse(CreateVisitorSchema, {
      firstName: 'Alex',
      lastName: 'Taylor',
      mobilePhone: '2045550199',
      visitType: 'recruitment',
      visitPurpose: 'information',
      kioskId: 'DASHBOARD_KIOSK',
      checkInMethod: 'kiosk_self_service',
    })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.issues.some((issue) => issue.message.includes('Recruitment visitors'))).toBe(
        true
      )
    }
  })

  it('accepts legacy admin/manual visitors without kiosk self-service fields', () => {
    const parsed = v.safeParse(CreateVisitorSchema, {
      name: 'Inspector Lee',
      visitType: 'official',
      kioskId: 'ADMIN_MANUAL',
      checkInMethod: 'admin_manual',
    })

    expect(parsed.success).toBe(true)
  })
})
