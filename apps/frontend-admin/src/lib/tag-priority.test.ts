import { describe, expect, it } from 'vitest'
import { sortTagsByDisplayOrder } from './tag-priority'

describe('sortTagsByDisplayOrder', () => {
  it('uses configured tag priority before alphabetical order', () => {
    const sorted = sortTagsByDisplayOrder([
      { id: 'admin', name: 'Admin', displayOrder: 30 },
      { id: 'fts', name: 'FTS', displayOrder: 10 },
      { id: 'cmd', name: 'CMD', displayOrder: 0 },
    ])

    expect(sorted.map((tag) => tag.name)).toEqual(['CMD', 'FTS', 'Admin'])
  })

  it('puts tags without display order after configured tags', () => {
    const sorted = sortTagsByDisplayOrder([
      { id: 'unknown', name: 'Unknown' },
      { id: 'fts', name: 'FTS', displayOrder: 10 },
      { id: 'admin', name: 'Admin' },
    ])

    expect(sorted.map((tag) => tag.name)).toEqual(['FTS', 'Admin', 'Unknown'])
  })
})
