import * as v from 'valibot';
export declare const CheckinDirectionEnum: v.PicklistSchema<["IN", "OUT"], "IN" | "OUT">;
export declare const CheckinMethodEnum: v.PicklistSchema<["badge", "manual", "override"], "badge" | "manual" | "override">;
export declare const CreateCheckinSchema: v.ObjectSchema<{
    memberId: any;
    badgeId: v.OptionalSchema<any, undefined, any>;
    direction: v.PicklistSchema<["IN", "OUT"], "IN" | "OUT">;
    kioskId: any;
    method: v.OptionalSchema<v.PicklistSchema<["badge", "manual", "override"], "badge" | "manual" | "override">, undefined, "badge" | "manual" | "override" | undefined>;
    timestamp: v.OptionalSchema<any, undefined, any>;
    flaggedForReview: v.OptionalSchema<v.BooleanSchema<boolean>, undefined, boolean | undefined>;
    flagReason: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
}, undefined, {
    [x: string]: any;
}>;
export declare const BulkCreateCheckinsSchema: v.ObjectSchema<{
    checkins: any;
}, undefined, {
    [x: string]: any;
}>;
export declare const UpdateCheckinSchema: v.ObjectSchema<{
    direction: v.OptionalSchema<v.PicklistSchema<["IN", "OUT"], "IN" | "OUT">, undefined, "IN" | "OUT" | undefined>;
    flaggedForReview: v.OptionalSchema<v.BooleanSchema<boolean>, undefined, boolean | undefined>;
    flagReason: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
}, undefined, {
    direction?: "IN" | "OUT" | undefined;
    flaggedForReview?: boolean | undefined;
    flagReason?: string | undefined;
}>;
export declare const CheckinResponseSchema: v.ObjectSchema<{
    id: v.StringSchema<string>;
    memberId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    badgeId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    direction: v.StringSchema<string>;
    timestamp: v.StringSchema<string>;
    kioskId: v.StringSchema<string>;
    synced: v.NullableSchema<v.BooleanSchema<boolean>, undefined, boolean | null>;
    flaggedForReview: v.NullableSchema<v.BooleanSchema<boolean>, undefined, boolean | null>;
    flagReason: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    method: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    createdByAdmin: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
}, undefined, {
    id: string;
    badgeId: string | null;
    createdAt: string | null;
    memberId: string | null;
    direction: string;
    kioskId: string;
    method: string | null;
    timestamp: string;
    flaggedForReview: boolean | null;
    flagReason: string | null;
    synced: boolean | null;
    createdByAdmin: string | null;
}>;
export declare const CheckinWithMemberResponseSchema: v.ObjectSchema<{
    id: v.StringSchema<string>;
    memberId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    badgeId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    direction: v.StringSchema<string>;
    timestamp: v.StringSchema<string>;
    kioskId: v.StringSchema<string>;
    synced: v.NullableSchema<v.BooleanSchema<boolean>, undefined, boolean | null>;
    flaggedForReview: v.NullableSchema<v.BooleanSchema<boolean>, undefined, boolean | null>;
    flagReason: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    method: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    member: v.NullableSchema<v.ObjectSchema<{
        id: v.StringSchema<string>;
        serviceNumber: v.StringSchema<string>;
        rank: v.StringSchema<string>;
        firstName: v.StringSchema<string>;
        lastName: v.StringSchema<string>;
        divisionId: v.StringSchema<string>;
    }, undefined, {
        id: string;
        serviceNumber: string;
        rank: string;
        firstName: string;
        lastName: string;
        divisionId: string;
    }>, undefined, {
        id: string;
        serviceNumber: string;
        rank: string;
        firstName: string;
        lastName: string;
        divisionId: string;
    } | null>;
}, undefined, {
    id: string;
    badgeId: string | null;
    memberId: string | null;
    direction: string;
    kioskId: string;
    method: string | null;
    timestamp: string;
    flaggedForReview: boolean | null;
    flagReason: string | null;
    synced: boolean | null;
    member: {
        id: string;
        serviceNumber: string;
        rank: string;
        firstName: string;
        lastName: string;
        divisionId: string;
    } | null;
}>;
export declare const CheckinListQuerySchema: v.ObjectSchema<{
    page: v.OptionalSchema<any, undefined, any>;
    limit: v.OptionalSchema<any, undefined, any>;
    memberId: v.OptionalSchema<any, undefined, any>;
    divisionId: v.OptionalSchema<any, undefined, any>;
    direction: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    kioskId: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    startDate: v.OptionalSchema<any, undefined, any>;
    endDate: v.OptionalSchema<any, undefined, any>;
    flaggedOnly: v.OptionalSchema<any, undefined, any>;
}, undefined, {
    [x: string]: any;
}>;
export declare const CheckinListResponseSchema: v.ObjectSchema<{
    checkins: v.ArraySchema<v.ObjectSchema<{
        id: v.StringSchema<string>;
        memberId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        badgeId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        direction: v.StringSchema<string>;
        timestamp: v.StringSchema<string>;
        kioskId: v.StringSchema<string>;
        synced: v.NullableSchema<v.BooleanSchema<boolean>, undefined, boolean | null>;
        flaggedForReview: v.NullableSchema<v.BooleanSchema<boolean>, undefined, boolean | null>;
        flagReason: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        method: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        member: v.NullableSchema<v.ObjectSchema<{
            id: v.StringSchema<string>;
            serviceNumber: v.StringSchema<string>;
            rank: v.StringSchema<string>;
            firstName: v.StringSchema<string>;
            lastName: v.StringSchema<string>;
            divisionId: v.StringSchema<string>;
        }, undefined, {
            id: string;
            serviceNumber: string;
            rank: string;
            firstName: string;
            lastName: string;
            divisionId: string;
        }>, undefined, {
            id: string;
            serviceNumber: string;
            rank: string;
            firstName: string;
            lastName: string;
            divisionId: string;
        } | null>;
    }, undefined, {
        id: string;
        badgeId: string | null;
        memberId: string | null;
        direction: string;
        kioskId: string;
        method: string | null;
        timestamp: string;
        flaggedForReview: boolean | null;
        flagReason: string | null;
        synced: boolean | null;
        member: {
            id: string;
            serviceNumber: string;
            rank: string;
            firstName: string;
            lastName: string;
            divisionId: string;
        } | null;
    }>, {
        id: string;
        badgeId: string | null;
        memberId: string | null;
        direction: string;
        kioskId: string;
        method: string | null;
        timestamp: string;
        flaggedForReview: boolean | null;
        flagReason: string | null;
        synced: boolean | null;
        member: {
            id: string;
            serviceNumber: string;
            rank: string;
            firstName: string;
            lastName: string;
            divisionId: string;
        } | null;
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
    checkins: {
        id: string;
        badgeId: string | null;
        memberId: string | null;
        direction: string;
        kioskId: string;
        method: string | null;
        timestamp: string;
        flaggedForReview: boolean | null;
        flagReason: string | null;
        synced: boolean | null;
        member: {
            id: string;
            serviceNumber: string;
            rank: string;
            firstName: string;
            lastName: string;
            divisionId: string;
        } | null;
    }[];
}>;
export declare const PresenceStatusResponseSchema: v.ObjectSchema<{
    totalPresent: v.NumberSchema<number>;
    totalMembers: v.NumberSchema<number>;
    byDivision: v.ArraySchema<v.ObjectSchema<{
        divisionId: v.StringSchema<string>;
        divisionName: v.StringSchema<string>;
        present: v.NumberSchema<number>;
        total: v.NumberSchema<number>;
    }, undefined, {
        total: number;
        divisionId: string;
        divisionName: string;
        present: number;
    }>, {
        total: number;
        divisionId: string;
        divisionName: string;
        present: number;
    }[]>;
    lastUpdated: v.StringSchema<string>;
}, undefined, {
    totalPresent: number;
    totalMembers: number;
    byDivision: {
        total: number;
        divisionId: string;
        divisionName: string;
        present: number;
    }[];
    lastUpdated: string;
}>;
export type CreateCheckinInput = v.InferOutput<typeof CreateCheckinSchema>;
export type BulkCreateCheckinsInput = v.InferOutput<typeof BulkCreateCheckinsSchema>;
export type UpdateCheckinInput = v.InferOutput<typeof UpdateCheckinSchema>;
export type CheckinResponse = v.InferOutput<typeof CheckinResponseSchema>;
export type CheckinWithMemberResponse = v.InferOutput<typeof CheckinWithMemberResponseSchema>;
export type CheckinListQuery = v.InferOutput<typeof CheckinListQuerySchema>;
export type CheckinListResponse = v.InferOutput<typeof CheckinListResponseSchema>;
export type PresenceStatusResponse = v.InferOutput<typeof PresenceStatusResponseSchema>;
//# sourceMappingURL=checkin.schema.d.ts.map