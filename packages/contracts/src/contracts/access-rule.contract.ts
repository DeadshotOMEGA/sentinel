import { initContract } from '@ts-rest/core'
import {
  AccessRuleParamSchema,
  AccessRulePolicyResponseSchema,
  AccessRuleUpdateResponseSchema,
  AllowedAccessRulesResponseSchema,
  BulkAccessRuleUpdateResponseSchema,
  BulkUpdateAccessRulesSchema,
  ErrorResponseSchema,
  UpdateAccessRuleSchema,
} from '../schemas/index.js'

const c = initContract()

export const accessRuleContract = c.router({
  getAllowedRules: {
    method: 'GET',
    path: '/api/access-rules/allowed',
    responses: {
      200: AllowedAccessRulesResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List allowed Access Rules',
    description: 'Get the signed-in member Access Rule keys for UI visibility and client checks.',
  },

  getPolicy: {
    method: 'GET',
    path: '/api/access-rules/policy',
    responses: {
      200: AccessRulePolicyResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List Access Rule policy',
    description: 'Get full Access Rule policy metadata for Developer-level Access Rule management.',
  },

  bulkUpdateRules: {
    method: 'PATCH',
    path: '/api/access-rules/bulk/update',
    body: BulkUpdateAccessRulesSchema,
    responses: {
      200: BulkAccessRuleUpdateResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Bulk update Access Rules',
    description:
      'Apply reviewed bulk Access Rule threshold or local-description changes. Developer access required.',
  },

  updateRule: {
    method: 'PATCH',
    path: '/api/access-rules/:key',
    pathParams: AccessRuleParamSchema,
    body: UpdateAccessRuleSchema,
    responses: {
      200: AccessRuleUpdateResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update Access Rule',
    description:
      'Update one Access Rule configured minimum Account Level or local description. Developer access required.',
  },
})
