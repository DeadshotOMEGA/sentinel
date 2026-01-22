import { initContract } from '@ts-rest/core'
import * as v from 'valibot'
import {
  ReportSettingResponseSchema,
  AllReportSettingsResponseSchema,
  UpdateReportSettingSchema,
  BulkUpdateReportSettingsSchema,
  BulkUpdateReportSettingsResponseSchema,
  ReportSettingKeyParamSchema,
  ReportSettingErrorResponseSchema,
} from '../schemas/report-setting.schema.js'

const c = initContract()

/**
 * Report Settings Contract
 *
 * Endpoints for managing report configuration settings:
 * - Schedule settings (training/admin nights)
 * - Working hours (regular/summer hours)
 * - Thresholds (warning/critical attendance levels)
 * - Member handling (grace periods, minimums)
 * - Formatting (sort order, date format, page size)
 */
export const reportSettingContract = c.router(
  {
    // GET /api/report-settings - Get all settings
    getAll: {
      method: 'GET',
      path: '/api/report-settings',
      responses: {
        200: AllReportSettingsResponseSchema,
        401: ReportSettingErrorResponseSchema,
        500: ReportSettingErrorResponseSchema,
      },
      summary: 'Get all report settings',
      description: 'Get all report configuration settings with their values and timestamps',
    },

    // PUT /api/report-settings - Bulk update settings
    // IMPORTANT: This must be BEFORE /:key to prevent matching empty key
    bulkUpdate: {
      method: 'PUT',
      path: '/api/report-settings',
      body: BulkUpdateReportSettingsSchema,
      responses: {
        200: BulkUpdateReportSettingsResponseSchema,
        400: ReportSettingErrorResponseSchema,
        401: ReportSettingErrorResponseSchema,
        403: ReportSettingErrorResponseSchema,
        500: ReportSettingErrorResponseSchema,
      },
      summary: 'Bulk update report settings',
      description:
        'Update multiple report settings in a single transaction. Admin role required.',
    },

    // GET /api/report-settings/:key - Get specific setting
    getByKey: {
      method: 'GET',
      path: '/api/report-settings/:key',
      pathParams: ReportSettingKeyParamSchema,
      responses: {
        200: v.object({ setting: ReportSettingResponseSchema }),
        401: ReportSettingErrorResponseSchema,
        404: ReportSettingErrorResponseSchema,
        500: ReportSettingErrorResponseSchema,
      },
      summary: 'Get setting by key',
      description:
        'Get a specific report setting by its key (schedule, working_hours, thresholds, member_handling, formatting)',
    },

    // PUT /api/report-settings/:key - Update specific setting
    updateByKey: {
      method: 'PUT',
      path: '/api/report-settings/:key',
      pathParams: ReportSettingKeyParamSchema,
      body: UpdateReportSettingSchema,
      responses: {
        200: v.object({ setting: ReportSettingResponseSchema }),
        400: ReportSettingErrorResponseSchema,
        401: ReportSettingErrorResponseSchema,
        403: ReportSettingErrorResponseSchema,
        404: ReportSettingErrorResponseSchema,
        500: ReportSettingErrorResponseSchema,
      },
      summary: 'Update setting by key',
      description:
        'Update a specific report setting. Creates the setting if it does not exist. Admin role required.',
    },
  },
  {
    pathPrefix: '',
  }
)
