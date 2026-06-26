import * as v from 'valibot'

export const AccessRuleGroupSchema = v.picklist([
  'dashboard_presence',
  'members_personnel',
  'badges_temporary_personnel',
  'lockup_duty',
  'reports_logs',
  'admin_configuration',
  'system_infrastructure',
  'developer_recovery',
])

export const AccessRuleStatusSchema = v.picklist(['active', 'retired_unknown'])

export const AccessRuleKeySchema = v.pipe(
  v.string('Access Rule key is required'),
  v.minLength(1, 'Access Rule key cannot be empty'),
  v.maxLength(120, 'Access Rule key must be at most 120 characters'),
  v.regex(
    /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/,
    'Access Rule key must use dotted camelCase format'
  )
)

export const AccountLevelNumberSchema = v.pipe(
  v.number('Account Level is required'),
  v.integer('Account Level must be a whole number'),
  v.minValue(1, 'Account Level must be at least 1'),
  v.maxValue(6, 'Account Level must be at most 6')
)

export const AccessRuleParamSchema = v.object({
  key: AccessRuleKeySchema,
})

export const AccessRuleResponseSchema = v.object({
  key: AccessRuleKeySchema,
  label: v.string(),
  group: AccessRuleGroupSchema,
  builtInDescription: v.string(),
  localDescription: v.nullable(v.string()),
  configuredMinimumLevel: AccountLevelNumberSchema,
  effectiveMinimumLevel: AccountLevelNumberSchema,
  builtInDefaultLevel: AccountLevelNumberSchema,
  configuredFloorLevel: AccountLevelNumberSchema,
  floorLevel: AccountLevelNumberSchema,
  builtInFloorLevel: AccountLevelNumberSchema,
  status: AccessRuleStatusSchema,
  differsFromDefault: v.boolean(),
  updatedAt: v.nullable(v.string()),
  updatedByMemberId: v.nullable(v.string()),
})

export const AccessRulePolicyResponseSchema = v.object({
  rules: v.array(AccessRuleResponseSchema),
  retiredRules: v.array(AccessRuleResponseSchema),
  policyVersion: v.string(),
})

export const AllowedAccessRulesResponseSchema = v.object({
  allowedRuleKeys: v.array(AccessRuleKeySchema),
  accountLevel: AccountLevelNumberSchema,
  policyVersion: v.string(),
})

export const UpdateAccessRuleSchema = v.object({
  configuredMinimumLevel: v.optional(AccountLevelNumberSchema),
  configuredFloorLevel: v.optional(AccountLevelNumberSchema),
  localDescription: v.optional(
    v.nullable(
      v.pipe(
        v.string('Local description must be text'),
        v.maxLength(500, 'Local description must be at most 500 characters')
      )
    )
  ),
  reason: v.optional(
    v.pipe(
      v.string('Reason must be text'),
      v.maxLength(500, 'Reason must be at most 500 characters')
    )
  ),
})

export const BulkAccessRuleUpdateItemSchema = v.object({
  key: AccessRuleKeySchema,
  configuredMinimumLevel: v.optional(AccountLevelNumberSchema),
  configuredFloorLevel: v.optional(AccountLevelNumberSchema),
  localDescription: v.optional(
    v.nullable(
      v.pipe(
        v.string('Local description must be text'),
        v.maxLength(500, 'Local description must be at most 500 characters')
      )
    )
  ),
})

export const BulkUpdateAccessRulesSchema = v.object({
  changes: v.pipe(
    v.array(BulkAccessRuleUpdateItemSchema),
    v.minLength(1, 'At least one Access Rule change is required')
  ),
  reason: v.pipe(
    v.string('Reason is required for bulk Access Rule changes'),
    v.minLength(1, 'Reason is required for bulk Access Rule changes'),
    v.maxLength(500, 'Reason must be at most 500 characters')
  ),
})

export const AccessRuleUpdateResponseSchema = v.object({
  rule: AccessRuleResponseSchema,
})

export const BulkAccessRuleUpdateResponseSchema = v.object({
  rules: v.array(AccessRuleResponseSchema),
  changedCount: v.number(),
})

export type AccessRuleGroup = v.InferOutput<typeof AccessRuleGroupSchema>
export type AccessRuleStatus = v.InferOutput<typeof AccessRuleStatusSchema>
export type AccessRuleResponse = v.InferOutput<typeof AccessRuleResponseSchema>
export type AccessRulePolicyResponse = v.InferOutput<typeof AccessRulePolicyResponseSchema>
export type AllowedAccessRulesResponse = v.InferOutput<typeof AllowedAccessRulesResponseSchema>
export type UpdateAccessRuleInput = v.InferOutput<typeof UpdateAccessRuleSchema>
export type BulkUpdateAccessRulesInput = v.InferOutput<typeof BulkUpdateAccessRulesSchema>
export type AccessRuleUpdateResponse = v.InferOutput<typeof AccessRuleUpdateResponseSchema>
export type BulkAccessRuleUpdateResponse = v.InferOutput<typeof BulkAccessRuleUpdateResponseSchema>
