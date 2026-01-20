import { initContract } from '@ts-rest/core'
import {
  CreateAuditLogSchema,
  AuditLogWithAdminResponseSchema,
  AuditLogListQuerySchema,
  AuditLogListResponseSchema,
  AuditLogStatsResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Audit Log API contract
 *
 * Defines all audit log-related endpoints with request/response schemas
 */
export const auditContract = c.router({
  /**
   * Get all audit logs with pagination and filtering
   */
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
    description:
      'Get paginated list of audit logs with optional filtering by admin user, entity type, and date range',
  },

  /**
   * Get single audit log by ID
   */
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

  /**
   * Create new audit log entry
   */
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

  /**
   * Get audit logs for a specific entity
   */
  getEntityAuditLogs: {
    method: 'GET',
    path: '/api/audit-logs/entity/:entityType/:entityId',
    pathParams: c.type<{ entityType: string; entityId: string }>(),
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

  /**
   * Get audit log statistics
   */
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
})
