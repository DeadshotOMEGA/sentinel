import { describe, expect, it } from 'vitest'
import { isDutyWatchPublishDisabled } from './duty-watch-publish-state'

describe('isDutyWatchPublishDisabled', () => {
  it('allows a draft Duty Watch schedule to publish with missing required slots', () => {
    expect(
      isDutyWatchPublishDisabled({
        isPublishPending: false,
        missingRequiredSlots: 2,
      })
    ).toBe(false)
  })

  it('keeps publish disabled while the publish request is pending', () => {
    expect(
      isDutyWatchPublishDisabled({
        isPublishPending: true,
        missingRequiredSlots: 0,
      })
    ).toBe(true)
  })
})
