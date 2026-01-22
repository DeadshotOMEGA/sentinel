import { initContract } from '@ts-rest/core'
import {
  CreateSecurityAlertSchema,
  AcknowledgeAlertSchema,
  SecurityAlertResponseSchema,
  ActiveAlertsResponseSchema,
  AcknowledgeAlertResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Security Alert API contract
 *
 * Defines all security alert endpoints with request/response schemas
 */
export const securityAlertContract = c.router({
  /**
   * Get active (unacknowledged) security alerts
   */
  getActiveAlerts: {
    method: 'GET',
    path: '/api/security-alerts/active',
    responses: {
      200: ActiveAlertsResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get active security alerts',
    description: 'Get all active (unacknowledged) security alerts',
  },

  /**
   * Create a new security alert
   */
  createAlert: {
    method: 'POST',
    path: '/api/security-alerts',
    body: CreateSecurityAlertSchema,
    responses: {
      201: SecurityAlertResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create security alert',
    description: 'Create a new security alert (badge disabled, unknown, inactive member)',
  },

  /**
   * Acknowledge a security alert
   */
  acknowledgeAlert: {
    method: 'POST',
    path: '/api/security-alerts/:id/acknowledge',
    pathParams: IdParamSchema,
    body: AcknowledgeAlertSchema,
    responses: {
      200: AcknowledgeAlertResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Acknowledge security alert',
    description: 'Acknowledge a security alert (marks as no longer active)',
  },

  /**
   * Get security alert by ID
   */
  getAlertById: {
    method: 'GET',
    path: '/api/security-alerts/:id',
    pathParams: IdParamSchema,
    responses: {
      200: SecurityAlertResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get security alert by ID',
    description: 'Retrieve a single security alert by its unique ID',
  },
})
