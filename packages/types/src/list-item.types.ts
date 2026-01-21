// List item types for configurable dropdown lists

export type ListType = 'event_role' | 'rank' | 'mess' | 'moc' | 'custom'

export interface ListItem {
  id: string
  listType: ListType
  code: string
  name: string
  displayOrder: number
  description?: string
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateListItemInput {
  listType: ListType
  code: string
  name: string
  displayOrder?: number
  description?: string
  isSystem?: boolean
}

export interface UpdateListItemInput {
  listType?: ListType
  code?: string
  name?: string
  displayOrder?: number
  description?: string
  isSystem?: boolean
}
