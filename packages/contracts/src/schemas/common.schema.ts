import * as v from 'valibot'

/**
 * Common error response schema
 */
export const ErrorResponseSchema = v.object({
  error: v.string(),
  message: v.string(),
  details: v.optional(v.record(v.string(), v.unknown())),
  correlationId: v.optional(v.string()),
  stack: v.optional(v.string()), // Only in development
})

/**
 * Success response schema
 */
export const SuccessResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
})

/**
 * Pagination metadata schema
 */
export const PaginationMetaSchema = v.object({
  page: v.number(),
  limit: v.number(),
  total: v.number(),
  totalPages: v.number(),
})

/**
 * ID parameter schema
 */
export const IdParamSchema = v.object({
  id: v.pipe(v.string('ID is required'), v.uuid('Invalid ID format')),
})

/**
 * Bulk operation response schema
 */
export const BulkOperationResponseSchema = v.object({
  success: v.number(),
  failed: v.number(),
  errors: v.optional(
    v.array(
      v.object({
        index: v.number(),
        error: v.string(),
      })
    )
  ),
})

/**
 * Type exports
 */
export type ErrorResponse = v.InferOutput<typeof ErrorResponseSchema>
export type SuccessResponse = v.InferOutput<typeof SuccessResponseSchema>
export type PaginationMeta = v.InferOutput<typeof PaginationMetaSchema>
export type IdParam = v.InferOutput<typeof IdParamSchema>
export type BulkOperationResponse = v.InferOutput<typeof BulkOperationResponseSchema>
