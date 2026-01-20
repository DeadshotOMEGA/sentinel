import * as v from 'valibot';
export const BadgeAssignmentTypeEnum = v.picklist(['member', 'visitor', 'unassigned']);
export const BadgeStatusEnum = v.picklist(['active', 'inactive', 'lost', 'damaged']);
export const CreateBadgeSchema = v.object({
    serialNumber: v.pipe(v.string('Serial number is required'), v.minLength(1, 'Serial number cannot be empty'), v.maxLength(100, 'Serial number must be at most 100 characters')),
    assignmentType: v.optional(BadgeAssignmentTypeEnum),
    assignedToId: v.optional(v.pipe(v.string(), v.uuid('Invalid assigned to ID'))),
    status: v.optional(BadgeStatusEnum),
    badgeStatusId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge status ID'))),
});
export const UpdateBadgeSchema = v.object({
    serialNumber: v.optional(v.pipe(v.string(), v.minLength(1, 'Serial number cannot be empty'), v.maxLength(100, 'Serial number must be at most 100 characters'))),
    assignmentType: v.optional(BadgeAssignmentTypeEnum),
    assignedToId: v.optional(v.nullable(v.pipe(v.string(), v.uuid('Invalid assigned to ID')))),
    status: v.optional(BadgeStatusEnum),
    badgeStatusId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge status ID'))),
});
export const AssignBadgeSchema = v.object({
    assignmentType: BadgeAssignmentTypeEnum,
    assignedToId: v.pipe(v.string('Assigned to ID is required'), v.uuid('Invalid assigned to ID')),
});
export const BadgeResponseSchema = v.object({
    id: v.string(),
    serialNumber: v.string(),
    assignmentType: v.string(),
    assignedToId: v.nullable(v.string()),
    status: v.string(),
    badgeStatusId: v.nullable(v.string()),
    lastUsed: v.nullable(v.string()),
    createdAt: v.nullable(v.string()),
    updatedAt: v.nullable(v.string()),
});
export const BadgeWithAssignmentResponseSchema = v.object({
    id: v.string(),
    serialNumber: v.string(),
    assignmentType: v.string(),
    assignedToId: v.nullable(v.string()),
    status: v.string(),
    badgeStatusId: v.nullable(v.string()),
    lastUsed: v.nullable(v.string()),
    assignedTo: v.nullable(v.object({
        id: v.string(),
        name: v.string(),
        type: v.string(),
    })),
    createdAt: v.nullable(v.string()),
    updatedAt: v.nullable(v.string()),
});
export const BadgeListQuerySchema = v.object({
    page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
    limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))),
    search: v.optional(v.string()),
    assignmentType: v.optional(v.string()),
    status: v.optional(v.string()),
    assignedOnly: v.optional(v.pipe(v.string(), v.transform((val) => val === 'true'))),
    unassignedOnly: v.optional(v.pipe(v.string(), v.transform((val) => val === 'true'))),
});
export const BadgeListResponseSchema = v.object({
    badges: v.array(BadgeWithAssignmentResponseSchema),
    total: v.number(),
    page: v.number(),
    limit: v.number(),
    totalPages: v.number(),
});
export const BadgeStatsResponseSchema = v.object({
    total: v.number(),
    assigned: v.number(),
    unassigned: v.number(),
    byStatus: v.record(v.string(), v.number()),
    byAssignmentType: v.record(v.string(), v.number()),
});
//# sourceMappingURL=badge.schema.js.map