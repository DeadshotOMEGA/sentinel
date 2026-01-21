import * as v from 'valibot'

/**
 * Alert type enum
 */
export const AlertTypeEnum = v.picklist(['badge_disabled', 'badge_unknown', 'inactive_member'])

/**
 * Alert severity enum
 */
export const AlertSeverityEnum = v.picklist(['critical', 'warning', 'info'])

/**
 * Create security alert request schema
 */
export const CreateSecurityAlertSchema = v.object({
  alertType: AlertTypeEnum,
  severity: AlertSeverityEnum,
  badgeSerial: v.nullable(v.string()),
  memberId: v.optional(v.nullable(v.pipe(v.string(), v.uuid('Invalid member ID')))),
  kioskId: v.pipe(v.string('Kiosk ID is required'), v.minLength(1, 'Kiosk ID cannot be empty')),
  message: v.pipe(
    v.string('Message is required'),
    v.minLength(1, 'Message cannot be empty'),
    v.maxLength(500, 'Message must be at most 500 characters')
  ),
  details: v.optional(v.record(v.string(), v.unknown())),
})

/**
 * Acknowledge alert request schema
 */
export const AcknowledgeAlertSchema = v.object({
  adminId: v.pipe(v.string('Admin ID is required'), v.uuid('Invalid admin ID')),
  note: v.optional(v.string()),
})

/**
 * Security alert response schema
 */
export const SecurityAlertResponseSchema = v.object({
  id: v.string(),
  alertType: AlertTypeEnum,
  severity: AlertSeverityEnum,
  badgeSerial: v.nullable(v.string()),
  memberId: v.nullable(v.string()),
  kioskId: v.string(),
  message: v.string(),
  details: v.unknown(),
  status: v.string(),
  createdAt: v.string(),
})

/**
 * Active alerts response schema
 */
export const ActiveAlertsResponseSchema = v.object({
  alerts: v.array(SecurityAlertResponseSchema),
  count: v.number(),
})

/**
 * Acknowledge alert response schema
 */
export const AcknowledgeAlertResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
  alert: SecurityAlertResponseSchema,
})

// Type exports
export type CreateSecurityAlertInput = v.InferOutput<typeof CreateSecurityAlertSchema>
export type AcknowledgeAlertInput = v.InferOutput<typeof AcknowledgeAlertSchema>
export type SecurityAlertResponse = v.InferOutput<typeof SecurityAlertResponseSchema>
export type ActiveAlertsResponse = v.InferOutput<typeof ActiveAlertsResponseSchema>
export type AcknowledgeAlertResponse = v.InferOutput<typeof AcknowledgeAlertResponseSchema>
