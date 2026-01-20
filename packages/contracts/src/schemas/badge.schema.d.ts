import * as v from 'valibot';
export declare const BadgeAssignmentTypeEnum: v.PicklistSchema<["member", "visitor", "unassigned"], "member" | "visitor" | "unassigned">;
export declare const BadgeStatusEnum: v.PicklistSchema<["active", "inactive", "lost", "damaged"], "active" | "inactive" | "lost" | "damaged">;
export declare const CreateBadgeSchema: v.ObjectSchema<{
    serialNumber: any;
    assignmentType: v.OptionalSchema<v.PicklistSchema<["member", "visitor", "unassigned"], "member" | "visitor" | "unassigned">, undefined, "member" | "visitor" | "unassigned" | undefined>;
    assignedToId: v.OptionalSchema<any, undefined, any>;
    status: v.OptionalSchema<v.PicklistSchema<["active", "inactive", "lost", "damaged"], "active" | "inactive" | "lost" | "damaged">, undefined, "active" | "inactive" | "lost" | "damaged" | undefined>;
    badgeStatusId: v.OptionalSchema<any, undefined, any>;
}, undefined, {
    [x: string]: any;
}>;
export declare const UpdateBadgeSchema: v.ObjectSchema<{
    serialNumber: v.OptionalSchema<any, undefined, any>;
    assignmentType: v.OptionalSchema<v.PicklistSchema<["member", "visitor", "unassigned"], "member" | "visitor" | "unassigned">, undefined, "member" | "visitor" | "unassigned" | undefined>;
    assignedToId: v.OptionalSchema<v.NullableSchema<any, undefined, any>, undefined, any>;
    status: v.OptionalSchema<v.PicklistSchema<["active", "inactive", "lost", "damaged"], "active" | "inactive" | "lost" | "damaged">, undefined, "active" | "inactive" | "lost" | "damaged" | undefined>;
    badgeStatusId: v.OptionalSchema<any, undefined, any>;
}, undefined, {
    [x: string]: any;
}>;
export declare const AssignBadgeSchema: v.ObjectSchema<{
    assignmentType: v.PicklistSchema<["member", "visitor", "unassigned"], "member" | "visitor" | "unassigned">;
    assignedToId: any;
}, undefined, {
    [x: string]: any;
}>;
export declare const BadgeResponseSchema: v.ObjectSchema<{
    id: v.StringSchema<string>;
    serialNumber: v.StringSchema<string>;
    assignmentType: v.StringSchema<string>;
    assignedToId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    status: v.StringSchema<string>;
    badgeStatusId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    lastUsed: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    updatedAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
}, undefined, {
    id: string;
    createdAt: string | null;
    updatedAt: string | null;
    status: string;
    serialNumber: string;
    assignmentType: string;
    assignedToId: string | null;
    badgeStatusId: string | null;
    lastUsed: string | null;
}>;
export declare const BadgeWithAssignmentResponseSchema: v.ObjectSchema<{
    id: v.StringSchema<string>;
    serialNumber: v.StringSchema<string>;
    assignmentType: v.StringSchema<string>;
    assignedToId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    status: v.StringSchema<string>;
    badgeStatusId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    lastUsed: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    assignedTo: v.NullableSchema<v.ObjectSchema<{
        id: v.StringSchema<string>;
        name: v.StringSchema<string>;
        type: v.StringSchema<string>;
    }, undefined, {
        id: string;
        type: string;
        name: string;
    }>, undefined, {
        id: string;
        type: string;
        name: string;
    } | null>;
    createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    updatedAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
}, undefined, {
    id: string;
    createdAt: string | null;
    updatedAt: string | null;
    status: string;
    serialNumber: string;
    assignmentType: string;
    assignedToId: string | null;
    badgeStatusId: string | null;
    lastUsed: string | null;
    assignedTo: {
        id: string;
        type: string;
        name: string;
    } | null;
}>;
export declare const BadgeListQuerySchema: v.ObjectSchema<{
    page: v.OptionalSchema<any, undefined, any>;
    limit: v.OptionalSchema<any, undefined, any>;
    search: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    assignmentType: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    status: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    assignedOnly: v.OptionalSchema<any, undefined, any>;
    unassignedOnly: v.OptionalSchema<any, undefined, any>;
}, undefined, {
    [x: string]: any;
}>;
export declare const BadgeListResponseSchema: v.ObjectSchema<{
    badges: v.ArraySchema<v.ObjectSchema<{
        id: v.StringSchema<string>;
        serialNumber: v.StringSchema<string>;
        assignmentType: v.StringSchema<string>;
        assignedToId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        status: v.StringSchema<string>;
        badgeStatusId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        lastUsed: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        assignedTo: v.NullableSchema<v.ObjectSchema<{
            id: v.StringSchema<string>;
            name: v.StringSchema<string>;
            type: v.StringSchema<string>;
        }, undefined, {
            id: string;
            type: string;
            name: string;
        }>, undefined, {
            id: string;
            type: string;
            name: string;
        } | null>;
        createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        updatedAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    }, undefined, {
        id: string;
        createdAt: string | null;
        updatedAt: string | null;
        status: string;
        serialNumber: string;
        assignmentType: string;
        assignedToId: string | null;
        badgeStatusId: string | null;
        lastUsed: string | null;
        assignedTo: {
            id: string;
            type: string;
            name: string;
        } | null;
    }>, {
        id: string;
        createdAt: string | null;
        updatedAt: string | null;
        status: string;
        serialNumber: string;
        assignmentType: string;
        assignedToId: string | null;
        badgeStatusId: string | null;
        lastUsed: string | null;
        assignedTo: {
            id: string;
            type: string;
            name: string;
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
    badges: {
        id: string;
        createdAt: string | null;
        updatedAt: string | null;
        status: string;
        serialNumber: string;
        assignmentType: string;
        assignedToId: string | null;
        badgeStatusId: string | null;
        lastUsed: string | null;
        assignedTo: {
            id: string;
            type: string;
            name: string;
        } | null;
    }[];
}>;
export declare const BadgeStatsResponseSchema: v.ObjectSchema<{
    total: v.NumberSchema<number>;
    assigned: v.NumberSchema<number>;
    unassigned: v.NumberSchema<number>;
    byStatus: v.RecordSchema<v.StringSchema<string>, v.NumberSchema<number>, {
        [x: string]: number;
    }>;
    byAssignmentType: v.RecordSchema<v.StringSchema<string>, v.NumberSchema<number>, {
        [x: string]: number;
    }>;
}, undefined, {
    total: number;
    unassigned: number;
    assigned: number;
    byStatus: {
        [x: string]: number;
    };
    byAssignmentType: {
        [x: string]: number;
    };
}>;
export type CreateBadgeInput = v.InferOutput<typeof CreateBadgeSchema>;
export type UpdateBadgeInput = v.InferOutput<typeof UpdateBadgeSchema>;
export type AssignBadgeInput = v.InferOutput<typeof AssignBadgeSchema>;
export type BadgeResponse = v.InferOutput<typeof BadgeResponseSchema>;
export type BadgeWithAssignmentResponse = v.InferOutput<typeof BadgeWithAssignmentResponseSchema>;
export type BadgeListQuery = v.InferOutput<typeof BadgeListQuerySchema>;
export type BadgeListResponse = v.InferOutput<typeof BadgeListResponseSchema>;
export type BadgeStatsResponse = v.InferOutput<typeof BadgeStatsResponseSchema>;
//# sourceMappingURL=badge.schema.d.ts.map