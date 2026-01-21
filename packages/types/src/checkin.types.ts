// Checkin-related types

import type { MemberWithDivision, Division } from './member.types'

export interface Checkin {
  id: string
  memberId?: string
  badgeId?: string
  direction: string
  timestamp: Date
  kioskId: string
  synced?: boolean
  createdAt: Date
  flaggedForReview?: boolean
  flagReason?: string
  method?: string
  createdByAdmin?: string
}

export interface CheckinWithMember extends Checkin {
  member?: MemberWithDivision
  badge?: {
    id: string
    serialNumber: string
  }
}

export interface CreateCheckinInput {
  memberId?: string
  badgeId?: string
  direction: string
  timestamp?: Date
  kioskId: string
  method?: string
  createdByAdmin?: string
  synced?: boolean
  flaggedForReview?: boolean
  flagReason?: string
}

export interface PresenceStats {
  total: number
  totalMembers: number
  present: number
  absent: number
  onLeave?: number
  percentagePresent: number
  byDivision: {
    division: Division
    total: number
    present: number
    absent: number
  }[]
}
