'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type {
  AccessRuleGroup,
  AccessRulePolicyResponse,
  AccessRuleResponse,
} from '@sentinel/contracts'
import { FileText, Printer, RotateCcw, Save, ShieldCheck } from 'lucide-react'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { ButtonSpinner, LoadingSpinner } from '@/components/ui/loading-spinner'
import { Chip } from '@/components/ui/chip'
import { useAccessRulePolicy, useBulkUpdateAccessRules } from '@/hooks/use-access-rules'
import { cn } from '@/lib/utils'

const ACCOUNT_LEVEL_LABELS: Record<number, string> = {
  1: 'Basic',
  2: 'Quartermaster',
  3: 'Lockup',
  4: 'Command',
  5: 'Admin',
  6: 'Developer',
}

const GROUP_LABELS: Record<AccessRuleGroup, string> = {
  dashboard_presence: 'Dashboard & Presence',
  members_personnel: 'Members & Personnel',
  badges_temporary_personnel: 'Badges & Temporary Personnel',
  lockup_duty: 'Lockup & Duty',
  reports_logs: 'Reports & Logs',
  admin_configuration: 'Admin Settings',
  system_infrastructure: 'System & Infrastructure',
  developer_recovery: 'Developer & Recovery',
}

const GROUP_ORDER: AccessRuleGroup[] = [
  'dashboard_presence',
  'members_personnel',
  'badges_temporary_personnel',
  'lockup_duty',
  'reports_logs',
  'admin_configuration',
  'system_infrastructure',
  'developer_recovery',
]

type RuleDraft = {
  configuredMinimumLevel: number
  configuredFloorLevel: number
  localDescription: string
}

type RuleDrafts = Record<string, RuleDraft>

function getLevelLabel(level: number): string {
  return `${ACCOUNT_LEVEL_LABELS[level] ?? `Level ${level}`} (${level})`
}

function getRuleDescription(rule: AccessRuleResponse): string {
  const localDescription = rule.localDescription?.trim()
  return localDescription && localDescription.length > 0
    ? localDescription
    : rule.builtInDescription
}

function buildDrafts(rules: readonly AccessRuleResponse[]): RuleDrafts {
  return Object.fromEntries(
    rules.map((rule) => [
      rule.key,
      {
        configuredMinimumLevel: rule.configuredMinimumLevel,
        configuredFloorLevel: rule.configuredFloorLevel,
        localDescription: rule.localDescription ?? '',
      },
    ])
  )
}

function hasRuleChanged(rule: AccessRuleResponse, draft: RuleDraft | undefined): boolean {
  if (!draft) {
    return false
  }

  return (
    draft.configuredMinimumLevel !== rule.configuredMinimumLevel ||
    draft.configuredFloorLevel !== rule.configuredFloorLevel ||
    draft.localDescription.trim() !== (rule.localDescription ?? '')
  )
}

function getChangedRules(
  rules: readonly AccessRuleResponse[],
  drafts: RuleDrafts
): AccessRuleResponse[] {
  return rules.filter((rule) => hasRuleChanged(rule, drafts[rule.key]))
}

function getLevelOptions(minimumLevel = 1): number[] {
  const options: number[] = []
  for (let level = minimumLevel; level <= 6; level += 1) {
    options.push(level)
  }
  return options
}

function getEffectiveLevel(input: {
  configuredMinimumLevel: number
  configuredFloorLevel: number
}): number {
  return Math.max(input.configuredMinimumLevel, input.configuredFloorLevel)
}

export function AdminAccessRulesPage() {
  const policy = useAccessRulePolicy()

  if (policy.isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <LoadingSpinner label="Loading Access Rules" />
      </div>
    )
  }

  if (policy.isError || !policy.data) {
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle>Access Rules unavailable</AppCardTitle>
          <AppCardDescription>
            {policy.error instanceof Error ? policy.error.message : 'Failed to load Access Rules'}
          </AppCardDescription>
        </AppCardHeader>
      </AppCard>
    )
  }

  return <AdminAccessRulesEditor key={policy.data.policyVersion} policyData={policy.data} />
}

