import { initContract } from '@ts-rest/core'
import {
  CreateSettingSchema,
  UpdateSettingSchema,
  SettingResponseSchema,
  SettingListQuerySchema,
  SettingListResponseSchema,
  SettingKeyParamSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Settings API contract
 *
 * Defines all settings-related endpoints with request/response schemas
 */
export const settingContract = c.router({
  /**
   * Get all settings with optional filtering
   */
  getSettings: {
    method: 'GET',
    path: '/api/settings',
    query: SettingListQuerySchema,
    responses: {
      200: SettingListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all settings',
    description: 'Get list of all application settings with optional category filtering',
  },

  /**
   * Get single setting by key
   */
  getSettingByKey: {
    method: 'GET',
    path: '/api/settings/:key',
    pathParams: SettingKeyParamSchema,
    responses: {
      200: SettingResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get setting by key',
    description: 'Retrieve a single setting by its unique key',
  },

  /**
   * Create new setting
   */
  createSetting: {
    method: 'POST',
    path: '/api/settings',
    body: CreateSettingSchema,
    responses: {
      201: SettingResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create new setting',
    description: 'Create a new application setting (admin only)',
  },

  /**
   * Update existing setting
   */
  updateSetting: {
    method: 'PUT',
    path: '/api/settings/:key',
    pathParams: SettingKeyParamSchema,
    body: UpdateSettingSchema,
    responses: {
      200: SettingResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update setting',
    description: 'Update an existing setting value (admin only)',
  },

  /**
   * Delete setting
   */
  deleteSetting: {
    method: 'DELETE',
    path: '/api/settings/:key',
    pathParams: SettingKeyParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete setting',
    description: 'Delete a setting by its unique key (admin only)',
  },
})
