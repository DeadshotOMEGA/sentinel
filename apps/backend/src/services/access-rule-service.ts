import type {
  AccessRulePolicyResponse,
  AccessRuleResponse,
  BulkUpdateAccessRulesInput,
  UpdateAccessRuleInput,
} from '@sentinel/contracts'
import { serviceLogger } from '../lib/logger.js'
import { AccountLevel } from '../middleware/roles.js'
import {
  ACCESS_RULE_CATALOG,
  ACCESS_RULE_CATALOG_BY_KEY,
  type AccessRuleDefinition,
} from '../lib/access-rule-catalog.js'
import {
  AccessRuleRepository,
  type AccessRuleRecord,
  type UpdateAccessRuleRecordInput,
} from '../repositories/access-rule-repository.js'

const MAX_ACCOUNT_LEVEL = AccountLevel.DEVELOPER
const MIN_ACCOUNT_LEVEL = AccountLevel.BASIC
const POLICY_EMPTY_VERSION = 'access-rules:empty'

export class AccessRuleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AccessRuleValidationError'
  }
}

export class AccessRuleNotFoundError extends Error {
  constructor(key: string) {
    super(`Access Rule '${key}' was not found`)
    this.name = 'AccessRuleNotFoundError'
  }
}

interface AccessRuleStore {
  findByKey(key: string): Promise<AccessRuleRecord | null>
  reconcile(
    catalogRules: readonly {
      key: string
      configuredMinimumLevel: number
      configuredFloorLevel: number
    }[],
    updatedByMemberId?: string
  ): Promise<AccessRuleRecord[]>
  updateByKey(key: string, data: UpdateAccessRuleRecordInput): Promise<AccessRuleRecord>
}

export class AccessRuleService {
  constructor(private readonly repository: AccessRuleStore = new AccessRuleRepository()) {}

  async getPolicy(): Promise<AccessRulePolicyResponse> {
    const records = await this.repository.reconcile(
      ACCESS_RULE_CATALOG.map((definition) => ({
        key: definition.key,
        configuredMinimumLevel: definition.builtInDefaultLevel,
        configuredFloorLevel: definition.floorLevel,
      }))
    )

    return this.buildPolicy(records)
  }

  async getAllowedRuleKeys(accountLevel: number): Promise<{
    allowedRuleKeys: string[]
    accountLevel: number
    policyVersion: string
  }> {
    const policy = await this.getPolicy()
    const normalizedLevel = this.normalizeHumanAccountLevel(accountLevel)

    return {
      allowedRuleKeys: policy.rules
        .filter((rule) => normalizedLevel >= rule.effectiveMinimumLevel)
        .map((rule) => rule.key),
      accountLevel: normalizedLevel,
      policyVersion: policy.policyVersion,
    }
  }

  async hasAccess(accountLevel: number | null | undefined, key: string): Promise<boolean> {
    const policy = await this.getPolicy()
    const rule = policy.rules.find((item) => item.key === key)

    if (!rule) {
      serviceLogger.warn('Access Rule check fell back to deny for unknown rule', { key })
      return false
    }

    return this.normalizeHumanAccountLevel(accountLevel ?? 0) >= rule.effectiveMinimumLevel
  }

  async updateRule(
    key: string,
    input: UpdateAccessRuleInput,
    actorMemberId: string
  ): Promise<AccessRuleResponse> {
    const definition = ACCESS_RULE_CATALOG_BY_KEY.get(key)
    if (!definition) {
      throw new AccessRuleNotFoundError(key)
    }

    const existing = await this.repository.findByKey(key)
    const previous = existing
      ? this.toResponse(definition, existing)
      : this.toResponse(definition, this.createDefaultRecord(definition))

    const configuredFloorLevel = input.configuredFloorLevel ?? previous.configuredFloorLevel
    const configuredMinimumLevel = Math.max(
      input.configuredMinimumLevel ?? previous.configuredMinimumLevel,
      configuredFloorLevel
    )
    this.assertReasonWhenLowering(
      previous.effectiveMinimumLevel,
      configuredMinimumLevel,
      input.reason
    )

    const updated = await this.repository.updateByKey(key, {
      configuredMinimumLevel,
      configuredFloorLevel,
      localDescription:
        input.localDescription === undefined
          ? previous.localDescription
          : this.normalizeLocalDescription(input.localDescription),
      updatedByMemberId: actorMemberId,
    })

    return this.toResponse(definition, updated)
  }

  async bulkUpdateRules(
    input: BulkUpdateAccessRulesInput,
    actorMemberId: string
  ): Promise<AccessRuleResponse[]> {
    const updatedRules: AccessRuleResponse[] = []

    for (const change of input.changes) {
      const definition = ACCESS_RULE_CATALOG_BY_KEY.get(change.key)
      if (!definition) {
        throw new AccessRuleNotFoundError(change.key)
      }

      const existing = await this.repository.findByKey(change.key)
      const previous = existing
        ? this.toResponse(definition, existing)
        : this.toResponse(definition, this.createDefaultRecord(definition))

      const configuredFloorLevel = change.configuredFloorLevel ?? previous.configuredFloorLevel
      const configuredMinimumLevel = Math.max(
        change.configuredMinimumLevel ?? previous.configuredMinimumLevel,
        configuredFloorLevel
      )

      const updated = await this.repository.updateByKey(change.key, {
        configuredMinimumLevel,
        configuredFloorLevel,
        localDescription:
          change.localDescription === undefined
            ? previous.localDescription
            : this.normalizeLocalDescription(change.localDescription),
        updatedByMemberId: actorMemberId,
      })

      updatedRules.push(this.toResponse(definition, updated))
    }

    return updatedRules
  }