function AdminAccessRulesEditor({ policyData }: { policyData: AccessRulePolicyResponse }) {
  const bulkUpdate = useBulkUpdateAccessRules()
  const [drafts, setDrafts] = useState<RuleDrafts>(() => buildDrafts(policyData.rules))
  const [reason, setReason] = useState('')

  const rules = policyData.rules
  const retiredRules = policyData.retiredRules

  const changedRules = useMemo(() => getChangedRules(rules, drafts), [drafts, rules])
  const loweredRules = changedRules.filter((rule) => {
    const draft = drafts[rule.key]
    return draft ? getEffectiveLevel(draft) < rule.effectiveMinimumLevel : false
  })
  const raisedRules = changedRules.filter((rule) => {
    const draft = drafts[rule.key]
    return draft ? getEffectiveLevel(draft) > rule.effectiveMinimumLevel : false
  })
  const floorChanges = changedRules.filter((rule) => {
    const draft = drafts[rule.key]
    return draft ? draft.configuredFloorLevel !== rule.configuredFloorLevel : false
  })
  const descriptionOnlyChanges = changedRules.filter((rule) => {
    const draft = drafts[rule.key]
    return draft
      ? draft.configuredMinimumLevel === rule.configuredMinimumLevel &&
          draft.configuredFloorLevel === rule.configuredFloorLevel
      : false
  })

  const groupedRules = useMemo(() => {
    const groups = new Map<AccessRuleGroup, AccessRuleResponse[]>()
    for (const group of GROUP_ORDER) {
      groups.set(group, [])
    }

    for (const rule of rules) {
      const existing = groups.get(rule.group) ?? []
      existing.push(rule)
      groups.set(rule.group, existing)
    }

    return GROUP_ORDER.map((group) => ({
      group,
      label: GROUP_LABELS[group],
      rules: groups.get(group) ?? [],
    })).filter((group) => group.rules.length > 0)
  }, [rules])

  const handleLevelChange = (rule: AccessRuleResponse, value: number) => {
    setDrafts((current) => ({
      ...current,
      [rule.key]: {
        configuredMinimumLevel: value,
        configuredFloorLevel: current[rule.key]?.configuredFloorLevel ?? rule.configuredFloorLevel,
        localDescription: current[rule.key]?.localDescription ?? rule.localDescription ?? '',
      },
    }))
  }

  const handleFloorChange = (rule: AccessRuleResponse, value: number) => {
    setDrafts((current) => {
      const configuredMinimumLevel =
        current[rule.key]?.configuredMinimumLevel ?? rule.configuredMinimumLevel

      return {
        ...current,
        [rule.key]: {
          configuredMinimumLevel: Math.max(configuredMinimumLevel, value),
          configuredFloorLevel: value,
          localDescription: current[rule.key]?.localDescription ?? rule.localDescription ?? '',
        },
      }
    })
  }

  const handleDescriptionChange = (rule: AccessRuleResponse, value: string) => {
    setDrafts((current) => ({
      ...current,
      [rule.key]: {
        configuredMinimumLevel:
          current[rule.key]?.configuredMinimumLevel ?? rule.configuredMinimumLevel,
        configuredFloorLevel: current[rule.key]?.configuredFloorLevel ?? rule.configuredFloorLevel,
        localDescription: value,
      },
    }))
  }

  const handleResetRule = (rule: AccessRuleResponse) => {
    setDrafts((current) => ({
      ...current,
      [rule.key]: {
        configuredMinimumLevel: rule.builtInDefaultLevel,
        configuredFloorLevel: rule.builtInFloorLevel,
        localDescription: '',
      },
    }))
  }

  const handleDiscard = () => {
    setDrafts(buildDrafts(rules))
    setReason('')
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSave = async () => {
    const trimmedReason = reason.trim()
    if (changedRules.length === 0) {
      toast.message('No Access Rule changes to save')
      return
    }

    if (trimmedReason.length === 0) {
      toast.error('Add a reason before saving Access Rule changes')
      return
    }

    try {
      await bulkUpdate.mutateAsync({
        reason: trimmedReason,
        changes: changedRules.map((rule) => {
          const draft = drafts[rule.key]
          return {
            key: rule.key,
            configuredMinimumLevel: draft?.configuredMinimumLevel,
            configuredFloorLevel: draft?.configuredFloorLevel,
            localDescription: draft?.localDescription.trim() || null,
          }
        }),
      })
      toast.success('Access Rules saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save Access Rules')
    }
  }

  return (
    <div className="space-y-(--space-4)">
      <div className="grid gap-(--space-3) xl:grid-cols-[minmax(0,1fr)_22rem]">
        <AppCard status="info">
          <AppCardHeader>
            <AppCardTitle className="flex items-center gap-(--space-2)">
              <ShieldCheck className="h-5 w-5 text-info" aria-hidden="true" />
              Policy summary
            </AppCardTitle>
            <AppCardDescription>
              Access Rules define the minimum Account Level for Sentinel workflows. Developer
              changes to floors and thresholds are enforced by Sentinel.
            </AppCardDescription>
          </AppCardHeader>
          <AppCardContent>
            <div className="grid gap-(--space-3) md:grid-cols-4">
              <PolicyMetric label="Active rules" value={rules.length} />
              <PolicyMetric label="Changed drafts" value={changedRules.length} />
              <PolicyMetric
                label="Custom rules"
                value={rules.filter((r) => r.differsFromDefault).length}
              />
              <PolicyMetric label="Retired" value={retiredRules.length} />
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle className="flex items-center gap-(--space-2)">
              <FileText className="h-5 w-5 text-info" aria-hidden="true" />
              Report tools
            </AppCardTitle>
            <AppCardDescription>Print or save the current policy snapshot.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent className="flex flex-wrap gap-(--space-2)">
            <button type="button" className="btn btn-outline btn-sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print policy
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleDiscard}
              disabled={changedRules.length === 0}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Discard drafts
            </button>
          </AppCardContent>
        </AppCard>
      </div>

      <AppCard status={changedRules.length > 0 ? 'warning' : 'neutral'}>
        <AppCardHeader>
          <AppCardTitle>Review changes</AppCardTitle>
          <AppCardDescription>
            Bulk saves require a reason and create an audit entry for every changed rule.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="space-y-(--space-3)">
          <ChangeSummary
            loweredCount={loweredRules.length}
            raisedCount={raisedRules.length}
            floorCount={floorChanges.length}
            descriptionOnlyCount={descriptionOnlyChanges.length}
          />
          <fieldset className="fieldset max-w-2xl">
            <legend className="fieldset-legend">Reason</legend>
            <textarea
              className="textarea textarea-bordered min-h-20 w-full"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Explain why this Access Rule policy is changing."
            />
          </fieldset>
          <div className="flex flex-wrap justify-end gap-(--space-2)">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSave()}
              disabled={changedRules.length === 0 || bulkUpdate.isPending}
            >
              {bulkUpdate.isPending ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
              Save {changedRules.length} change{changedRules.length === 1 ? '' : 's'}
            </button>
          </div>
        </AppCardContent>
      </AppCard>

      <div className="space-y-(--space-4)">
        {groupedRules.map((group) => (
          <AccessRuleGroupTable
            key={group.group}
            label={group.label}
            rules={group.rules}
            drafts={drafts}
            onLevelChange={handleLevelChange}
            onFloorChange={handleFloorChange}
            onDescriptionChange={handleDescriptionChange}
            onResetRule={handleResetRule}
          />
        ))}
      </div>

      {retiredRules.length > 0 && (
        <AppCard status="warning">
          <AppCardHeader>
            <AppCardTitle>Retired rules</AppCardTitle>
            <AppCardDescription>
              These rules no longer exist in Sentinel&apos;s built-in catalog and are retained for
              review.
            </AppCardDescription>
          </AppCardHeader>
          <AppCardContent>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Configured level</th>
                    <th>Floor</th>
                    <th>Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {retiredRules.map((rule) => (
                    <tr key={rule.key}>
                      <td className="font-mono text-xs">{rule.key}</td>
                      <td>{getLevelLabel(rule.configuredMinimumLevel)}</td>
                      <td>{getLevelLabel(rule.floorLevel)}</td>
                      <td>{rule.updatedAt ?? 'Unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AppCardContent>
        </AppCard>
      )}
    </div>
  )
}

function PolicyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-box bg-base-200 p-(--space-3)">
      <p className="font-display text-2xl font-bold leading-none">{value}</p>
      <p className="mt-(--space-1) text-xs font-semibold uppercase tracking-wide text-base-content/55">
        {label}
      </p>
    </div>
  )
}

function ChangeSummary({
  loweredCount,
  raisedCount,
  floorCount,
  descriptionOnlyCount,
}: {
  loweredCount: number
  raisedCount: number
  floorCount: number
  descriptionOnlyCount: number
}) {
  return (
    <div className="grid gap-(--space-2) md:grid-cols-4">
      <div className="rounded-box bg-warning-fadded p-(--space-3) text-warning-fadded-content">
        <p className="text-xl font-bold">{loweredCount}</p>
        <p className="text-xs font-semibold uppercase tracking-wide">Lowered access</p>
      </div>
      <div className="rounded-box bg-info-fadded p-(--space-3) text-info-fadded-content">
        <p className="text-xl font-bold">{raisedCount}</p>
        <p className="text-xs font-semibold uppercase tracking-wide">Raised access</p>
      </div>
      <div className="rounded-box bg-primary-fadded p-(--space-3) text-primary-fadded-content">
        <p className="text-xl font-bold">{floorCount}</p>
        <p className="text-xs font-semibold uppercase tracking-wide">Floor changes</p>
      </div>
      <div className="rounded-box bg-neutral-fadded p-(--space-3) text-neutral-fadded-content">
        <p className="text-xl font-bold">{descriptionOnlyCount}</p>
        <p className="text-xs font-semibold uppercase tracking-wide">Description only</p>
      </div>
    </div>
  )
}

function AccessRuleGroupTable({
  label,
  rules,
  drafts,
  onLevelChange,
  onFloorChange,
  onDescriptionChange,
  onResetRule,
}: {
  label: string
  rules: readonly AccessRuleResponse[]
  drafts: RuleDrafts
  onLevelChange: (rule: AccessRuleResponse, value: number) => void
  onFloorChange: (rule: AccessRuleResponse, value: number) => void
  onDescriptionChange: (rule: AccessRuleResponse, value: string) => void
  onResetRule: (rule: AccessRuleResponse) => void
}) {
  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>{label}</AppCardTitle>
        <AppCardDescription>{rules.length} Access Rules</AppCardDescription>
      </AppCardHeader>
      <AppCardContent>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th className="w-[18rem]">Rule</th>
                <th>Required level</th>
                <th>Floor</th>
                <th>Defaults</th>
                <th className="w-[18rem]">Local description</th>
                <th className="w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const draft = drafts[rule.key]
                const changed = hasRuleChanged(rule, draft)
                const description = getRuleDescription(rule)
                const draftFloorLevel = draft?.configuredFloorLevel ?? rule.configuredFloorLevel

                return (
                  <tr key={rule.key} className={cn(changed && 'bg-warning-fadded/50')}>
                    <td className="align-top">
                      <div className="space-y-(--space-1)">
                        <div className="flex flex-wrap items-center gap-(--space-2)">
                          <span className="font-semibold">{rule.label}</span>
                          {rule.differsFromDefault && (
                            <AppBadge status="warning" size="sm">
                              Custom
                            </AppBadge>
                          )}
                        </div>
                        <p className="font-mono text-[0.7rem] text-base-content/55">{rule.key}</p>
                        <p className="text-xs text-base-content/65">{description}</p>
                        {rule.localDescription && (
                          <p className="text-[0.7rem] text-base-content/45">
                            Built-in: {rule.builtInDescription}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="align-top">
                      <select
                        className="select select-bordered select-sm min-w-44"
                        value={draft?.configuredMinimumLevel ?? rule.configuredMinimumLevel}
                        onChange={(event) => onLevelChange(rule, Number(event.target.value))}
                        aria-label={`${rule.label} required Account Level`}
                      >
                        {getLevelOptions(draftFloorLevel).map((level) => (
                          <option key={level} value={level}>
                            {getLevelLabel(level)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="align-top">
                      <select
                        className="select select-bordered select-sm min-w-44"
                        value={draftFloorLevel}
                        onChange={(event) => onFloorChange(rule, Number(event.target.value))}
                        aria-label={`${rule.label} floor Account Level`}
                      >
                        {getLevelOptions().map((level) => (
                          <option key={level} value={level}>
                            {getLevelLabel(level)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="align-top">
                      <div className="flex flex-col items-start gap-(--space-1)">
                        <Chip color="zinc" variant="flat" size="sm">
                          Required {getLevelLabel(rule.builtInDefaultLevel)}
                        </Chip>
                        <Chip color="blue" variant="flat" size="sm">
                          Floor {getLevelLabel(rule.builtInFloorLevel)}
                        </Chip>
                      </div>
                    </td>
                    <td className="align-top">
                      <textarea
                        className="textarea textarea-bordered textarea-sm min-h-16 w-full"
                        value={draft?.localDescription ?? ''}
                        onChange={(event) => onDescriptionChange(rule, event.target.value)}
                        maxLength={500}
                        placeholder="Optional local description"
                        aria-label={`${rule.label} local description`}
                      />
                    </td>
                    <td className="align-top text-right">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => onResetRule(rule)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        Reset
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </AppCardContent>
    </AppCard>
  )
}
