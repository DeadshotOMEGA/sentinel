import * as v from 'valibot';
export declare const EntityTypeEnum: v.PicklistSchema<["member", "badge", "checkin", "visitor", "event", "division", "admin_user", "settings"], "badge" | "member" | "visitor" | "checkin" | "event" | "division" | "admin_user" | "settings">;
export declare const AuditActionEnum: v.PicklistSchema<["create", "update", "delete", "login", "logout", "assign", "unassign", "flag", "unflag", "export", "import"], "create" | "update" | "delete" | "login" | "logout" | "assign" | "unassign" | "flag" | "unflag" | "export" | "import">;
export declare const CreateAuditLogSchema: v.ObjectSchema<{
    action: v.PicklistSchema<["create", "update", "delete", "login", "logout", "assign", "unassign", "flag", "unflag", "export", "import"], "create" | "update" | "delete" | "login" | "logout" | "assign" | "unassign" | "flag" | "unflag" | "export" | "import">;
    entityType: v.PicklistSchema<["member", "badge", "checkin", "visitor", "event", "division", "admin_user", "settings"], "badge" | "member" | "visitor" | "checkin" | "event" | "division" | "admin_user" | "settings">;
    entityId: v.OptionalSchema<any, undefined, any>;
    details: v.OptionalSchema<v.RecordSchema<v.StringSchema<string>, v.AnySchema<any>, {
        [x: string]: any;
    }>, undefined, {
        [x: string]: any;
    } | undefined>;
    ipAddress: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
}, undefined, {
    [x: string]: any;
}>;
export declare const AuditLogResponseSchema: v.ObjectSchema<{
    id: v.StringSchema<string>;
    adminUserId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    action: v.StringSchema<string>;
    entityType: v.StringSchema<string>;
    entityId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    details: v.NullableSchema<v.RecordSchema<v.StringSchema<string>, v.AnySchema<any>, {
        [x: string]: any;
    }>, undefined, {
        [x: string]: any;
    } | null>;
    ipAddress: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
}, undefined, {
    details: {
        [x: string]: any;
    } | null;
    id: string;
    createdAt: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    ipAddress: string | null;
    adminUserId: string | null;
}>;
export declare const AuditLogWithAdminResponseSchema: v.ObjectSchema<{
    id: v.StringSchema<string>;
    adminUserId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    action: v.StringSchema<string>;
    entityType: v.StringSchema<string>;
    entityId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    details: v.NullableSchema<v.RecordSchema<v.StringSchema<string>, v.AnySchema<any>, {
        [x: string]: any;
    }>, undefined, {
        [x: string]: any;
    } | null>;
    ipAddress: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    adminUser: v.NullableSchema<v.ObjectSchema<{
        id: v.StringSchema<string>;
        username: v.StringSchema<string>;
        displayName: v.StringSchema<string>;
    }, undefined, {
        id: string;
        username: string;
        displayName: string;
    }>, undefined, {
        id: string;
        username: string;
        displayName: string;
    } | null>;
    createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
}, undefined, {
    details: {
        [x: string]: any;
    } | null;
    id: string;
    createdAt: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    ipAddress: string | null;
    adminUserId: string | null;
    adminUser: {
        id: string;
        username: string;
        displayName: string;
    } | null;
}>;
export declare const AuditLogListQuerySchema: v.ObjectSchema<{
    page: v.OptionalSchema<any, undefined, any>;
    limit: v.OptionalSchema<any, undefined, any>;
    adminUserId: v.OptionalSchema<any, undefined, any>;
    entityType: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    entityId: v.OptionalSchema<any, undefined, any>;
    action: v.OptionalSchema<v.StringSchema<string>, undefined, string | undefined>;
    startDate: v.OptionalSchema<any, undefined, any>;
    endDate: v.OptionalSchema<any, undefined, any>;
}, undefined, {
    [x: string]: any;
}>;
export declare const AuditLogListResponseSchema: v.ObjectSchema<{
    auditLogs: v.ArraySchema<v.ObjectSchema<{
        id: v.StringSchema<string>;
        adminUserId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        action: v.StringSchema<string>;
        entityType: v.StringSchema<string>;
        entityId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        details: v.NullableSchema<v.RecordSchema<v.StringSchema<string>, v.AnySchema<any>, {
            [x: string]: any;
        }>, undefined, {
            [x: string]: any;
        } | null>;
        ipAddress: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        adminUser: v.NullableSchema<v.ObjectSchema<{
            id: v.StringSchema<string>;
            username: v.StringSchema<string>;
            displayName: v.StringSchema<string>;
        }, undefined, {
            id: string;
            username: string;
            displayName: string;
        }>, undefined, {
            id: string;
            username: string;
            displayName: string;
        } | null>;
        createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    }, undefined, {
        details: {
            [x: string]: any;
        } | null;
        id: string;
        createdAt: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        ipAddress: string | null;
        adminUserId: string | null;
        adminUser: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    }>, {
        details: {
            [x: string]: any;
        } | null;
        id: string;
        createdAt: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        ipAddress: string | null;
        adminUserId: string | null;
        adminUser: {
            id: string;
            username: string;
            displayName: string;
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
    auditLogs: {
        details: {
            [x: string]: any;
        } | null;
        id: string;
        createdAt: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        ipAddress: string | null;
        adminUserId: string | null;
        adminUser: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    }[];
}>;
export declare const AuditLogStatsResponseSchema: v.ObjectSchema<{
    total: v.NumberSchema<number>;
    byAction: v.RecordSchema<v.StringSchema<string>, v.NumberSchema<number>, {
        [x: string]: number;
    }>;
    byEntityType: v.RecordSchema<v.StringSchema<string>, v.NumberSchema<number>, {
        [x: string]: number;
    }>;
    byAdmin: v.ArraySchema<v.ObjectSchema<{
        adminUserId: v.StringSchema<string>;
        adminUsername: v.StringSchema<string>;
        count: v.NumberSchema<number>;
    }, undefined, {
        adminUserId: string;
        adminUsername: string;
        count: number;
    }>, {
        adminUserId: string;
        adminUsername: string;
        count: number;
    }[]>;
    recentActivity: v.ArraySchema<v.ObjectSchema<{
        id: v.StringSchema<string>;
        adminUserId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        action: v.StringSchema<string>;
        entityType: v.StringSchema<string>;
        entityId: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        details: v.NullableSchema<v.RecordSchema<v.StringSchema<string>, v.AnySchema<any>, {
            [x: string]: any;
        }>, undefined, {
            [x: string]: any;
        } | null>;
        ipAddress: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
        adminUser: v.NullableSchema<v.ObjectSchema<{
            id: v.StringSchema<string>;
            username: v.StringSchema<string>;
            displayName: v.StringSchema<string>;
        }, undefined, {
            id: string;
            username: string;
            displayName: string;
        }>, undefined, {
            id: string;
            username: string;
            displayName: string;
        } | null>;
        createdAt: v.NullableSchema<v.StringSchema<string>, undefined, string | null>;
    }, undefined, {
        details: {
            [x: string]: any;
        } | null;
        id: string;
        createdAt: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        ipAddress: string | null;
        adminUserId: string | null;
        adminUser: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    }>, {
        details: {
            [x: string]: any;
        } | null;
        id: string;
        createdAt: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        ipAddress: string | null;
        adminUserId: string | null;
        adminUser: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    }[]>;
}, undefined, {
    total: number;
    byAction: {
        [x: string]: number;
    };
    byEntityType: {
        [x: string]: number;
    };
    byAdmin: {
        adminUserId: string;
        adminUsername: string;
        count: number;
    }[];
    recentActivity: {
        details: {
            [x: string]: any;
        } | null;
        id: string;
        createdAt: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        ipAddress: string | null;
        adminUserId: string | null;
        adminUser: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    }[];
}>;
export type CreateAuditLogInput = v.InferOutput<typeof CreateAuditLogSchema>;
export type AuditLogResponse = v.InferOutput<typeof AuditLogResponseSchema>;
export type AuditLogWithAdminResponse = v.InferOutput<typeof AuditLogWithAdminResponseSchema>;
export type AuditLogListQuery = v.InferOutput<typeof AuditLogListQuerySchema>;
export type AuditLogListResponse = v.InferOutput<typeof AuditLogListResponseSchema>;
export type AuditLogStatsResponse = v.InferOutput<typeof AuditLogStatsResponseSchema>;
//# sourceMappingURL=audit.schema.d.ts.map