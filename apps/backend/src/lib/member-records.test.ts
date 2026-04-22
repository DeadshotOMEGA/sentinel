import { describe, expect, it } from 'vitest'
import { resolveMemberScope, resolveMemberTypePersistence } from './member-records.js'

describe('member-record helpers', () => {
  it('defaults non-admin queries to nominal roll scope', () => {
    expect(resolveMemberScope(undefined, false)).toBe('nominal_roll')
    expect(resolveMemberScope('civilian_manual', false)).toBe('nominal_roll')
    expect(resolveMemberScope('all', false)).toBe('nominal_roll')
  })

  it('allows admin users to request civilian and all-personnel scopes', () => {
    expect(resolveMemberScope(undefined, true)).toBe('nominal_roll')
    expect(resolveMemberScope('civilian_manual', true)).toBe('civilian_manual')
    expect(resolveMemberScope('all', true)).toBe('all')
  })

  it('uses the member type resolved from memberTypeId instead of stale manual defaults', () => {
    expect(
      resolveMemberTypePersistence({
        mode: 'create',
        requestedMemberType: 'class_a',
        requestedMemberTypeId: 'civilian-type-id',
        resolvedMemberTypeCodeById: 'civilian_staff',
      })
    ).toEqual({
      memberType: 'civilian_staff',
      memberTypeId: 'civilian-type-id',
    })
  })

  it('backfills memberTypeId when a known member type code is provided directly', () => {
    expect(
      resolveMemberTypePersistence({
        mode: 'update',
        requestedMemberType: 'class_b',
        resolvedMemberTypeIdByCode: 'class-b-id',
      })
    ).toEqual({
      memberType: 'class_b',
      memberTypeId: 'class-b-id',
    })
  })
})
