// Badge-related types

export type BadgeAssignmentType = 'member' | 'visitor' | 'unassigned'

export interface Badge {
  id: string
  serialNumber: string
  assignmentType: BadgeAssignmentType
  assignedToId?: string
  status: string
  badgeStatusId?: string
  lastUsed?: Date
  createdAt: Date
  updatedAt: Date
}

export interface BadgeWithDetails extends Badge {
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
    serviceNumber?: string
  }
  badgeStatus?: {
    id: string
    name: string
    code: string
  }
  assignedMember?: {
    id: string
    firstName: string
    lastName: string
    serviceNumber?: string
  }
  lastScan?: {
    kioskId: string
    timestamp: Date
    direction: string
  }
}

export interface CreateBadgeInput {
  serialNumber: string
  assignmentType: BadgeAssignmentType
  assignedToId?: string
  status?: string
  badgeStatusId?: string
}

export interface UpdateBadgeInput {
  serialNumber?: string
  assignmentType?: BadgeAssignmentType
  assignedToId?: string
  status?: string
  badgeStatusId?: string
}

export interface BadgeStatusEnum {
  id: string
  name: string
  code: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateBadgeStatusInput {
  name: string
  code: string
  description?: string
  color?: string
}

export interface UpdateBadgeStatusInput {
  name?: string
  code?: string
  description?: string
  color?: string
}
