import * as v from 'valibot';
export declare const CreateDivisionSchema: v.ObjectSchema<{
    code: any;
    name: any;
    description: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    color: v.OptionalSchema<any, undefined, any>;
}, undefined, {
    [x: string]: any;
}>;
export declare const UpdateDivisionSchema: v.ObjectSchema<{
    code: v.OptionalSchema<any, undefined, any>;
    name: v.OptionalSchema<any, undefined, any>;
    description: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    color: v.OptionalSchema<any, undefined, any>;
}, undefined, {
    [x: string]: any;
}>;
export declare const DivisionResponseSchema: v.ObjectSchema<{
    id: v.StringSchema<string>;
    code: v.StringSchema<string>;
    name: v.StringSchema<string>;
    description: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    color: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    updatedAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
}, undefined, {
    id: string;
    createdAt: string | null;
    updatedAt: string | null;
    code: string;
    name: string;
    description: string | null;
    color: string | null;
}>;
export declare const DivisionWithStatsResponseSchema: v.ObjectSchema<{
    id: v.StringSchema<string>;
    code: v.StringSchema<string>;
    name: v.StringSchema<string>;
    description: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    color: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    memberCount: v.NumberSchema<number>;
    presentCount: v.NumberSchema<number>;
    createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    updatedAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
}, undefined, {
    id: string;
    createdAt: string | null;
    updatedAt: string | null;
    code: string;
    name: string;
    description: string | null;
    color: string | null;
    memberCount: number;
    presentCount: number;
}>;
export declare const DivisionListQuerySchema: v.ObjectSchema<{
    page: v.OptionalSchema<any, undefined, any>;
    limit: v.OptionalSchema<any, undefined, any>;
    search: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    includeStats: v.OptionalSchema<any, undefined, any>;
}, undefined, {
    [x: string]: any;
}>;
export declare const DivisionListResponseSchema: v.ObjectSchema<{
    divisions: v.ArraySchema<v.ObjectSchema<{
        id: v.StringSchema<string>;
        code: v.StringSchema<string>;
        name: v.StringSchema<string>;
        description: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        color: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        updatedAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    }, undefined, {
        id: string;
        createdAt: string | null;
        updatedAt: string | null;
        code: string;
        name: string;
        description: string | null;
        color: string | null;
    }>, {
        id: string;
        createdAt: string | null;
        updatedAt: string | null;
        code: string;
        name: string;
        description: string | null;
        color: string | null;
    }[]>;
    total: v.NumberSchema<number>;
    page: v.NumberSchema<number>;
    limit: v.NumberSchema<number>;
    totalPages: v.NumberSchema<number>;
}, undefined, {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    divisions: {
        id: string;
        createdAt: string | null;
        updatedAt: string | null;
        code: string;
        name: string;
        description: string | null;
        color: string | null;
    }[];
}>;
export type CreateDivisionInput = v.InferOutput<typeof CreateDivisionSchema>;
export type UpdateDivisionInput = v.InferOutput<typeof UpdateDivisionSchema>;
export type DivisionResponse = v.InferOutput<typeof DivisionResponseSchema>;
export type DivisionWithStatsResponse = v.InferOutput<typeof DivisionWithStatsResponseSchema>;
export type DivisionListQuery = v.InferOutput<typeof DivisionListQuerySchema>;
export type DivisionListResponse = v.InferOutput<typeof DivisionListResponseSchema>;
//# sourceMappingURL=division.schema.d.ts.map