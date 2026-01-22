import { initServer } from '@ts-rest/express'
import { reportSettingContract } from '@sentinel/contracts'
import * as v from 'valibot'
import {
  ScheduleSettingsValueSchema,
  WorkingHoursSettingsValueSchema,
  ThresholdSettingsValueSchema,
  MemberHandlingSettingsValueSchema,
  FormattingSettingsValueSchema,
} from '@sentinel/contracts'
import { ReportSettingRepository } from '../repositories/report-setting-repository.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()
const reportSettingRepo = new ReportSettingRepository(getPrismaClient())

/**
 * Report settings routes
 *
 * Manages report configuration settings with typed validation
 * for different setting categories.
 */
export const reportSettingsRouter = s.router(reportSettingContract, {
  /**
   * GET /api/report-settings - Get all settings
   */
  getAll: async () => {
    try {
      const allSettings = await reportSettingRepo.findAll()

      // Convert to map format
      const settings: Record<string, { value: unknown; updatedAt: string }> = {}
      for (const setting of allSettings) {
        settings[setting.key] = {
          value: setting.value,
          updatedAt: setting.updatedAt.toISOString(),
        }
      }

      return {
        status: 200 as const,
        body: { settings },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to fetch settings',
        },
      }
    }
  },

  /**
   * GET /api/report-settings/:key - Get specific setting
   */
  getByKey: async ({ params }) => {
    try {
      const setting = await reportSettingRepo.findByKey(params.key)

      if (!setting) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Setting with key '${params.key}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          setting: toApiFormat(setting),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch setting',
        },
      }
    }
  },

  /**
   * PUT /api/report-settings/:key - Update specific setting
   */
  updateByKey: async ({ params, body }) => {
    try {
      // Validate value against schema if one exists for this key
      const validationError = validateSettingValue(params.key, body.value)
      if (validationError) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: validationError,
          },
        }
      }

      const setting = await reportSettingRepo.upsert(params.key, body.value)

      return {
        status: 200 as const,
        body: {
          setting: toApiFormat(setting),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update setting',
        },
      }
    }
  },

  /**
   * PUT /api/report-settings - Bulk update settings
   */
  bulkUpdate: async ({ body }) => {
    try {
      // Validate all settings first
      const errors: string[] = []

      for (const [key, value] of Object.entries(body.settings)) {
        const error = validateSettingValue(key, value)
        if (error) {
          errors.push(`${key}: ${error}`)
        }
      }

      if (errors.length > 0) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: errors.join('; '),
          },
        }
      }

      // Bulk upsert in transaction
      const updated = await reportSettingRepo.bulkUpsert(body.settings)

      return {
        status: 200 as const,
        body: {
          success: true,
          updated,
          message: `Updated ${updated.length} setting(s)`,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to bulk update settings',
        },
      }
    }
  },
})

/**
 * Map of setting keys to their validation schemas
 */
const settingsSchemas: Record<string, v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>> = {
  schedule: ScheduleSettingsValueSchema,
  working_hours: WorkingHoursSettingsValueSchema,
  thresholds: ThresholdSettingsValueSchema,
  member_handling: MemberHandlingSettingsValueSchema,
  formatting: FormattingSettingsValueSchema,
}

/**
 * Validate setting value against its schema
 * Returns error message if invalid, null if valid
 */
function validateSettingValue(key: string, value: unknown): string | null {
  const schema = settingsSchemas[key]
  if (!schema) {
    // No schema defined for this key, allow any value
    return null
  }

  const result = v.safeParse(schema, value)
  if (!result.success) {
    const firstIssue = result.issues[0]
    return firstIssue.message
  }

  return null
}

/**
 * Convert ReportSetting to API response format
 */
function toApiFormat(setting: any) {
  return {
    key: setting.key,
    value: setting.value,
    updatedAt: setting.updatedAt.toISOString(),
  }
}
