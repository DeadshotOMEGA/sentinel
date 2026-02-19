// Visitor-related types

export interface Visitor {
  id: string
  name: string
  rankPrefix?: string
  firstName?: string
  lastName?: string
  displayName?: string
  organization?: string
  visitType: string
  visitTypeId?: string
  visitReason?: string
  eventId?: string
  hostMemberId?: string
  checkInTime: Date
  checkOutTime?: Date
  temporaryBadgeId?: string
  kioskId: string
  createdAt: Date
  adminNotes?: string
  checkInMethod?: string
  createdByAdmin?: string
}

export interface CreateVisitorInput {
  name?: string
  rankPrefix?: string
  firstName?: string
  lastName?: string
  organization?: string
  visitType: string
  visitTypeId?: string
  visitReason?: string
  eventId?: string
  hostMemberId?: string
  checkInTime?: Date
  checkOutTime?: Date
  temporaryBadgeId?: string
  kioskId: string
  adminNotes?: string
  checkInMethod?: string
  createdByAdmin?: string
}

export interface UpdateVisitorInput {
  name?: string
  rankPrefix?: string
  firstName?: string
  lastName?: string
  organization?: string
  visitType?: string
  visitTypeId?: string
  visitReason?: string
  eventId?: string
  hostMemberId?: string
  checkInTime?: Date
  checkOutTime?: Date
  temporaryBadgeId?: string
  kioskId?: string
  adminNotes?: string
  checkInMethod?: string
}
