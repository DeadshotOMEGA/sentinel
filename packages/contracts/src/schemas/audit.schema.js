import * as v from 'valibot';
export const EntityTypeEnum = v.picklist([
    'member',
    'badge',
    'checkin',
    'visitor',
    'event',
    'division',
    'admin_user',
    'settings',
]);
export const AuditActionEnum = v.picklist([
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'assign',
    'unassign',
    'flag',
    'unflag',
    'export',
    'import',
]);
export const CreateAuditLogSchema = v.object({
    action: AuditActionEnum,
    entityType: EntityTypeEnum,
    entityId: v.optional(v.pipe(v.string(), v.uuid('Invalid entity ID'))),
    details: v.optional(v.record(v.string(), v.any())),
    ipAddress: v.optional(v.string()),
});
export const AuditLogResponseSchema = v.object({
    id: v.string(),
    adminUserId: v.nullable(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.nullable(v.string()),
    details: v.nullable(v.record(v.string(), v.any())),
    ipAddress: v.nullable(v.string()),
    createdAt: v.nullable(v.string()),
});
export const AuditLogWithAdminResponseSchema = v.object({
    id: v.string(),
    adminUserId: v.nullable(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.nullable(v.string()),
    details: v.nullable(v.record(v.string(), v.any())),
    ipAddress: v.nullable(v.string()),
    adminUser: v.nullable(v.object({
        id: v.string(),
        username: v.string(),
        displayName: v.string(),
    })),
    createdAt: v.nullable(v.string()),
});
export const AuditLogListQuerySchema = v.object({
    page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
    limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))),
    adminUserId: v.optional(v.pipe(v.string(), v.uuid())),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.pipe(v.string(), v.uuid())),
    action: v.optional(v.string()),
    startDate: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    endDate: v.optional(v.pipe(v.string(), v.isoTimestamp())),
});
export const AuditLogListResponseSchema = v.object({
    auditLogs: v.array(AuditLogWithAdminResponseSchema),
    total: v.number(),
    page: v.number(),
    limit: v.number(),
    totalPages: v.number(),
});
export const AuditLogStatsResponseSchema = v.object({
    total: v.number(),
    byAction: v.record(v.string(), v.number()),
    byEntityType: v.record(v.string(), v.number()),
    byAdmin: v.array(v.object({
        adminUserId: v.string(),
        adminUsername: v.string(),
        count: v.number(),
    })),
    recentActivity: v.array(AuditLogWithAdminResponseSchema),
});
//# sourceMappingURL=audit.schema.js.map