  private buildPolicy(records: AccessRuleRecord[]): AccessRulePolicyResponse {
    const recordsByKey = new Map(records.map((record) => [record.key, record]))
    const activeRules = ACCESS_RULE_CATALOG.map((definition) =>
      this.toResponse(
        definition,
        recordsByKey.get(definition.key) ?? this.createDefaultRecord(definition)
      )
    )

    const retiredRules = records
      .filter((record) => !ACCESS_RULE_CATALOG_BY_KEY.has(record.key))
      .map((record) => this.toRetiredResponse(record))

    const newestUpdatedAt = [...activeRules, ...retiredRules]
      .map((rule) => rule.updatedAt)
      .filter((value): value is string => typeof value === 'string')
      .sort()
      .at(-1)

    return {
      rules: activeRules,
      retiredRules,
      policyVersion: newestUpdatedAt ?? POLICY_EMPTY_VERSION,
    }
  }

  private toResponse(
    definition: AccessRuleDefinition,
    record: AccessRuleRecord
  ): AccessRuleResponse {
    const effectiveMinimumLevel = this.resolveEffectiveLevel(definition, record)
    const configuredFloorLevel = this.resolveConfiguredFloorLevel(definition, record)

    return {
      key: definition.key,
      label: definition.label,
      group: definition.group,
      builtInDescription: definition.builtInDescription,
      localDescription: record.localDescription ?? null,
      configuredMinimumLevel: this.normalizeHumanAccountLevel(record.configuredMinimumLevel),
      effectiveMinimumLevel,
      builtInDefaultLevel: definition.builtInDefaultLevel,
      configuredFloorLevel,
      floorLevel: configuredFloorLevel,
      builtInFloorLevel: definition.floorLevel,
      status: record.status,
      differsFromDefault:
        effectiveMinimumLevel !== definition.builtInDefaultLevel ||
        configuredFloorLevel !== definition.floorLevel,
      updatedAt: record.updatedAt.toISOString(),
      updatedByMemberId: record.updatedByMemberId ?? null,
    }
  }

  private toRetiredResponse(record: AccessRuleRecord): AccessRuleResponse {
    const level = this.normalizeHumanAccountLevel(record.configuredMinimumLevel)

    return {
      key: record.key,
      label: record.key,
      group: 'developer_recovery',
      builtInDescription: 'Retired or unknown Access Rule retained for review.',
      localDescription: record.localDescription ?? null,
      configuredMinimumLevel: level,
      effectiveMinimumLevel: level,
      builtInDefaultLevel: level,
      configuredFloorLevel: level,
      floorLevel: level,
      builtInFloorLevel: level,
      status: 'retired_unknown',
      differsFromDefault: false,
      updatedAt: record.updatedAt.toISOString(),
      updatedByMemberId: record.updatedByMemberId ?? null,
    }
  }

  private createDefaultRecord(definition: AccessRuleDefinition): AccessRuleRecord {
    const timestamp = new Date(0)

    return {
      id: definition.key,
      key: definition.key,
      configuredMinimumLevel: definition.builtInDefaultLevel,
      configuredFloorLevel: definition.floorLevel,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  }

  private resolveEffectiveLevel(
    definition: AccessRuleDefinition,
    record: AccessRuleRecord
  ): number {
    const configured = this.normalizeHumanAccountLevel(record.configuredMinimumLevel)
    const floor = this.resolveConfiguredFloorLevel(definition, record)

    if (configured < floor) {
      serviceLogger.warn('Access Rule configured level is below floor; using floor level', {
        key: definition.key,
        configuredMinimumLevel: configured,
        floorLevel: floor,
        builtInDefaultLevel: definition.builtInDefaultLevel,
      })
      return floor
    }

    return configured
  }

  private resolveConfiguredFloorLevel(
    definition: AccessRuleDefinition,
    record: AccessRuleRecord
  ): number {
    return this.normalizeHumanAccountLevel(record.configuredFloorLevel ?? definition.floorLevel)
  }

  private assertReasonWhenLowering(
    previousEffectiveLevel: number,
    nextEffectiveLevel: number,
    reason: string | undefined
  ): void {
    if (nextEffectiveLevel < previousEffectiveLevel && (!reason || reason.trim().length === 0)) {
      throw new AccessRuleValidationError(
        'A reason is required when lowering an Access Rule threshold or floor'
      )
    }
  }

  private normalizeHumanAccountLevel(level: number): number {
    if (!Number.isFinite(level)) {
      return MIN_ACCOUNT_LEVEL
    }

    return Math.min(Math.max(Math.trunc(level), MIN_ACCOUNT_LEVEL), MAX_ACCOUNT_LEVEL)
  }

  private normalizeLocalDescription(description: string | null): string | null {
    if (description === null) {
      return null
    }

    const trimmed = description.trim()
    return trimmed.length > 0 ? trimmed : null
  }
}

export const accessRuleService = new AccessRuleService()
