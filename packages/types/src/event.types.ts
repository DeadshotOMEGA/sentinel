// Event-related types

export type EventStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type AttendeeStatus = 'pending' | 'approved' | 'denied' | 'checked_in'

export interface Event {
  id: string
  name: string
  code: string
  description?: string
  startDate: Date
  endDate: Date
  status: EventStatus
  autoExpireBadges?: boolean
  customRoles?: Record<string, unknown>
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface EventAttendee {
  id: string
  eventId: string
  name: string
  rank?: string
  organization: string
  role: string
  badgeId?: string
  badgeAssignedAt?: Date
  accessStart?: Date
  accessEnd?: Date
  status: AttendeeStatus
  createdAt: Date
  updatedAt: Date
}

export interface EventCheckin {
  id: string
  eventAttendeeId: string
  badgeId: string
  direction: string
  timestamp: Date
  kioskId: string
  createdAt: Date
}

export interface CreateEventInput {
  name: string
  code: string
  description?: string
  startDate: Date
  endDate: Date
  status?: EventStatus
  autoExpireBadges?: boolean
  customRoles?: Record<string, unknown>
  createdBy?: string
}

export interface UpdateEventInput {
  name?: string
  code?: string
  description?: string
  startDate?: Date
  endDate?: Date
  status?: EventStatus
  autoExpireBadges?: boolean
  customRoles?: Record<string, unknown>
}

export interface CreateAttendeeInput {
  eventId: string
  name: string
  rank?: string
  organization: string
  role: string
  badgeId?: string
  badgeAssignedAt?: Date
  accessStart?: Date
  accessEnd?: Date
  status?: AttendeeStatus
}

export interface UpdateAttendeeInput {
  name?: string
  rank?: string
  organization?: string
  role?: string
  badgeId?: string
  badgeAssignedAt?: Date
  accessStart?: Date
  accessEnd?: Date
  status?: AttendeeStatus
}
