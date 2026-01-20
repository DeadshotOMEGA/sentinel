import { initContract } from '@ts-rest/core';
import { CreateAuditLogSchema, AuditLogWithAdminResponseSchema, AuditLogListQuerySchema, AuditLogListResponseSchema, AuditLogStatsResponseSchema, ErrorResponseSchema, IdParamSchema, } from '../schemas/index.js';
const c = initContract();
export const auditContract = c.router({
    getAuditLogs: {
        method: 'GET',
        path: '/api/audit-logs',
        query: AuditLogListQuerySchema,
        responses: {
            200: AuditLogListResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'List all audit logs',
        description: 'Get paginated list of audit logs with optional filtering by admin user, entity type, and date range',
    },
    getAuditLogById: {
        method: 'GET',
        path: '/api/audit-logs/:id',
        pathParams: IdParamSchema,
        responses: {
            200: AuditLogWithAdminResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Get audit log by ID',
        description: 'Retrieve a single audit log by its unique ID',
    },
    createAuditLog: {
        method: 'POST',
        path: '/api/audit-logs',
        body: CreateAuditLogSchema,
        responses: {
            201: AuditLogWithAdminResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Create audit log',
        description: 'Create a new audit log entry (usually done automatically by middleware)',
    },
    getEntityAuditLogs: {
        method: 'GET',
        path: '/api/audit-logs/entity/:entityType/:entityId',
        pathParams: c.type(),
        query: AuditLogListQuerySchema,
        responses: {
            200: AuditLogListResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Get entity audit logs',
        description: 'Get all audit logs for a specific entity',
    },
    getAuditStats: {
        method: 'GET',
        path: '/api/audit-logs/stats',
        responses: {
            200: AuditLogStatsResponseSchema,
            401: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Get audit log statistics',
        description: 'Get audit log statistics (by action, entity type, admin user)',
    },
});
//# sourceMappingURL=audit.contract.js.map