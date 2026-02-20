import { initServer } from '@ts-rest/express'
import { alertConfigContract } from '@sentinel/contracts'
import * as v from 'valibot'
import { AlertRuleConfigSchema } from '@sentinel/contracts'
import type { AlertRuleConfig } from '@sentinel/contracts'
import { AlertConfigRepository } from '../repositories/alert-config-repository.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()
const alertConfigRepo = new AlertConfigRepository(getPrismaClient())

/**
 * Alert configuration routes
 *
 * Manages security alert rule configurations including thresholds,
 * notification preferences, and auto-acknowledgment rules.
 */
export const alertConfigsRouter = s.router(alertConfigContract, {
  /**
   * GET /api/alert-configs - Get all configurations
   */
  getAll: async () => {
    try {
      const allConfigs = await alertConfigRepo.findAll()

      // Convert to map format
      const configs: Record<string, AlertRuleConfig> = {}
      for (const alertConfig of allConfigs) {
        configs[alertConfig.key] = alertConfig.config as AlertRuleConfig
      }

      return {
        status: 200 as const,
        body: { configs },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch alert configurations',
        },
      }
    }
  },

  /**
   * GET /api/alert-configs/:key - Get specific configuration
   */
  getByKey: async ({ params }) => {
    try {
      const alertConfig = await alertConfigRepo.findByKey(params.key)

      if (!alertConfig) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Alert configuration with key '${params.key}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          key: alertConfig.key,
          config: alertConfig.config as AlertRuleConfig,
          updatedAt: alertConfig.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch alert configuration',
        },
      }
    }
  },

  /**
   * PUT /api/alert-configs/:key - Update specific configuration
   */
  updateByKey: async ({ params, body }) => {
    try {
      // Validate config against schema
      const result = v.safeParse(AlertRuleConfigSchema, body.config)
      if (!result.success) {
        const firstIssue = result.issues[0]
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: firstIssue.message,
          },
        }
      }

      const alertConfig = await alertConfigRepo.upsert(
        params.key,
        body.config as Record<string, unknown>
      )

      return {
        status: 200 as const,
        body: {
          key: alertConfig.key,
          config: alertConfig.config as AlertRuleConfig,
          updatedAt: alertConfig.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update alert configuration',
        },
      }
    }
  },

  /**
   * PUT /api/alert-configs - Bulk update configurations
   */
  bulkUpdate: async ({ body }) => {
    try {
      // Validate all configurations first
      const errors: string[] = []

      for (const [key, config] of Object.entries(body.configs)) {
        const result = v.safeParse(AlertRuleConfigSchema, config)
        if (!result.success) {
          const firstIssue = result.issues[0]
          errors.push(`${key}: ${firstIssue.message}`)
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
      const updated = await alertConfigRepo.bulkUpsert(
        body.configs as Record<string, Record<string, unknown>>
      )

      return {
        status: 200 as const,
        body: {
          success: true,
          updated,
          message: `Updated ${updated.length} configuration(s)`,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to bulk update alert configurations',
        },
      }
    }
  },
})
