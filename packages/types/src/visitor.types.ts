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
  licensePlate?: string
  visitType: VisitorVisitType
  visitTypeId?: string
  visitReason?: string
  visitPurpose?: VisitorVisitPurpose
  purposeDetails?: string
  recruitmentStep?: VisitorRecruitmentStep
  eventId?: string
  unitEventId?: string
  hostMemberId?: string
  checkInTime: Date
  checkOutTime?: Date
  temporaryBadgeId?: string
  kioskId: string
  createdAt: Date
  adminNotes?: string
  checkInMethod?: VisitorCheckInMethod
  createdByAdmin?: string
  visitorGroupId?: string
}

export interface CreateVisitorInput {
  name?: string
  rankPrefix?: string
  firstName?: string
  lastName?: string
  organization?: string
  unit?: string
  mobilePhone?: string
  licensePlate?: string
  visitType: VisitorVisitType
  visitTypeId?: string
  visitReason?: string
  visitPurpose?: VisitorVisitPurpose
  purposeDetails?: string
  recruitmentStep?: VisitorRecruitmentStep
  eventId?: string
  unitEventId?: string
  hostMemberId?: string
  checkInTime?: Date
  checkOutTime?: Date
  temporaryBadgeId?: string
  kioskId: string
  adminNotes?: string
  checkInMethod?: VisitorCheckInMethod
  createdByAdmin?: string
  visitorGroupId?: string
}

export interface UpdateVisitorInput {
  name?: string
  rankPrefix?: string
  firstName?: string
  lastName?: string
  organization?: string
  unit?: string
  mobilePhone?: string
  licensePlate?: string
  visitType?: VisitorVisitType
  visitTypeId?: string
  visitReason?: string
  visitPurpose?: VisitorVisitPurpose
  purposeDetails?: string
  recruitmentStep?: VisitorRecruitmentStep
  eventId?: string
  unitEventId?: string
  hostMemberId?: string
  checkInTime?: Date
  checkOutTime?: Date
  temporaryBadgeId?: string
  kioskId?: string
  adminNotes?: string
  checkInMethod?: VisitorCheckInMethod
  createdByAdmin?: string
  visitorGroupId?: string
}

export interface CreateVisitorGroupMemberInput {
  name?: string
  rankPrefix?: string
  firstName?: string
  lastName?: string
  organization?: string
  unit?: string
  mobilePhone?: string
  visitType: VisitorVisitType
  visitTypeId?: string
  recruitmentStep?: VisitorRecruitmentStep
}

export interface CreateVisitorGroupInput {
  kioskId: string
  visitReason?: string
  visitPurpose?: VisitorVisitPurpose
  purposeDetails?: string
  eventId?: string
  unitEventId?: string
  hostMemberId?: string
  checkInMethod?: VisitorCheckInMethod
  adminNotes?: string
  createdByAdmin?: string
  members: CreateVisitorGroupMemberInput[]
  vehicles?: Array<{ licensePlate: string }>
}

export interface VisitorGroupVehicle {
  id: string
  visitorGroupId: string
  licensePlate: string
  normalizedLicensePlate: string
  createdAt: Date
}

export interface CreateVisitorGroupResult {
  groupId: string
  members: Visitor[]
  vehicles: VisitorGroupVehicle[]
}

export interface CheckoutVisitorGroupInput {
  groupId: string
  memberIds?: string[]
}

export interface CheckoutVisitorGroupResult {
  groupId: string
  visitors: Visitor[]
  checkedOutCount: number
  activeGroupMemberCount: number
  alreadyCheckedOutCount: number
}
