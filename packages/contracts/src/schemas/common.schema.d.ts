import * as v from 'valibot';
export declare const ErrorResponseSchema: v.ObjectSchema<{
    error: v.StringSchema<string>;
    message: v.StringSchema<string>;
    details: v.OptionalSchema<v.RecordSchema<v.StringSchema<string>, v.UnknownSchema<unknown>, {
        [x: string]: unknown;
    }>, undefined, {
        [x: string]: unknown;
    } | undefined>;
    correlationId: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    stack: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
}, undefined, {
    error: string;
    message: string;
    details?: {
        [x: string]: unknown;
    } | undefined;
    correlationId?: string | undefined;
    stack?: string | undefined;
}>;
export declare const SuccessResponseSchema: v.ObjectSchema<{
    success: v.BooleanSchema<boolean>;
    message: v.StringSchema<string>;
}, undefined, {
    message: string;
    success: boolean;
}>;
export declare const PaginationMetaSchema: v.ObjectSchema<{
    page: v.NumberSchema<number>;
    limit: v.NumberSchema<number>;
    total: v.NumberSchema<number>;
    totalPages: v.NumberSchema<number>;
}, undefined, {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}>;
export declare const IdParamSchema: v.ObjectSchema<{
    id: any;
}, undefined, {
    [x: string]: any;
}>;
export declare const BulkOperationResponseSchema: v.ObjectSchema<{
    success: v.NumberSchema<number>;
    failed: v.NumberSchema<number>;
    errors: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        index: v.NumberSchema<number>;
        error: v.StringSchema<string>;
    }, undefined, {
        error: string;
        index: number;
    }>, {
        error: string;
        index: number;
    }[]>, undefined, {
        error: string;
        index: number;
    }[] | undefined>;
}, undefined, {
    success: number;
    failed: number;
    errors?: {
        error: string;
        index: number;
    }[] | undefined;
}>;
export type ErrorResponse = v.InferOutput<typeof ErrorResponseSchema>;
export type SuccessResponse = v.InferOutput<typeof SuccessResponseSchema>;
export type PaginationMeta = v.InferOutput<typeof PaginationMetaSchema>;
export type IdParam = v.InferOutput<typeof IdParamSchema>;
export type BulkOperationResponse = v.InferOutput<typeof BulkOperationResponseSchema>;
//# sourceMappingURL=common.schema.d.ts.map