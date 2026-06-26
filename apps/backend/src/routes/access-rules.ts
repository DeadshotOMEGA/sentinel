import { initServer } from '@ts-rest/express'
import { accessRuleContract } from '@sentinel/contracts'
import type { AccessRuleResponse } from '@sentinel/contracts'
import type { Request } from 'express'
import {
  accessRuleService,
  AccessRuleNotFoundError,
  AccessRuleValidationError,
} from '../services/access-rule-service.js'
import { requireAccessRule } from '../lib/access-rule-auth.js'
import { AuditRepository } from '../repositories/audit-repository.js'
import { getPrismaClient } from '../lib/database.js'
import { logRequestAudit } from '../lib/audit-log.js'

const s = initServer()
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

function mapAccessRuleError(error: unknown) {
  if (error instanceof AccessRuleNotFoundError) {
    return {
      status: 404 as const,
      body: {
        error: 'NOT_FOUND',
        message: error.message,
      },
    }
  }

  if (error instanceof AccessRuleValidationError) {
    return {
      status: 409 as const,
      body: {
        error: 'ACCESS_RULE_VALIDATION_ERROR',
        message: error.message,
      },
    }
  }

  return {
    status: 500 as const,
    body: {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Access Rule operation failed',
    },
  }
}

function findRule(rules: readonly AccessRuleResponse[], key: string): AccessRuleResponse | null {
  return rules.find((rule) => rule.key === key) ?? null
}

function getActorMemberId(req: Request): string | null {
  return req.member?.id ?? null
}

export const accessRulesRouter = s.router(accessRuleContract, {
  getAllowedRules: async ({ req }) => {
    const auth = requireMember(req)
    if (auth) {
      return auth
    }

    try {
      const body = await accessRuleService.getAllowedRuleKeys(req.member?.accountLevel ?? 0)
      return {
        status: 200 as const,
        body,
      }
    } catch (error) {
      return mapAccessRuleError(error)
    }
  },

  getPolicy: async ({ req }) => {
    const auth = await requireAccessRule(req, 'accessRules.view')
    if (auth) {
      return auth
    }

    try {
      return {
        status: 200 as const,
        body: await accessRuleService.getPolicy(),
      }
    } catch (error) {
      return mapAccessRuleError(error)
    }
  },

  updateRule: async ({ params, body, req }) => {
    const auth = await requireAccessRule(req, 'accessRules.manage')
    if (auth) {
      return auth
    }

    try {
      const actorMemberId = getActorMemberId(req)
      if (!actorMemberId) {
        return {
          status: 401 as const,
          body: {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        }
      }

      const previousPolicy = await accessRuleService.getPolicy()
      const previousRule = findRule(previousPolicy.rules, params.key)
      const rule = await accessRuleService.updateRule(params.key, body, actorMemberId)

      await logRequestAudit(auditRepo, req, {
        action: 'access_rule_update',
        entityType: 'access_rule',
        entityId: null,
        details: {
          accessRuleKey: params.key,
          previousConfiguredMinimumLevel: previousRule?.configuredMinimumLevel ?? null,
          configuredMinimumLevel: rule.configuredMinimumLevel,
          previousConfiguredFloorLevel: previousRule?.configuredFloorLevel ?? null,
          configuredFloorLevel: rule.configuredFloorLevel,
          previousLocalDescription: previousRule?.localDescription ?? null,
          localDescription: rule.localDescription,
          reason: body.reason ?? null,
        },
      })

      return {
        status: 200 as const,
        body: { rule },
      }
    } catch (error) {
      return mapAccessRuleError(error)
    }
  },

  bulkUpdateRules: async ({ body, req }) => {
    const auth = await requireAccessRule(req, 'accessRules.bulkManage')
    if (auth) {
      return auth
    }

    try {
      const actorMemberId = getActorMemberId(req)
      if (!actorMemberId) {
        return {
          status: 401 as const,
          body: {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        }
      }

      const previousPolicy = await accessRuleService.getPolicy()
      const previousRules = new Map(previousPolicy.rules.map((rule) => [rule.key, rule]))
      const rules = await accessRuleService.bulkUpdateRules(body, actorMemberId)

      for (const rule of rules) {
        const previousRule = previousRules.get(rule.key)
        await logRequestAudit(auditRepo, req, {
          action: 'access_rule_update',
          entityType: 'access_rule',
          entityId: null,
          details: {
            bulkChange: true,
            accessRuleKey: rule.key,
            previousConfiguredMinimumLevel: previousRule?.configuredMinimumLevel ?? null,
            configuredMinimumLevel: rule.configuredMinimumLevel,
            previousConfiguredFloorLevel: previousRule?.configuredFloorLevel ?? null,
            configuredFloorLevel: rule.configuredFloorLevel,
            previousLocalDescription: previousRule?.localDescription ?? null,
            localDescription: rule.localDescription,
            reason: body.reason,
          },
        })
      }

      await logRequestAudit(auditRepo, req, {
        action: 'access_rule_bulk_update',
        entityType: 'access_rule',
        entityId: null,
        details: {
          changedCount: rules.length,
          accessRuleKeys: rules.map((rule) => rule.key),
          reason: body.reason,
        },
      })

      return {
        status: 200 as const,
        body: {
          rules,
          changedCount: rules.length,
        },
      }
    } catch (error) {
      return mapAccessRuleError(error)
    }
  },
})
