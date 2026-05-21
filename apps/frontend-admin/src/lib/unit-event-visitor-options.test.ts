import { describe, expect, it } from 'vitest'
import {
  allowsGeneralEventVisitorOption,
  buildUnitEventMetadataWithGeneralVisitorOption,
} from './unit-event-visitor-options'

describe('allowsGeneralEventVisitorOption', () => {
  it('requires the event metadata flag to show the General event visitor option', () => {
    expect(allowsGeneralEventVisitorOption(null)).toBe(false)
    expect(allowsGeneralEventVisitorOption({})).toBe(false)
    expect(allowsGeneralEventVisitorOption({ allowGeneralEventVisitorOption: false })).toBe(false)
    expect(allowsGeneralEventVisitorOption({ allowGeneralEventVisitorOption: true })).toBe(true)
  })
})

describe('buildUnitEventMetadataWithGeneralVisitorOption', () => {
  it('stores the setting without removing unrelated metadata', () => {
    expect(buildUnitEventMetadataWithGeneralVisitorOption({ dress: 'No. 3B' }, true)).toEqual({
      dress: 'No. 3B',
      allowGeneralEventVisitorOption: true,
    })
  })

  it('removes the setting when disabled and returns null for empty metadata', () => {
    expect(
      buildUnitEventMetadataWithGeneralVisitorOption(
        { allowGeneralEventVisitorOption: true },
        false
      )
    ).toBeNull()
  })
})
