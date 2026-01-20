import * as v from 'valibot';
export declare const RankEnum: v.PicklistSchema<["AB", "OS", "S3", "S2", "S1", "MS", "PO2", "PO1", "CPO2", "CPO1"], "AB" | "OS" | "S3" | "S2" | "S1" | "MS" | "PO2" | "PO1" | "CPO2" | "CPO1">;
export declare const CreateMemberSchema: v.ObjectSchema<{
    serviceNumber: any;
    rank: v.PicklistSchema<["AB", "OS", "S3", "S2", "S1", "MS", "PO2", "PO1", "CPO2", "CPO1"], "AB" | "OS" | "S3" | "S2" | "S1" | "MS" | "PO2" | "PO1" | "CPO2" | "CPO1">;
    firstName: any;
    lastName: any;
    middleInitial: v.OptionalSchema<any, undefined, any>;
    divisionId: any;
    email: v.OptionalSchema<any, undefined, any>;
    phoneNumber: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    memberTypeId: v.OptionalSchema<any, undefined, any>;
    memberStatusId: v.OptionalSchema<any, undefined, any>;
    badgeId: v.OptionalSchema<any, undefined, any>;
}, undefined, {
    [x: string]: any;
}>;
export declare const UpdateMemberSchema: v.ObjectSchema<{
    serviceNumber: v.OptionalSchema<any, undefined, any>;
    rank: v.OptionalSchema<v.PicklistSchema<["AB", "OS", "S3", "S2", "S1", "MS", "PO2", "PO1", "CPO2", "CPO1"], "AB" | "OS" | "S3" | "S2" | "S1" | "MS" | "PO2" | "PO1" | "CPO2" | "CPO1">, undefined, "AB" | "OS" | "S3" | "S2" | "S1" | "MS" | "PO2" | "PO1" | "CPO2" | "CPO1" | undefined>;
    firstName: v.OptionalSchema<any, undefined, any>;
    lastName: v.OptionalSchema<any, undefined, any>;
    middleInitial: v.OptionalSchema<any, undefined, any>;
    divisionId: v.OptionalSchema<any, undefined, any>;
    email: v.OptionalSchema<any, undefined, any>;
    phoneNumber: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    memberTypeId: v.OptionalSchema<any, undefined, any>;
    memberStatusId: v.OptionalSchema<any, undefined, any>;
    badgeId: v.OptionalSchema<any, undefined, any>;
}, undefined, {
    [x: string]: any;
}>;
export declare const MemberResponseSchema: v.ObjectSchema<{
    id: v.StringSchema<string>;
    serviceNumber: v.StringSchema<string>;
    rank: v.StringSchema<string>;
    firstName: v.StringSchema<string>;
    lastName: v.StringSchema<string>;
    middleInitial: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    email: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    phoneNumber: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    divisionId: v.StringSchema<string>;
    badgeId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    memberTypeId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    memberStatusId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    createdAt: v.StringSchema<string>;
    updatedAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
}, undefined, {
    id: string;
    serviceNumber: string;
    rank: string;
    firstName: string;
    lastName: string;
    middleInitial: string | null;
    divisionId: string;
    email: string | null;
    phoneNumber: string | null;
    memberTypeId: string | null;
    memberStatusId: string | null;
    badgeId: string | null;
    createdAt: string;
    updatedAt: string | null;
}>;
export declare const MemberListQuerySchema: v.ObjectSchema<{
    page: v.OptionalSchema<any, undefined, any>;
    limit: v.OptionalSchema<any, undefined, any>;
    search: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    divisionId: v.OptionalSchema<any, undefined, any>;
    rank: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    status: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
}, undefined, {
    [x: string]: any;
}>;
export declare const MemberListResponseSchema: v.ObjectSchema<{
    members: v.ArraySchema<v.ObjectSchema<{
        id: v.StringSchema<string>;
        serviceNumber: v.StringSchema<string>;
        rank: v.StringSchema<string>;
        firstName: v.StringSchema<string>;
        lastName: v.StringSchema<string>;
        middleInitial: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        email: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        phoneNumber: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        divisionId: v.StringSchema<string>;
        badgeId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        memberTypeId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        memberStatusId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        createdAt: v.StringSchema<string>;
        updatedAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    }, undefined, {
        id: string;
        serviceNumber: string;
        rank: string;
        firstName: string;
        lastName: string;
        middleInitial: string | null;
        divisionId: string;
        email: string | null;
        phoneNumber: string | null;
        memberTypeId: string | null;
        memberStatusId: string | null;
        badgeId: string | null;
        createdAt: string;
        updatedAt: string | null;
    }>, {
        id: string;
        serviceNumber: string;
        rank: string;
        firstName: string;
        lastName: string;
        middleInitial: string | null;
        divisionId: string;
        email: string | null;
        phoneNumber: string | null;
        memberTypeId: string | null;
        memberStatusId: string | null;
        badgeId: string | null;
        createdAt: string;
        updatedAt: string | null;
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
    members: {
        id: string;
        serviceNumber: string;
        rank: string;
        firstName: string;
        lastName: string;
        middleInitial: string | null;
        divisionId: string;
        email: string | null;
        phoneNumber: string | null;
        memberTypeId: string | null;
        memberStatusId: string | null;
        badgeId: string | null;
        createdAt: string;
        updatedAt: string | null;
    }[];
}>;
export declare const ErrorResponseSchema: v.ObjectSchema<{
    error: v.StringSchema<string>;
    message: v.StringSchema<string>;
    details: v.OptionalSchema<v.RecordSchema<v.StringSchema<string>, v.UnknownSchema<unknown>, {
        [x: string]: unknown;
    }>, undefined, {
        [x: string]: unknown;
    } | undefined>;
    correlationId: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
}, undefined, {
    error: string;
    message: string;
    details?: {
        [x: string]: unknown;
    } | undefined;
    correlationId?: string | undefined;
}>;
export type CreateMemberInput = v.InferOutput<typeof CreateMemberSchema>;
export type UpdateMemberInput = v.InferOutput<typeof UpdateMemberSchema>;
export type MemberResponse = v.InferOutput<typeof MemberResponseSchema>;
export type MemberListQuery = v.InferOutput<typeof MemberListQuerySchema>;
export type MemberListResponse = v.InferOutput<typeof MemberListResponseSchema>;
export type ErrorResponse = v.InferOutput<typeof ErrorResponseSchema>;
//# sourceMappingURL=member.schema.d.ts.map