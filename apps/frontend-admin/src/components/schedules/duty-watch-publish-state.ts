export interface DutyWatchPublishStateInput {
  isPublishPending: boolean
  missingRequiredSlots: number
}

export function isDutyWatchPublishDisabled({
  isPublishPending,
}: DutyWatchPublishStateInput): boolean {
  return isPublishPending
}
