import { initServer } from '@ts-rest/express'
import { settingContract } from '@sentinel/contracts'
import { SettingRepository } from '../repositories/setting-repository.js'
import { getPrismaClient } from '../lib/database.js'
import type { Setting } from '../repositories/setting-repository.js'
import type { SettingResponse } from '@sentinel/contracts'

const s = initServer()

const settingRepo = new SettingRepository(getPrismaClient())

/**
 * Convert repository Setting to API SettingResponse format
 */
function toApiFormat(setting: Setting): SettingResponse {
  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    category: setting.category,
    description: setting.description || null,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  }
}

/**
 * Settings route implementation using ts-rest
 *
 * Manages application configuration settings (admin-only)
 */
export const settingsRouter = s.router(settingContract, {
  /**
   * Get all settings with optional filtering
   */
  getSettings: async ({ query }) => {
    try {
      const settings = await settingRepo.findAll({
        category: query.category,
        search: query.search,
      })

      return {
        status: 200 as const,
        body: {
          settings: settings.map(toApiFormat),
          total: settings.length,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch settings',
        },
      }
    }
  },

  /**
   * Get single setting by key
   */
  getSettingByKey: async ({ params }) => {
    try {
      const setting = await settingRepo.findByKey(params.key)

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
        body: toApiFormat(setting),
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
   * Create new setting (admin only)
   */
  createSetting: async ({ body }) => {
    try {
      // Check if key already exists
      const exists = await settingRepo.existsByKey(body.key)
      if (exists) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Setting with key '${body.key}' already exists`,
          },
        }
      }

      const setting = await settingRepo.create({
        key: body.key,
        value: body.value,
        category: body.category,
        description: body.description,
      })

      return {
        status: 201 as const,
        body: toApiFormat(setting),
      }
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Setting with key '${body.key}' already exists`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create setting',
        },
      }
    }
  },

  /**
   * Update existing setting (admin only)
   */
  updateSetting: async ({ params, body }) => {
    try {
      const setting = await settingRepo.updateByKey(params.key, {
        value: body.value,
        description: body.description,
      })

      return {
        status: 200 as const,
        body: toApiFormat(setting),
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Setting with key '${params.key}' not found`,
          },
        }
      }

      if (error instanceof Error && error.message.includes('No fields to update')) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: 'No fields provided to update',
          },
        }
      }

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
   * Delete setting (admin only)
   */
  deleteSetting: async ({ params }) => {
    try {
      await settingRepo.deleteByKey(params.key)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Setting deleted successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Setting with key '${params.key}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete setting',
        },
      }
    }
  },
})
