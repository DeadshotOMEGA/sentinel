// Member-related types

import type { Badge } from './badge.types'
import type { Tag } from './tag.types'

export type MemberStatus = 'active' | 'inactive' | 'transferred' | 'retired' | 'pending_review'
export type MemberType = 'class_a' | 'class_b' | 'class_c' | 'reg_force'

export interface Member {
  id: string
  serviceNumber: string
  employeeNumber?: string
  firstName: string
  lastName: string
  initials?: string
  rank: string
  divisionId: string
  mess?: string
  moc?: string
  memberType: MemberType
  memberTypeId?: string
  memberStatusId?: string
  classDetails?: string
  notes?: string
  contractStart?: Date
  contractEnd?: Date
  status: MemberStatus
  email?: string
  homePhone?: string
  mobilePhone?: string
  badgeId?: string
  missedCheckoutCount?: number
  lastMissedCheckout?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Division {
  id: string
  name: string
  code: string
  description?: string | null
  color?: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface QualificationSummary {
  code: string
  name: string
}

export interface MemberWithDivision extends Member {
  division: Division
  badge?: Badge
  tags?: Tag[]
  qualifications?: QualificationSummary[]
}

export interface CreateMemberInput {
  serviceNumber: string
  employeeNumber?: string
  firstName: string
  lastName: string
  initials?: string
  rank: string
  divisionId: string
  mess?: string
  moc?: string
  memberType: MemberType
  memberTypeId?: string
  classDetails?: string
  status?: MemberStatus
  email?: string
  homePhone?: string
  mobilePhone?: string
  badgeId?: string
}

export interface UpdateMemberInput {
  serviceNumber?: string
  employeeNumber?: string
  firstName?: string
  lastName?: string
  initials?: string
  rank?: string
  divisionId?: string
  mess?: string
  moc?: string
  memberType?: MemberType
  memberTypeId?: string
  memberStatusId?: string
  classDetails?: string
  status?: MemberStatus
  email?: string
  homePhone?: string
  mobilePhone?: string
  badgeId?: string | null
  tagIds?: string[]
}

export interface MemberFilterParams {
  divisionId?: string
  memberType?: MemberType
  status?: MemberStatus
  search?: string
  mess?: string
  moc?: string
  division?: string
  contract?: 'active' | 'expiring_soon' | 'expired'
  tags?: string[]
  excludeTags?: string[]
}

export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
