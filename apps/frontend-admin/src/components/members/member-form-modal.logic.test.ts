import { describe, expect, it } from 'vitest'
import type { MemberResponse } from '@sentinel/contracts'
import {
  buildCreateImportedMemberFields,
  buildUpdateImportedMemberFields,
  getImportedMemberFormDefaults,
  hasImportedMemberDetails,
} from './member-form-modal.logic'

function createMember(overrides: Partial<MemberResponse> = {}): MemberResponse {
  return {
    id: 'member-1',
    serviceNumber: 'A123456',
    rank: 'PO2',
    displayName: 'PO2 Doe, Jane',
    firstName: 'Jane',
    lastName: 'Doe',
    middleInitial: null,
    employeeNumber: null,
    mess: null,
    moc: null,
    classDetails: null,
    memberType: 'class_a',
    memberSource: 'nominal_roll',
    email: null,
    phoneNumber: null,
    homePhone: null,
    mobilePhone: null,
    divisionId: null,
    badgeId: null,
    accountLevel: 1,
    memberTypeId: null,
    memberStatusId: null,
    createdAt: '2026-06-30T00:00:00.000Z',
    updatedAt: null,
    ...overrides,
  }
}

describe('member form imported field helpers', () => {
  it('uses imported member values as edit defaults', () => {
    const defaults = getImportedMemberFormDefaults(
      createMember({
        employeeNumber: '12345',
        mess: 'Jr Ranks',
        moc: '00375',
        classDetails: 'Class B',
        homePhone: '204-555-0100',
        mobilePhone: '204-555-0101',
      })
    )

    expect(defaults).toEqual({
      employeeNumber: '12345',
      mess: 'Jr Ranks',
      moc: '00375',
      classDetails: 'Class B',
      homePhone: '204-555-0100',
      mobilePhone: '204-555-0101',
    })
  })

  it('falls back to the legacy phone number when mobile phone is not present', () => {
    expect(
      getImportedMemberFormDefaults(createMember({ phoneNumber: '204-555-0199' })).mobilePhone
    ).toBe('204-555-0199')
  })

  it('omits blank imported fields for create payloads', () => {
    expect(
      buildCreateImportedMemberFields({
        employeeNumber: ' 12345 ',
        mess: '',
        moc: ' 00375 ',
      })
    ).toEqual({
      employeeNumber: '12345',
      mess: undefined,
      moc: '00375',
      classDetails: undefined,
      homePhone: undefined,
      mobilePhone: undefined,
    })
  })

  it('uses null for blank imported fields in update payloads so existing values can be cleared', () => {
    expect(
      buildUpdateImportedMemberFields({
        employeeNumber: ' ',
        mess: 'Jr Ranks',
        moc: '',
        classDetails: 'Class A',
      })
    ).toEqual({
      employeeNumber: null,
      mess: 'Jr Ranks',
      moc: null,
      classDetails: 'Class A',
      homePhone: null,
      mobilePhone: null,
    })
  })

  it('detects whether an imported detail section should start open', () => {
    expect(hasImportedMemberDetails(createMember())).toBe(false)
    expect(hasImportedMemberDetails(createMember({ moc: '00375' }))).toBe(true)
  })
})
