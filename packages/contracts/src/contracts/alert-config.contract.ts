import { initContract } from '@ts-rest/core'
import {
  AlertConfigResponseSchema,
  AllAlertConfigsResponseSchema,
  UpdateAlertConfigSchema,
  BulkUpdateAlertConfigsSchema,
  BulkUpdateAlertConfigsResponseSchema,
  AlertConfigKeyParamSchema,
  AlertConfigErrorResponseSchema,
} from '../schemas/alert-config.schema.js'

const c = initContract()

/**
 * Alert Configuration Contract
 *
 * Endpoints for managing security alert rule configurations:
 * - Alert thresholds
 * - Notification preferences
 * - Alert type settings
 * - Auto-acknowledgment rules
 */
export const alertConfigContract = c.router(
  {
    // GET /api/alert-configs - Get all configurations
    getAll: {
      method: 'GET',
      path: '/api/alert-configs',
      responses: {
        200: AllAlertConfigsResponseSchema,
        401: AlertConfigErrorResponseSchema,
        500: AlertConfigErrorResponseSchema,
      },
      summary: 'Get all alert configurations',
      description: 'Get all security alert rule configurations',
    },

    // PUT /api/alert-configs - Bulk update configurations
    // IMPORTANT: This must be BEFORE /:key to prevent matching empty key
    bulkUpdate: {
      method: 'PUT',
      path: '/api/alert-configs',
      body: BulkUpdateAlertConfigsSchema,
      responses: {
        200: BulkUpdateAlertConfigsResponseSchema,
        400: AlertConfigErrorResponseSchema,
        401: AlertConfigErrorResponseSchema,
        403: AlertConfigErrorResponseSchema,
        500: AlertConfigErrorResponseSchema,
      },
      summary: 'Bulk update alert configurations',
      description:
        'Update multiple alert configurations in a single transaction. Admin role required.',
    },

    // GET /api/alert-configs/:key - Get specific configuration
    getByKey: {
      method: 'GET',
      path: '/api/alert-configs/:key',
      pathParams: AlertConfigKeyParamSchema,
      responses: {
        200: AlertConfigResponseSchema,
        401: AlertConfigErrorResponseSchema,
        404: AlertConfigErrorResponseSchema,
        500: AlertConfigErrorResponseSchema,
      },
      summary: 'Get configuration by key',
      description:
        'Get a specific alert configuration by its key (badge_disabled, badge_unknown, inactive_member, etc.)',
    },

    // PUT /api/alert-configs/:key - Update specific configuration
    updateByKey: {
      method: 'PUT',
      path: '/api/alert-configs/:key',
      pathParams: AlertConfigKeyParamSchema,
      body: UpdateAlertConfigSchema,
      responses: {
        200: AlertConfigResponseSchema,
        400: AlertConfigErrorResponseSchema,
        401: AlertConfigErrorResponseSchema,
        403: AlertConfigErrorResponseSchema,
        404: AlertConfigErrorResponseSchema,
        500: AlertConfigErrorResponseSchema,
      },
      summary: 'Update configuration by key',
      description:
        'Update a specific alert configuration. Creates the configuration if it does not exist. Admin role required.',
    },
  },
  {
    pathPrefix: '',
  }
)
