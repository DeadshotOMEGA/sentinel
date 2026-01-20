import * as v from 'valibot';
export const ErrorResponseSchema = v.object({
    error: v.string(),
    message: v.string(),
    details: v.optional(v.record(v.string(), v.unknown())),
    correlationId: v.optional(v.string()),
    stack: v.optional(v.string()),
});
export const SuccessResponseSchema = v.object({
    success: v.boolean(),
    message: v.string(),
});
export const PaginationMetaSchema = v.object({
    page: v.number(),
    limit: v.number(),
    total: v.number(),
    totalPages: v.number(),
});
export const IdParamSchema = v.object({
    id: v.pipe(v.string('ID is required'), v.uuid('Invalid ID format')),
});
export const BulkOperationResponseSchema = v.object({
    success: v.number(),
    failed: v.number(),
    errors: v.optional(v.array(v.object({
        index: v.number(),
        error: v.string(),
    }))),
});
//# sourceMappingURL=common.schema.js.map