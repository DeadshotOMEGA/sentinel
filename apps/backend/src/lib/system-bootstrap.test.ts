import { describe, expect, it } from 'vitest'
import { SENTINEL_BOOTSTRAP_SERVICE_NUMBER, isSentinelBootstrapMember } from './system-bootstrap.js'

describe('isSentinelBootstrapMember', () => {
  it('identifies the protected Sentinel bootstrap member by service number', () => {
    expect(isSentinelBootstrapMember({ serviceNumber: SENTINEL_BOOTSTRAP_SERVICE_NUMBER })).toBe(
      true
    )
  })

  it('does not hide ordinary members with similar names', () => {
    expect(isSentinelBootstrapMember({ serviceNumber: 'A12345678' })).toBe(false)
    expect(isSentinelBootstrapMember({ serviceNumber: null })).toBe(false)
  })
})
