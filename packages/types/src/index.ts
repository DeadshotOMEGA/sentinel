// Shared types
export type ApiResponse<T> = {
  data: T
  error?: never
} | {
  data?: never
  error: string
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Common enums
export type BadgeStatus = 'active' | 'inactive' | 'lost' | 'damaged'
export type CheckinDirection = 'in' | 'out'
export type UserRole = 'quartermaster' | 'admin' | 'developer'

// Export all member types
export * from './member.types'

// Export all admin types
export * from './admin.types'

// Export all badge types
export * from './badge.types'

// Export all checkin types
export * from './checkin.types'

// Export all division types
export * from './division.types'

// Export all event types
export * from './event.types'

// Export all visitor types
export * from './visitor.types'

// Export all list item types
export * from './list-item.types'

// Export all visit type types
export * from './visit-type.types'

// Export all member status types
export * from './member-status.types'

// Export all member type types
export * from './member-type.types'

// Export all tag types
export * from './tag.types'
