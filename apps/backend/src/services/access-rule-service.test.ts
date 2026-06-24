import { describe, expect, it } from 'vitest'
import { AccountLevel } from '../middleware/roles.js'
import {
  AccessRuleNotFoundError,
  AccessRuleService,
  AccessRuleValidationError,
} from './access-rule-service.js'
import type {
  AccessRuleRecord,
  UpdateAccessRuleRecordInput,
} from '../repositories/access-rule-repository.js'

class InMemoryAccessRuleStore {
  private readonly records = new Map<string, AccessRuleRecord>()

  constructor(records: AccessRuleRecord[] = []) {
    for (const record of records) {
      this.records.set(record.key, record)
    }
  }

  async findByKey(key: string): Promise<AccessRuleRecord | null> {
    return this.records.get(key) ?? null
  }

  async reconcile(
    catalogRules: readonly { key: string; configuredMinimumLevel: number }[]
  ): Promise<AccessRuleRecord[]> {
    for (const rule of catalogRules) {
      if (!this.records.has(rule.key)) {
        this.records.set(rule.key, createRecord(rule.key, rule.configuredMinimumLevel))
      }
    }

    const catalogKeys = new Set(catalogRules.map((rule) => rule.key))
    for (const [key, record] of this.records.entries()) {
      if (!catalogKeys.has(key)) {
        this.records.set(key, { ...record, status: 'retired_unknown' })
      }
    }

    return [...this.records.values()]
  }

  async updateByKey(key: string, data: UpdateAccessRuleRecordInput): Promise<AccessRuleRecord> {
    const existing = this.records.get(key)
    if (!existing) {
      throw new AccessRuleNotFoundError(key)
    }

    const updated: AccessRuleRecord = {
      ...existing,
      configuredMinimumLevel: data.configuredMinimumLevel ?? existing.configuredMinimumLevel,
      localDescription:
        data.localDescription === undefined
          ? existing.localDescription
          : (data.localDescription ?? undefined),
      status: data.status ?? existing.status,
      updatedAt: new Date('2026-06-24T18:00:00.000Z'),
      updatedByMemberId: data.updatedByMemberId ?? existing.updatedByMemberId,
    }
    this.records.set(key, updated)
    return updated
  }
}

function createRecord(
  key: string,
  configuredMinimumLevel: number,
  status: AccessRuleRecord['status'] = 'active'
): AccessRuleRecord {
  return {
    id: key,
    key,
    configuredMinimumLevel,
    status,
    createdAt: new Date('2026-06-24T17:00:00.000Z'),
    updatedAt: new Date('2026-06-24T17:00:00.000Z'),
  }
}

describe('AccessRuleService', () => {
  it('returns allowed rule keys for the signed-in member account level', async () => {
    const service = new AccessRuleService(new InMemoryAccessRuleStore())

    const allowed = await service.getAllowedRuleKeys(AccountLevel.COMMAND)

    expect(allowed.allowedRuleKeys).toContain('securityAlerts.acknowledge')
    expect(allowed.allowedRuleKeys).toContain('presence.manualCheckout')
    expect(allowed.allowedRuleKeys).not.toContain('admin.view')
    expect(allowed.accountLevel).toBe(AccountLevel.COMMAND)
  })

  it('rejects lowering a rule below its Access Rule floor', async () => {
    const service = new AccessRuleService(
      new InMemoryAccessRuleStore([createRecord('accessRules.manage', AccountLevel.DEVELOPER)])
    )

    await expect(
      service.updateRule(
        'accessRules.manage',
        { configuredMinimumLevel: AccountLevel.ADMIN, reason: 'Delegate temporarily' },
        'member-1'
      )
    ).rejects.toBeInstanceOf(AccessRuleValidationError)
  })

  it('requires a reason when lowering an Access Rule threshold', async () => {
    const service = new AccessRuleService(
      new InMemoryAccessRuleStore([createRecord('reports.viewOperational', AccountLevel.ADMIN)])
    )

    await expect(
      service.updateRule(
        'reports.viewOperational',
        { configuredMinimumLevel: AccountLevel.COMMAND },
        'member-1'
      )
    ).rejects.toBeInstanceOf(AccessRuleValidationError)
  })

  it('allows lowering with a reason when the new level respects the floor', async () => {
    const service = new AccessRuleService(
      new InMemoryAccessRuleStore([createRecord('reports.viewOperational', AccountLevel.ADMIN)])
    )

    const rule = await service.updateRule(
      'reports.viewOperational',
      {
        configuredMinimumLevel: AccountLevel.COMMAND,
        reason: 'Command team should generate routine reports',
      },
      'member-1'
    )

    expect(rule.configuredMinimumLevel).toBe(AccountLevel.COMMAND)
    expect(rule.effectiveMinimumLevel).toBe(AccountLevel.COMMAND)
  })

  it('keeps unknown database rules as retired policy records', async () => {
    const service = new AccessRuleService(
      new InMemoryAccessRuleStore([createRecord('old.ruleKey', AccountLevel.ADMIN)])
    )

    const policy = await service.getPolicy()

    expect(policy.retiredRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'old.ruleKey',
          status: 'retired_unknown',
        }),
      ])
    )
  })
})
