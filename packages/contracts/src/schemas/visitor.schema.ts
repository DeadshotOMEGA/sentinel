import * as v from 'valibot'

/**
 * Visit type values
 */
export const VisitTypeEnum = v.picklist(
  ['contractor', 'guest', 'official', 'other', 'military', 'recruitment'],
  'Invalid visit type'
)
export type VisitType = v.InferOutput<typeof VisitTypeEnum>

export const VisitPurposeEnum = v.picklist(
  ['member_invited', 'appointment', 'information', 'other'],
  'Invalid visit purpose'
)
export type VisitPurpose = v.InferOutput<typeof VisitPurposeEnum>

export const RecruitmentStepEnum = v.picklist(
  ['information', 'testing', 'interview', 'medical_admin', 'other'],
  'Invalid recruitment step'
)
export type RecruitmentStep = v.InferOutput<typeof RecruitmentStepEnum>

export const VisitorCheckInMethodEnum = v.picklist(
  ['kiosk', 'admin_manual', 'kiosk_self_service'],
  'Invalid visitor check-in method'
)
export type VisitorCheckInMethod = v.InferOutput<typeof VisitorCheckInMethodEnum>

const VisitorNameFieldSchema = v.pipe(
  v.string('Visitor name is required'),
  v.minLength(1, 'Visitor name cannot be empty'),
  v.maxLength(200, 'Visitor name must be at most 200 characters')
)

const RankPrefixSchema = v.pipe(
  v.string('Rank/prefix must be a string'),
  v.maxLength(50, 'Rank/prefix must be at most 50 characters')
)

const FirstNameSchema = v.pipe(
  v.string('First name is required'),
  v.minLength(1, 'First name cannot be empty'),
  v.maxLength(100, 'First name must be at most 100 characters')
)

const LastNameSchema = v.pipe(
  v.string('Last name is required'),
  v.minLength(1, 'Last name cannot be empty'),
  v.maxLength(100, 'Last name must be at most 100 characters')
)

const OrganizationSchema = v.pipe(
  v.string('Organization must be a string'),
  v.maxLength(200, 'Organization must be at most 200 characters')
)

const UnitSchema = v.pipe(
  v.string('Unit must be a string'),
  v.minLength(1, 'Unit cannot be empty'),
  v.maxLength(200, 'Unit must be at most 200 characters')
)

const MobilePhoneSchema = v.pipe(
  v.string('Mobile phone is required'),
  v.minLength(7, 'Mobile phone must be at least 7 characters'),
  v.maxLength(25, 'Mobile phone must be at most 25 characters')
)

const LicensePlateSchema = v.pipe(
  v.string('License plate must be a string'),
  v.maxLength(20, 'License plate must be at most 20 characters')
)

const VisitReasonSchema = v.pipe(
  v.string('Visit reason must be a string'),
  v.maxLength(500, 'Visit reason must be at most 500 characters')
)

const PurposeDetailsSchema = v.pipe(
  v.string('Purpose details must be a string'),
  v.maxLength(500, 'Purpose details must be at most 500 characters')
)

const AdminNotesSchema = v.pipe(
  v.string('Admin notes must be a string'),
  v.maxLength(1000, 'Admin notes must be at most 1000 characters')
)

const BaseCreateVisitorSchema = v.object({
  name: v.optional(VisitorNameFieldSchema),
  rankPrefix: v.optional(RankPrefixSchema),
  firstName: v.optional(FirstNameSchema),
  lastName: v.optional(LastNameSchema),
  organization: v.optional(OrganizationSchema),
  unit: v.optional(UnitSchema),
  mobilePhone: v.optional(MobilePhoneSchema),
  licensePlate: v.optional(LicensePlateSchema),
  visitType: VisitTypeEnum,
  visitTypeId: v.optional(v.pipe(v.string(), v.uuid('Invalid visit type ID'))),
  visitReason: v.optional(VisitReasonSchema),
  visitPurpose: v.optional(VisitPurposeEnum),
  purposeDetails: v.optional(PurposeDetailsSchema),
  recruitmentStep: v.optional(RecruitmentStepEnum),
  eventId: v.optional(v.pipe(v.string(), v.uuid('Invalid event ID'))),
  hostMemberId: v.optional(v.pipe(v.string(), v.uuid('Invalid host member ID'))),
  checkInTime: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid check-in time'))),
  checkOutTime: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid checkout time'))),
  temporaryBadgeId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge ID'))),
  kioskId: v.pipe(v.string('Kiosk ID is required'), v.minLength(1, 'Kiosk ID cannot be empty')),
  adminNotes: v.optional(AdminNotesSchema),
  checkInMethod: v.optional(VisitorCheckInMethodEnum),
  createdByAdmin: v.optional(v.pipe(v.string(), v.uuid('Invalid admin ID'))),
})

/**
 * Create visitor request schema
 */
