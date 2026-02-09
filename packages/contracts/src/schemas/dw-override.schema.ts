import * as v from 'valibot'

// ============================================================================
// DW Night Override Schemas
// ============================================================================

/**
 * Override type enum: replace, add, remove
 */
export const DwOverrideTypeSchema = v.picklist(['replace', 'add', 'remove'])

/**
 * DW night override response (nested member/baseMember/dutyPosition)
 */
export const DwNightOverrideResponseSchema = v.object({
  id: v.string(),
  scheduleId: v.string(),
  nightDate: v.string(), // ISO date YYYY-MM-DD
  dutyPositionId: v.string(),
  overrideType: DwOverrideTypeSchema,
  memberId: v.nullable(v.string()),
  baseMemberId: v.nullable(v.string()),
  notes: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
  member: v.nullable(
    v.object({
      id: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      rank: v.string(),
      serviceNumber: v.string(),
    })
  ),
  baseMember: v.nullable(
    v.object({
      id: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      rank: v.string(),
      serviceNumber: v.string(),
    })
  ),
  dutyPosition: v.object({
    id: v.string(),
    code: v.string(),
    name: v.string(),
  }),
})

/**
 * List of DW night overrides
 */
export const DwNightOverrideListResponseSchema = v.object({
  data: v.array(DwNightOverrideResponseSchema),
})

/**
 * Create DW override input
 */
export const CreateDwOverrideInputSchema = v.object({
  nightDate: v.pipe(
    v.string('Night date is required'),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  ),
  dutyPositionId: v.pipe(
    v.string('Duty position ID is required'),
    v.uuid('Invalid duty position ID format')
  ),
  overrideType: DwOverrideTypeSchema,
  memberId: v.optional(v.nullable(v.pipe(v.string(), v.uuid('Invalid member ID format')))),
  baseMemberId: v.optional(v.nullable(v.pipe(v.string(), v.uuid('Invalid base member ID format')))),
  notes: v.optional(v.nullable(v.string())),
})

/**
 * Override path params (schedule ID + override ID)
 */
export const DwOverrideParamsSchema = v.object({
  id: v.pipe(v.string('Schedule ID is required'), v.uuid('Invalid schedule ID format')),
  overrideId: v.pipe(v.string('Override ID is required'), v.uuid('Invalid override ID format')),
})

/**
 * Override query params (optional nightDate filter)
 */
export const DwOverrideQuerySchema = v.object({
  nightDate: v.optional(
    v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'))
  ),
})

// ============================================================================
// Type Exports
// ============================================================================

export type DwOverrideType = v.InferOutput<typeof DwOverrideTypeSchema>
export type DwNightOverrideResponse = v.InferOutput<typeof DwNightOverrideResponseSchema>
export type DwNightOverrideListResponse = v.InferOutput<typeof DwNightOverrideListResponseSchema>
export type CreateDwOverrideInput = v.InferOutput<typeof CreateDwOverrideInputSchema>
export type DwOverrideParams = v.InferOutput<typeof DwOverrideParamsSchema>
export type DwOverrideQuery = v.InferOutput<typeof DwOverrideQuerySchema>
