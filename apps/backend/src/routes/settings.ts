import { initServer } from '@ts-rest/express'
import { settingContract } from '@sentinel/contracts'
import { SettingRepository } from '../repositories/setting-repository.js'
import { AuditRepository } from '../repositories/audit-repository.js'
import { getPrismaClient } from '../lib/database.js'
import { logRequestAudit } from '../lib/audit-log.js'
import type { Setting } from '../repositories/setting-repository.js'
import type { SettingResponse } from '@sentinel/contracts'
import type { Request } from 'express'
import { AccountLevel } from '../middleware/roles.js'

const s = initServer()

const settingRepo = new SettingRepository(getPrismaClient())
const auditRepo = new AuditRepository(getPrismaClient())

function requireMember(req: Request) {
  if (!req.member) {
    return {
      status: 401 as const,
      body: {
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    }
  }
  return null
}

function requireAdminOrDeveloper(req: Request) {
  const memberAuth = requireMember(req)
  if (memberAuth) {
    return memberAuth
  }

  if ((req.member?.accountLevel ?? 0) < AccountLevel.ADMIN) {
    return {
      status: 403 as const,
      body: {
        error: 'FORBIDDEN',
        message: 'Admin or Developer access required',
      },
    }
  }

  return null
}

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
  getSettings: async ({ query, req }) => {
    const auth = requireMember(req)
    if (auth) {
      return auth
    }

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
  getSettingByKey: async ({ params, req }) => {
    const auth = requireMember(req)
    if (auth) {
      return auth
    }

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
  createSetting: async ({ body, req }) => {
    const auth = requireAdminOrDeveloper(req)
    if (auth) {
      return auth
    }

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

      await logRequestAudit(auditRepo, req, {
        action: 'setting_create',
        entityType: 'settings',
        entityId: setting.id,
        details: {
          settingKey: setting.key,
          category: setting.category,
          description: setting.description ?? null,
          valueSnapshot: {
            [setting.key]: setting.value,
          },
        },
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
  updateSetting: async ({ params, body, req }) => {
    const auth = requireAdminOrDeveloper(req)
    if (auth) {
      return auth
    }

    try {
      const existingSetting = await settingRepo.findByKey(params.key)
      if (!existingSetting) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Setting with key '${params.key}' not found`,
          },
        }
      }

      const setting = await settingRepo.updateByKey(params.key, {
        value: body.value,
        description: body.description,
      })

      await logRequestAudit(auditRepo, req, {
        action: 'setting_update',
        entityType: 'settings',
        entityId: setting.id,
        details: {
          settingKey: setting.key,
          category: setting.category,
          description: setting.description ?? null,
          previousValue: {
            [setting.key]: existingSetting.value,
          },
          nextValue: {
            [setting.key]: setting.value,
          },
          previousDescription: existingSetting.description ?? null,
          nextDescription: setting.description ?? null,
        },
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
  deleteSetting: async ({ params, req }) => {
    const auth = requireAdminOrDeveloper(req)
    if (auth) {
      return auth
    }

    try {
      const existingSetting = await settingRepo.findByKey(params.key)
      if (!existingSetting) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Setting with key '${params.key}' not found`,
          },
        }
      }

      await settingRepo.deleteByKey(params.key)

      await logRequestAudit(auditRepo, req, {
        action: 'setting_delete',
        entityType: 'settings',
        entityId: existingSetting.id,
        details: {
          settingKey: existingSetting.key,
          category: existingSetting.category,
          description: existingSetting.description ?? null,
          deletedValue: {
            [existingSetting.key]: existingSetting.value,
          },
        },
      })

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