export const CreateVisitorSchema = v.pipe(
  BaseCreateVisitorSchema,
  v.check((data) => {
    const hasStructuredName = Boolean(data.firstName?.trim() && data.lastName?.trim())
    const hasLegacyName = Boolean(data.name?.trim())
    return hasStructuredName || hasLegacyName
  }, 'Visitor must include first and last name, or a legacy name value'),
  v.check(
    (data) =>
      data.visitType !== 'military' ||
      (Boolean(data.rankPrefix?.trim()) && Boolean(data.unit?.trim())),
    'Military visitors must include rank and unit'
  ),
  v.check(
    (data) => data.visitType !== 'contractor' || Boolean(data.organization?.trim()),
    'Contractors must include a company name'
  ),
  v.check(
    (data) => data.visitType !== 'recruitment' || Boolean(data.recruitmentStep),
    'Recruitment visitors must select a recruitment step'
  ),
  v.check(
    (data) =>
      !data.visitPurpose ||
      data.visitPurpose === 'information' ||
      Boolean(data.hostMemberId) ||
      Boolean(data.purposeDetails?.trim()),
    'Invited visitors and appointments must include a host member or fallback details'
  ),
  v.check(
    (data) => data.visitPurpose !== 'other' || Boolean(data.purposeDetails?.trim()),
    'Other visit purposes must include details'
  )
)

/**
 * Update visitor request schema
 */
export const UpdateVisitorSchema = v.object({
  name: v.optional(VisitorNameFieldSchema),
  rankPrefix: v.optional(RankPrefixSchema),
  firstName: v.optional(FirstNameSchema),
  lastName: v.optional(LastNameSchema),
  organization: v.optional(OrganizationSchema),
  unit: v.optional(UnitSchema),
  mobilePhone: v.optional(MobilePhoneSchema),
  licensePlate: v.optional(LicensePlateSchema),
  visitType: v.optional(VisitTypeEnum),
  visitTypeId: v.optional(v.pipe(v.string(), v.uuid('Invalid visit type ID'))),
  visitReason: v.optional(VisitReasonSchema),
  visitPurpose: v.optional(VisitPurposeEnum),
  purposeDetails: v.optional(PurposeDetailsSchema),
  recruitmentStep: v.optional(RecruitmentStepEnum),
  eventId: v.optional(v.pipe(v.string(), v.uuid('Invalid event ID'))),
  hostMemberId: v.optional(v.pipe(v.string(), v.uuid('Invalid host member ID'))),
  checkInTime: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid check-in time'))),
  checkOutTime: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid checkout time'))),
  temporaryBadgeId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge ID'))),
  kioskId: v.optional(v.pipe(v.string(), v.minLength(1, 'Kiosk ID cannot be empty'))),
  adminNotes: v.optional(AdminNotesSchema),
  checkInMethod: v.optional(VisitorCheckInMethodEnum),
  createdByAdmin: v.optional(v.pipe(v.string(), v.uuid('Invalid admin ID'))),
})

/**
 * Visitor response schema
 */
export const VisitorResponseSchema = v.object({
  id: v.string(),
  name: v.string(),
  rankPrefix: v.nullable(v.string()),
  firstName: v.nullable(v.string()),
  lastName: v.nullable(v.string()),
  displayName: v.string(),
  organization: v.nullable(v.string()),
  unit: v.nullable(v.string()),
  mobilePhone: v.nullable(v.string()),
  licensePlate: v.nullable(v.string()),
  visitType: VisitTypeEnum,
  visitTypeId: v.nullable(v.string()),
  visitReason: v.nullable(v.string()),
  visitPurpose: v.nullable(VisitPurposeEnum),
  purposeDetails: v.nullable(v.string()),
  recruitmentStep: v.nullable(RecruitmentStepEnum),
  eventId: v.nullable(v.string()),
  hostMemberId: v.nullable(v.string()),
  checkInTime: v.string(),
  checkOutTime: v.nullable(v.string()),
  temporaryBadgeId: v.nullable(v.string()),
  kioskId: v.string(),
  adminNotes: v.nullable(v.string()),
  checkInMethod: VisitorCheckInMethodEnum,
  createdByAdmin: v.nullable(v.string()),
  createdAt: v.string(),
})

/**
 * Visitor list query schema
 */
export const VisitorListQuerySchema = v.object({
  startDate: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid start date'))),
  endDate: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid end date'))),
  visitType: v.optional(VisitTypeEnum),
  hostMemberId: v.optional(v.pipe(v.string(), v.uuid('Invalid host member ID'))),
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
  limit: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))
  ),
})

/**
 * Visitor list response schema
 */
export const VisitorListResponseSchema = v.object({
  visitors: v.array(VisitorResponseSchema),
  total: v.number(),
  page: v.number(),
  limit: v.number(),
  totalPages: v.number(),
})

/**
 * Active visitors response schema
 */
export const ActiveVisitorsResponseSchema = v.object({
  visitors: v.array(VisitorResponseSchema),
  count: v.number(),
})

/**
 * Checkout response schema
 */
export const CheckoutResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
  visitor: VisitorResponseSchema,
})

// Type exports
export type CreateVisitorInput = v.InferOutput<typeof CreateVisitorSchema>
export type UpdateVisitorInput = v.InferOutput<typeof UpdateVisitorSchema>
export type VisitorResponse = v.InferOutput<typeof VisitorResponseSchema>
export type VisitorListQuery = v.InferOutput<typeof VisitorListQuerySchema>
export type VisitorListResponse = v.InferOutput<typeof VisitorListResponseSchema>
export type ActiveVisitorsResponse = v.InferOutput<typeof ActiveVisitorsResponseSchema>
export type CheckoutResponse = v.InferOutput<typeof CheckoutResponseSchema>
