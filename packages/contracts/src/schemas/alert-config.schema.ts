import * as v from 'valibot'

/**
 * Alert severity enum
 */
export const AlertSeverityEnum = v.picklist(
  ['critical', 'warning', 'info'],
  'Invalid alert severity'
)
export type AlertSeverity = v.InferOutput<typeof AlertSeverityEnum>

/**
 * Alert type enum
 */
export const AlertTypeEnum = v.picklist(
  ['badge_disabled', 'badge_unknown', 'inactive_member', 'unauthorized_access'],
  'Invalid alert type'
)
export type AlertType = v.InferOutput<typeof AlertTypeEnum>

/**
 * Notification channel enum
 */
export const NotificationChannelEnum = v.picklist(
  ['email', 'sms', 'dashboard', 'webhook'],
  'Invalid notification channel'
)
export type NotificationChannel = v.InferOutput<typeof NotificationChannelEnum>

/**
 * Alert rule configuration schema
 */
export const AlertRuleConfigSchema = v.object({
  enabled: v.boolean(),
  severity: AlertSeverityEnum,
  notificationChannels: v.array(NotificationChannelEnum),
  autoAcknowledge: v.optional(v.boolean(), false),
  threshold: v.optional(
    v.pipe(v.number(), v.minValue(1), v.maxValue(100))
  ), // Number of occurrences before alert
  timeWindowMinutes: v.optional(
    v.pipe(v.number(), v.minValue(1), v.maxValue(1440))
  ), // Time window for threshold
})
export type AlertRuleConfig = v.InferOutput<typeof AlertRuleConfigSchema>

/**
 * Alert configuration response schema
 */
export const AlertConfigResponseSchema = v.object({
  key: v.string(),
  config: AlertRuleConfigSchema,
  updatedAt: v.string(), // ISO timestamp
})
export type AlertConfigResponse = v.InferOutput<typeof AlertConfigResponseSchema>

/**
 * All alert configurations response
 */
export const AllAlertConfigsResponseSchema = v.object({
  configs: v.record(v.string(), AlertRuleConfigSchema),
})
export type AllAlertConfigsResponse = v.InferOutput<
  typeof AllAlertConfigsResponseSchema
>

/**
 * Update alert config request schema
 */
export const UpdateAlertConfigSchema = v.object({
  config: AlertRuleConfigSchema,
})
export type UpdateAlertConfig = v.InferOutput<typeof UpdateAlertConfigSchema>

/**
 * Bulk update alert configs schema
 */
export const BulkUpdateAlertConfigsSchema = v.object({
  configs: v.record(v.string(), AlertRuleConfigSchema),
})
export type BulkUpdateAlertConfigs = v.InferOutput<typeof BulkUpdateAlertConfigsSchema>

/**
 * Bulk update response schema
 */
export const BulkUpdateAlertConfigsResponseSchema = v.object({
  success: v.boolean(),
  updated: v.array(v.string()),
  message: v.string(),
})
export type BulkUpdateAlertConfigsResponse = v.InferOutput<
  typeof BulkUpdateAlertConfigsResponseSchema
>

/**
 * Path parameter schema
 */
export const AlertConfigKeyParamSchema = v.object({
  key: v.string(),
})
export type AlertConfigKeyParam = v.InferOutput<typeof AlertConfigKeyParamSchema>

/**
 * Generic error response schema
 */
export const AlertConfigErrorResponseSchema = v.object({
  error: v.string(),
  message: v.string(),
})
export type AlertConfigErrorResponse = v.InferOutput<typeof AlertConfigErrorResponseSchema>
