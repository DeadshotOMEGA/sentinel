// Visitor-related types

export type VisitorVisitType =
  | 'contractor'
  | 'guest'
  | 'official'
  | 'other'
  | 'military'
  | 'recruitment'

export type VisitorVisitPurpose = 'member_invited' | 'appointment' | 'information' | 'other'

export type VisitorRecruitmentStep =
  | 'information'
  | 'testing'
  | 'interview'
  | 'medical_admin'
  | 'other'

export type VisitorCheckInMethod = 'kiosk' | 'admin_manual' | 'kiosk_self_service'

export interface Visitor {
  id: string
  name: string
  rankPrefix?: string
  firstName?: string
  lastName?: string
  displayName?: string
  organization?: string
  unit?: string
  mobilePhone?: string
  visitType: VisitorVisitType
  visitTypeId?: string
  visitReason?: string
  visitPurpose?: VisitorVisitPurpose
  purposeDetails?: string
  recruitmentStep?: VisitorRecruitmentStep
  eventId?: string
  hostMemberId?: string
  checkInTime: Date
  checkOutTime?: Date
  temporaryBadgeId?: string
  kioskId: string
  createdAt: Date
  adminNotes?: string
  checkInMethod?: VisitorCheckInMethod
  createdByAdmin?: string
}

export interface CreateVisitorInput {
  name?: string
  rankPrefix?: string
  firstName?: string
  lastName?: string
  organization?: string
  unit?: string
  mobilePhone?: string
  visitType: VisitorVisitType
  visitTypeId?: string
  visitReason?: string
  visitPurpose?: VisitorVisitPurpose
  purposeDetails?: string
  recruitmentStep?: VisitorRecruitmentStep
  eventId?: string
  hostMemberId?: string
  checkInTime?: Date
  checkOutTime?: Date
  temporaryBadgeId?: string
  kioskId: string
  adminNotes?: string
  checkInMethod?: VisitorCheckInMethod
  createdByAdmin?: string
}

export interface UpdateVisitorInput {
  name?: string
  rankPrefix?: string
  firstName?: string
  lastName?: string
  organization?: string
  unit?: string
  mobilePhone?: string
  visitType?: VisitorVisitType
  visitTypeId?: string
  visitReason?: string
  visitPurpose?: VisitorVisitPurpose
  purposeDetails?: string
  recruitmentStep?: VisitorRecruitmentStep
  eventId?: string
  hostMemberId?: string
  checkInTime?: Date
  checkOutTime?: Date
  temporaryBadgeId?: string
  kioskId?: string
  adminNotes?: string
  checkInMethod?: VisitorCheckInMethod
  createdByAdmin?: string
}
