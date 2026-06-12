export interface TagPriorityLike {
  id?: string | null
  name: string
  displayOrder?: number | null
}

function getTagDisplayOrder(tag: TagPriorityLike): number {
  return typeof tag.displayOrder === 'number' && Number.isFinite(tag.displayOrder)
    ? tag.displayOrder
    : Number.MAX_SAFE_INTEGER
}

export function compareTagsByDisplayOrder<T extends TagPriorityLike>(left: T, right: T): number {
  return (
    getTagDisplayOrder(left) - getTagDisplayOrder(right) ||
    left.name.localeCompare(right.name, undefined, {
      sensitivity: 'base',
      numeric: true,
    }) ||
    (left.id ?? '').localeCompare(right.id ?? '')
  )
}

export function sortTagsByDisplayOrder<T extends TagPriorityLike>(tags: readonly T[]): T[] {
  return [...tags].sort(compareTagsByDisplayOrder)
}
