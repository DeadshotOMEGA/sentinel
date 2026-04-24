import * as v from 'valibot'

export const AdminNavigationEventTypeValues = [
  'page_view',
  'legacy_redirect',
  'nav_click',
  'quick_action',
  'first_action',
] as const

export const AdminNavigationRouteIdValues = [
  'admin-home',
  'updates',
  'network',
  'logs',
  'database',
  'badges',
  'config',
  'legacy',
  'unknown',
] as const

export const AdminNavigationActionIdValues = [
  'open-updates',
  'view-logs',
  'add-badge',
  'configure-network',
  'open-database',
  'open-config',
  'backup-now',
  'export-database',
  'unknown',
] as const

export const AdminNavigationSourceTypeValues = [
  'navbar',
  'sidebar',
  'admin-home',
  'legacy-redirect',
  'quick-action',
  'recent-issue',
  'category-card',
  'unknown',
] as const

export const AdminNavigationEventTypeSchema = v.picklist(
  AdminNavigationEventTypeValues,
  'Choose a valid admin navigation event type'
)

export const AdminNavigationRouteIdSchema = v.picklist(
  AdminNavigationRouteIdValues,
  'Choose a valid admin navigation route'
)

export const AdminNavigationActionIdSchema = v.picklist(
  AdminNavigationActionIdValues,
  'Choose a valid admin quick action'
)

export const AdminNavigationSourceTypeSchema = v.picklist(
  AdminNavigationSourceTypeValues,
  'Choose a valid admin navigation source'
)

export const CreateAdminNavigationEventSchema = v.object({
  eventType: AdminNavigationEventTypeSchema,
  routeId: AdminNavigationRouteIdSchema,
  targetRouteId: v.optional(AdminNavigationRouteIdSchema),
  actionId: v.optional(AdminNavigationActionIdSchema),
  sourceType: v.optional(AdminNavigationSourceTypeSchema),
  elapsedMs: v.optional(
    v.pipe(
      v.number('Elapsed time must be a number'),
      v.minValue(0, 'Elapsed time cannot be negative'),
      v.maxValue(600000, 'Elapsed time must be less than ten minutes')
    )
  ),
})

export const AdminNavigationEventResponseSchema = v.object({
  success: v.boolean(),
})

export type AdminNavigationEventType = v.InferOutput<typeof AdminNavigationEventTypeSchema>
export type AdminNavigationRouteId = v.InferOutput<typeof AdminNavigationRouteIdSchema>
export type AdminNavigationActionId = v.InferOutput<typeof AdminNavigationActionIdSchema>
export type AdminNavigationSourceType = v.InferOutput<typeof AdminNavigationSourceTypeSchema>
export type CreateAdminNavigationEventInput = v.InferOutput<typeof CreateAdminNavigationEventSchema>
export type AdminNavigationEventResponse = v.InferOutput<typeof AdminNavigationEventResponseSchema>
