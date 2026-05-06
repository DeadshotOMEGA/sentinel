'use client'

import { useMemo, useState } from 'react'
import type {
  DutyWatchMonthlyOrdinal,
  IsoWeekday,
  OperationalNightAudienceTarget,
  OperationalNightAudienceTargetType,
  OperationalNightCancellation,
  OperationalNightRule,
  OperationalNightType,
} from '@sentinel/contracts'
import {
  addDaysToOperationalNightLocalDate,
  getNextOperationalNightOccurrence,
  listOperationalNightOccurrencesInRange,
} from '@sentinel/contracts'
import { Ban, CalendarDays, Pencil, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react'
import {
  AppCard,
  AppCardAction,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppAlert } from '@/components/ui/AppAlert'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
import { formatDateISO } from '@/lib/date-utils'
import { formatIsoWeekdayList, ISO_WEEKDAY_OPTIONS, sortIsoWeekdays } from '@/lib/iso-weekday'
import { TID } from '@/lib/test-ids'

type RuleEditorState = {
  mode: 'create' | 'edit'
  originalRuleId: string | null
  rule: OperationalNightRule
}

type OccurrenceTypeFilter = 'all' | OperationalNightType

interface DivisionOption {
  id: string
  name: string
  code?: string | null
}

interface TagOption {
  id: string
  name: string
}

interface MemberTypeOption {
  id: string
  name: string
  code?: string | null
}

interface TrainingAdminNightRulesSectionProps {
  rules: OperationalNightRule[]
  cancellations: OperationalNightCancellation[]
  divisions: DivisionOption[]
  tags: TagOption[]
  memberTypes: MemberTypeOption[]
  disabled: boolean
  onRulesChange: (rules: OperationalNightRule[]) => void
  onCancellationsChange: (cancellations: OperationalNightCancellation[]) => void
}

const MONTHLY_ORDINAL_OPTIONS: Array<{ value: DutyWatchMonthlyOrdinal; label: string }> = [
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
  { value: 'third', label: 'Third' },
  { value: 'fourth', label: 'Fourth' },
  { value: 'last', label: 'Last' },
]

const AUDIENCE_TARGET_OPTIONS: Array<{
  value: OperationalNightAudienceTargetType
  label: string
}> = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'division', label: 'Department' },
  { value: 'tag', label: 'Tag' },
  { value: 'member_type', label: 'Member Type' },
]

function createRuleId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }

  return `night-rule-${Date.now()}`
}

function cloneRule(rule: OperationalNightRule): OperationalNightRule {
  return JSON.parse(JSON.stringify(rule)) as OperationalNightRule
}

function createBlankRule(): OperationalNightRule {
  return {
    id: createRuleId(),
    name: 'Training Night',
    nightType: 'training',
    enabled: true,
    effectiveStartDate: formatDateISO(new Date()),
    effectiveEndDate: null,
    startTime: '19:00',
    endTime: '22:00',
    recurrence: {
      type: 'weekly',
      weekdays: [2],
      intervalWeeks: 1,
    },
    requiredAudience: [{ targetType: 'everyone', targetId: null }],
    optionalAudience: [],
  }
}

function getTargetKey(target: OperationalNightAudienceTarget): string {
  return `${target.targetType}:${target.targetId ?? 'all'}`
}

function buildAudienceTarget(
  targetType: OperationalNightAudienceTargetType,
  targetId: string
): OperationalNightAudienceTarget | null {
  if (targetType === 'everyone') {
    return { targetType, targetId: null }
  }

  if (!targetId) {
    return null
  }

  return { targetType, targetId }
}

function formatNightType(type: OperationalNightType): string {
  return type === 'administrative' ? 'Admin' : 'Training'
}

function formatOrdinal(value: DutyWatchMonthlyOrdinal): string {
  return MONTHLY_ORDINAL_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function formatRuleSummary(rule: OperationalNightRule): string {
  const weekdays = formatIsoWeekdayList(rule.recurrence.weekdays)
  if (rule.recurrence.type === 'weekly') {
    return rule.recurrence.intervalWeeks === 1
      ? `Every week on ${weekdays}`
      : `Every ${rule.recurrence.intervalWeeks} weeks on ${weekdays}`
  }

  return `${formatOrdinal(rule.recurrence.ordinal)} ${weekdays} each month`
}

function formatEffectiveDates(rule: OperationalNightRule): string {
  return rule.effectiveEndDate
    ? `${rule.effectiveStartDate} to ${rule.effectiveEndDate}`
    : `${rule.effectiveStartDate} onward`
}

function formatAudienceTarget(
  target: OperationalNightAudienceTarget,
  divisions: DivisionOption[],
  tags: TagOption[],
  memberTypes: MemberTypeOption[]
): string {
  if (target.targetType === 'everyone') {
    return 'Everyone'
  }

  if (target.targetType === 'division') {
    const division = divisions.find((item) => item.id === target.targetId)
    return division ? `${division.name}${division.code ? ` (${division.code})` : ''}` : 'Department'
  }

  if (target.targetType === 'tag') {
    return tags.find((item) => item.id === target.targetId)?.name ?? 'Tag'
  }

  return memberTypes.find((item) => item.id === target.targetId)?.name ?? 'Member Type'
}

function formatAudienceSummary(
  targets: OperationalNightAudienceTarget[],
  divisions: DivisionOption[],
  tags: TagOption[],
  memberTypes: MemberTypeOption[]
): string {
  if (targets.length === 0) {
    return 'None'
  }

  return targets
    .map((target) => formatAudienceTarget(target, divisions, tags, memberTypes))
    .join(', ')
}

function getTargetChoices(
  targetType: OperationalNightAudienceTargetType,
  divisions: DivisionOption[],
  tags: TagOption[],
  memberTypes: MemberTypeOption[]
): Array<{ id: string; label: string }> {
  if (targetType === 'division') {
    return divisions.map((division) => ({
      id: division.id,
      label: `${division.name}${division.code ? ` (${division.code})` : ''}`,
    }))
  }

  if (targetType === 'tag') {
    return tags.map((tag) => ({ id: tag.id, label: tag.name }))
  }

  if (targetType === 'member_type') {
    return memberTypes.map((memberType) => ({
      id: memberType.id,
      label: memberType.name,
    }))
  }

  return []
}

function normalizeWeekdays(values: IsoWeekday[]): IsoWeekday[] {
  const sorted = sortIsoWeekdays(values)
  return sorted.length > 0 ? sorted : [1]
}

export function TrainingAdminNightRulesSection({
  rules,
  cancellations,
  divisions,
  tags,
  memberTypes,
  disabled,
  onRulesChange,
  onCancellationsChange,
}: TrainingAdminNightRulesSectionProps) {
  const [editor, setEditor] = useState<RuleEditorState | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [occurrenceTypeFilter, setOccurrenceTypeFilter] = useState<OccurrenceTypeFilter>('all')
  const [occurrenceRuleFilter, setOccurrenceRuleFilter] = useState('all')
  const today = useMemo(() => formatDateISO(new Date()), [])
  const occurrenceEndDate = useMemo(() => addDaysToOperationalNightLocalDate(today, 180), [today])

  const upcomingOccurrences = useMemo(() => {
    const nightTypes: OperationalNightType[] | undefined =
      occurrenceTypeFilter === 'all' ? undefined : [occurrenceTypeFilter]
    return listOperationalNightOccurrencesInRange(rules, cancellations, today, occurrenceEndDate, {
      includeCancelled: true,
      nightTypes,
    }).filter(
      (occurrence) => occurrenceRuleFilter === 'all' || occurrence.ruleId === occurrenceRuleFilter
    )
  }, [cancellations, occurrenceEndDate, occurrenceRuleFilter, occurrenceTypeFilter, rules, today])

  const beginCreate = () => {
    setEditor({
      mode: 'create',
      originalRuleId: null,
      rule: createBlankRule(),
    })
    setEditorError(null)
  }

  const beginEdit = (rule: OperationalNightRule) => {
    setEditor({
      mode: 'edit',
      originalRuleId: rule.id,
      rule: cloneRule(rule),
    })
    setEditorError(null)
  }

  const cancelEditor = () => {
    setEditor(null)
    setEditorError(null)
  }

  const updateEditor = (updater: (rule: OperationalNightRule) => OperationalNightRule) => {
    setEditor((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        rule: updater(current.rule),
      }
    })
    setEditorError(null)
  }

  const toggleRuleEnabled = (ruleId: string, enabled: boolean) => {
    onRulesChange(rules.map((rule) => (rule.id === ruleId ? { ...rule, enabled } : rule)))
  }

  const deleteRule = (ruleId: string) => {
    onRulesChange(rules.filter((rule) => rule.id !== ruleId))
    onCancellationsChange(cancellations.filter((cancellation) => cancellation.ruleId !== ruleId))
    if (editor?.originalRuleId === ruleId) {
      cancelEditor()
    }
  }

  const saveEditor = () => {
    if (!editor) {
      return
    }

    const trimmedName = editor.rule.name.trim()
    if (!trimmedName) {
      setEditorError('Rule name is required.')
      return
    }

    if (
      editor.rule.effectiveEndDate &&
      editor.rule.effectiveStartDate.localeCompare(editor.rule.effectiveEndDate) > 0
    ) {
      setEditorError('Effective end date must be on or after effective start date.')
      return
    }

    if (editor.rule.enabled && editor.rule.requiredAudience.length === 0) {
      setEditorError('Enabled Training/Admin Night rules require at least one required audience.')
      return
    }

    const normalizedRule: OperationalNightRule = {
      ...editor.rule,
      name: trimmedName,
      recurrence:
        editor.rule.recurrence.type === 'weekly'
          ? {
              ...editor.rule.recurrence,
              weekdays: normalizeWeekdays(editor.rule.recurrence.weekdays),
              intervalWeeks: Math.max(1, Math.floor(editor.rule.recurrence.intervalWeeks)),
            }
          : {
              ...editor.rule.recurrence,
              weekdays: normalizeWeekdays(editor.rule.recurrence.weekdays),
            },
    }

    if (editor.mode === 'create') {
      onRulesChange([...rules, normalizedRule])
    } else {
      onRulesChange(
        rules.map((rule) => (rule.id === editor.originalRuleId ? normalizedRule : rule))
      )
    }

    setEditor(null)
    setEditorError(null)
  }

  const cancelOccurrence = (ruleId: string, date: string) => {
    if (cancellations.some((item) => item.ruleId === ruleId && item.date === date)) {
      return
    }

    onCancellationsChange([...cancellations, { ruleId, date, reason: null }])
  }

  const restoreOccurrence = (ruleId: string, date: string) => {
    onCancellationsChange(
      cancellations.filter((item) => item.ruleId !== ruleId || item.date !== date)
    )
  }

  return (
    <AppCard>
      <AppCardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AppCardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Training + Admin Nights
            </AppCardTitle>
            <AppCardDescription>
              Define reportable Training and Admin Night schedules, audiences, and upcoming
              cancellations.
            </AppCardDescription>
          </div>
          <AppCardAction>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={beginCreate}
              disabled={disabled}
              data-testid={TID.settings.timings.nightRulesAddRule}
            >
              <Plus className="h-4 w-4" />
              Add night
            </button>
          </AppCardAction>
        </div>
      </AppCardHeader>

      <AppCardContent className="space-y-4">
        <AppAlert tone="info">
          Reports use enabled rules to generate expected Training/Admin Nights. Unit Events still
          take precedence for real one-off events.
        </AppAlert>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Night</th>
                <th>Enabled</th>
                <th>Recurrence</th>
                <th>Effective Dates</th>
                <th>Time Window</th>
                <th>Required</th>
                <th>Optional</th>
                <th>Next Occurrence</th>
                <th className="w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-base-content/60">
                    No Training/Admin Night rules are defined.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const nextOccurrence = getNextOperationalNightOccurrence(
                    [rule],
                    cancellations,
                    today
                  )

                  return (
                    <tr key={rule.id} data-testid={TID.settings.timings.nightRulesRuleRow(rule.id)}>
                      <td className="min-w-44">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{rule.name}</span>
                          <Chip size="sm" variant="faded" color="blue">
                            {formatNightType(rule.nightType)}
                          </Chip>
                        </div>
                      </td>
                      <td>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="toggle toggle-sm toggle-primary"
                            checked={rule.enabled}
                            onChange={(event) => toggleRuleEnabled(rule.id, event.target.checked)}
                            disabled={disabled}
                            data-testid={TID.settings.timings.nightRulesRuleToggle(rule.id)}
                          />
                          <AppBadge status={rule.enabled ? 'success' : 'neutral'} size="sm">
                            {rule.enabled ? 'Active' : 'Off'}
                          </AppBadge>
                        </label>
                      </td>
                      <td className="min-w-48 text-sm">{formatRuleSummary(rule)}</td>
                      <td className="min-w-40 text-xs">{formatEffectiveDates(rule)}</td>
                      <td className="font-mono text-xs">
                        {rule.startTime} - {rule.endTime}
                      </td>
                      <td className="max-w-56 text-xs">
                        {formatAudienceSummary(rule.requiredAudience, divisions, tags, memberTypes)}
                      </td>
                      <td className="max-w-56 text-xs">
                        {formatAudienceSummary(rule.optionalAudience, divisions, tags, memberTypes)}
                      </td>
                      <td className="text-sm">
                        {nextOccurrence ? (
                          <span>
                            {nextOccurrence.date} · {nextOccurrence.startTime}
                          </span>
                        ) : (
                          <span className="text-base-content/60">No upcoming occurrence</span>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => beginEdit(rule)}
                            disabled={disabled}
                            data-testid={TID.settings.timings.nightRulesRuleEdit(rule.id)}
                            aria-label={`Edit ${rule.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => deleteRule(rule.id)}
                            disabled={disabled}
                            data-testid={TID.settings.timings.nightRulesRuleDelete(rule.id)}
                            aria-label={`Delete ${rule.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {editor && (
          <RuleEditor
            editor={editor}
            editorError={editorError}
            disabled={disabled}
            divisions={divisions}
            tags={tags}
            memberTypes={memberTypes}
            onUpdate={updateEditor}
            onSave={saveEditor}
            onCancel={cancelEditor}
          />
        )}

        <div className="divider divider-start">Upcoming Occurrences</div>
        <div className="grid gap-3 md:grid-cols-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Night type</legend>
            <select
              className="select select-bordered select-sm w-full"
              value={occurrenceTypeFilter}
              onChange={(event) =>
                setOccurrenceTypeFilter(event.target.value as OccurrenceTypeFilter)
              }
            >
              <option value="all">All nights</option>
              <option value="training">Training</option>
              <option value="administrative">Admin</option>
            </select>
          </fieldset>
          <fieldset className="fieldset md:col-span-2">
            <legend className="fieldset-legend">Rule</legend>
            <select
              className="select select-bordered select-sm w-full"
              value={occurrenceRuleFilter}
              onChange={(event) => setOccurrenceRuleFilter(event.target.value)}
            >
              <option value="all">All rules</option>
              {rules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name}
                </option>
              ))}
            </select>
          </fieldset>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Night</th>
                <th>Time Window</th>
                <th>Required</th>
                <th>Optional</th>
                <th>Status</th>
                <th className="w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {upcomingOccurrences.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-base-content/60">
                    No upcoming generated occurrences in the next 180 days.
                  </td>
                </tr>
              ) : (
                upcomingOccurrences.map((occurrence) => (
                  <tr
                    key={`${occurrence.ruleId}-${occurrence.date}`}
                    className={occurrence.isCancelled ? 'opacity-65' : undefined}
                    data-testid={TID.settings.timings.nightRulesOccurrenceRow(
                      occurrence.ruleId,
                      occurrence.date
                    )}
                  >
                    <td className="font-mono text-xs">{occurrence.date}</td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{occurrence.ruleName}</span>
                        <Chip size="sm" variant="faded" color="blue">
                          {formatNightType(occurrence.nightType)}
                        </Chip>
                      </div>
                    </td>
                    <td className="font-mono text-xs">
                      {occurrence.startTime} - {occurrence.endTime}
                    </td>
                    <td className="max-w-56 text-xs">
                      {formatAudienceSummary(
                        occurrence.requiredAudience,
                        divisions,
                        tags,
                        memberTypes
                      )}
                    </td>
                    <td className="max-w-56 text-xs">
                      {formatAudienceSummary(
                        occurrence.optionalAudience,
                        divisions,
                        tags,
                        memberTypes
                      )}
                    </td>
                    <td>
                      <AppBadge status={occurrence.isCancelled ? 'warning' : 'success'} size="sm">
                        {occurrence.isCancelled ? 'Cancelled' : 'Scheduled'}
                      </AppBadge>
                    </td>
                    <td>
                      <div className="flex justify-end">
                        {occurrence.isCancelled ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => restoreOccurrence(occurrence.ruleId, occurrence.date)}
                            disabled={disabled}
                            data-testid={TID.settings.timings.nightRulesOccurrenceRestore(
                              occurrence.ruleId,
                              occurrence.date
                            )}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-warning"
                            onClick={() => cancelOccurrence(occurrence.ruleId, occurrence.date)}
                            disabled={disabled}
                            data-testid={TID.settings.timings.nightRulesOccurrenceCancel(
                              occurrence.ruleId,
                              occurrence.date
                            )}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AppCardContent>
    </AppCard>
  )
}

function RuleEditor({
  editor,
  editorError,
  disabled,
  divisions,
  tags,
  memberTypes,
  onUpdate,
  onSave,
  onCancel,
}: {
  editor: RuleEditorState
  editorError: string | null
  disabled: boolean
  divisions: DivisionOption[]
  tags: TagOption[]
  memberTypes: MemberTypeOption[]
  onUpdate: (updater: (rule: OperationalNightRule) => OperationalNightRule) => void
  onSave: () => void
  onCancel: () => void
}) {
  const toggleWeekday = (weekday: IsoWeekday, checked: boolean) => {
    onUpdate((rule) => {
      const currentWeekdays = rule.recurrence.weekdays
      const nextWeekdays = checked
        ? normalizeWeekdays([...currentWeekdays, weekday])
        : normalizeWeekdays(currentWeekdays.filter((item) => item !== weekday))

      return {
        ...rule,
        recurrence: {
          ...rule.recurrence,
          weekdays: nextWeekdays,
        },
      }
    })
  }

  return (
    <>
      <div className="divider divider-start">Night Rule Editor</div>
      {editorError && <AppAlert tone="error">{editorError}</AppAlert>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Night type</legend>
          <select
            className="select select-bordered select-sm w-full"
            value={editor.rule.nightType}
            onChange={(event) =>
              onUpdate((rule) => ({
                ...rule,
                nightType: event.target.value as OperationalNightType,
                name:
                  rule.name === 'Training Night' || rule.name === 'Admin Night'
                    ? event.target.value === 'administrative'
                      ? 'Admin Night'
                      : 'Training Night'
                    : rule.name,
              }))
            }
            disabled={disabled}
            data-testid={TID.settings.timings.nightRulesEditorType}
          >
            <option value="training">Training</option>
            <option value="administrative">Admin</option>
          </select>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Name</legend>
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            value={editor.rule.name}
            onChange={(event) => onUpdate((rule) => ({ ...rule, name: event.target.value }))}
            disabled={disabled}
            data-testid={TID.settings.timings.nightRulesEditorName}
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Enabled</legend>
          <label className="flex min-h-8 items-center gap-3">
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={editor.rule.enabled}
              onChange={(event) => onUpdate((rule) => ({ ...rule, enabled: event.target.checked }))}
              disabled={disabled}
              data-testid={TID.settings.timings.nightRulesEditorEnabled}
            />
            <span className="text-sm">{editor.rule.enabled ? 'Active' : 'Disabled'}</span>
          </label>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Recurrence type</legend>
          <select
            className="select select-bordered select-sm w-full"
            value={editor.rule.recurrence.type}
            onChange={(event) =>
              onUpdate((rule) => {
                const weekdays = rule.recurrence.weekdays
                return {
                  ...rule,
                  recurrence:
                    event.target.value === 'monthly_nth_weekday'
                      ? {
                          type: 'monthly_nth_weekday',
                          weekdays,
                          ordinal: 'first',
                        }
                      : {
                          type: 'weekly',
                          weekdays,
                          intervalWeeks: 1,
                        },
                }
              })
            }
            disabled={disabled}
            data-testid={TID.settings.timings.nightRulesEditorRecurrenceType}
          >
            <option value="weekly">Every N weeks</option>
            <option value="monthly_nth_weekday">Monthly nth weekday</option>
          </select>
        </fieldset>

        <fieldset className="fieldset md:col-span-2">
          <legend className="fieldset-legend">Weekday(s)</legend>
          <div className="flex flex-wrap gap-2">
            {ISO_WEEKDAY_OPTIONS.map((option) => (
              <label key={option.value} className="btn btn-outline btn-xs">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={editor.rule.recurrence.weekdays.includes(option.value)}
                  onChange={(event) => toggleWeekday(option.value, event.target.checked)}
                  disabled={disabled}
                />
                {option.shortLabel}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">
            {editor.rule.recurrence.type === 'weekly' ? 'Every N weeks' : 'Ordinal'}
          </legend>
          {editor.rule.recurrence.type === 'weekly' ? (
            <input
              type="number"
              min={1}
              className="input input-bordered input-sm w-full"
              value={editor.rule.recurrence.intervalWeeks}
              onChange={(event) =>
                onUpdate((rule) => ({
                  ...rule,
                  recurrence:
                    rule.recurrence.type === 'weekly'
                      ? {
                          ...rule.recurrence,
                          intervalWeeks: Number(event.target.value) || 1,
                        }
                      : rule.recurrence,
                }))
              }
              disabled={disabled}
              data-testid={TID.settings.timings.nightRulesEditorInterval}
            />
          ) : (
            <select
              className="select select-bordered select-sm w-full"
              value={editor.rule.recurrence.ordinal}
              onChange={(event) =>
                onUpdate((rule) => ({
                  ...rule,
                  recurrence:
                    rule.recurrence.type === 'monthly_nth_weekday'
                      ? {
                          ...rule.recurrence,
                          ordinal: event.target.value as DutyWatchMonthlyOrdinal,
                        }
                      : rule.recurrence,
                }))
              }
              disabled={disabled}
              data-testid={TID.settings.timings.nightRulesEditorOrdinal}
            >
              {MONTHLY_ORDINAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Effective start</legend>
          <input
            type="date"
            className="input input-bordered input-sm w-full"
            value={editor.rule.effectiveStartDate}
            onChange={(event) =>
              onUpdate((rule) => ({ ...rule, effectiveStartDate: event.target.value }))
            }
            disabled={disabled}
            data-testid={TID.settings.timings.nightRulesEditorStartDate}
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Effective end</legend>
          <input
            type="date"
            className="input input-bordered input-sm w-full"
            value={editor.rule.effectiveEndDate ?? ''}
            onChange={(event) =>
              onUpdate((rule) => ({
                ...rule,
                effectiveEndDate: event.target.value || null,
              }))
            }
            disabled={disabled}
            data-testid={TID.settings.timings.nightRulesEditorEndDate}
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Start time</legend>
          <input
            type="time"
            className="input input-bordered input-sm w-full"
            value={editor.rule.startTime}
            onChange={(event) => onUpdate((rule) => ({ ...rule, startTime: event.target.value }))}
            disabled={disabled}
            data-testid={TID.settings.timings.nightRulesEditorStartTime}
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">End time</legend>
          <input
            type="time"
            className="input input-bordered input-sm w-full"
            value={editor.rule.endTime}
            onChange={(event) => onUpdate((rule) => ({ ...rule, endTime: event.target.value }))}
            disabled={disabled}
            data-testid={TID.settings.timings.nightRulesEditorEndTime}
          />
        </fieldset>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AudienceBuilder
          title="Required audience"
          targets={editor.rule.requiredAudience}
          blockedTargets={editor.rule.optionalAudience}
          divisions={divisions}
          tags={tags}
          memberTypes={memberTypes}
          disabled={disabled}
          onChange={(targets) =>
            onUpdate((rule) => ({
              ...rule,
              requiredAudience: targets,
            }))
          }
        />
        <AudienceBuilder
          title="Optional audience"
          targets={editor.rule.optionalAudience}
          blockedTargets={editor.rule.requiredAudience}
          divisions={divisions}
          tags={tags}
          memberTypes={memberTypes}
          disabled={disabled}
          onChange={(targets) =>
            onUpdate((rule) => ({
              ...rule,
              optionalAudience: targets,
            }))
          }
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onSave}
          disabled={disabled}
          data-testid={TID.settings.timings.nightRulesEditorSave}
        >
          <Save className="h-4 w-4" />
          Apply night
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onCancel}
          disabled={disabled}
          data-testid={TID.settings.timings.nightRulesEditorCancel}
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </>
  )
}

function AudienceBuilder({
  title,
  targets,
  blockedTargets,
  divisions,
  tags,
  memberTypes,
  disabled,
  onChange,
}: {
  title: string
  targets: OperationalNightAudienceTarget[]
  blockedTargets: OperationalNightAudienceTarget[]
  divisions: DivisionOption[]
  tags: TagOption[]
  memberTypes: MemberTypeOption[]
  disabled: boolean
  onChange: (targets: OperationalNightAudienceTarget[]) => void
}) {
  const [targetType, setTargetType] = useState<OperationalNightAudienceTargetType>('everyone')
  const [targetId, setTargetId] = useState('')
  const choices = getTargetChoices(targetType, divisions, tags, memberTypes)
  const selectedTarget = buildAudienceTarget(targetType, targetId)
  const blockedKeys = new Set([...targets, ...blockedTargets].map(getTargetKey))
  const canAdd = selectedTarget !== null && !blockedKeys.has(getTargetKey(selectedTarget))

  const addTarget = () => {
    if (!selectedTarget || !canAdd) {
      return
    }

    onChange([...targets, selectedTarget])
    setTargetId('')
  }

  const removeTarget = (target: OperationalNightAudienceTarget) => {
    const targetKey = getTargetKey(target)
    onChange(targets.filter((item) => getTargetKey(item) !== targetKey))
  }

  return (
    <div className="rounded-box border border-base-300 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-base-content/60">{targets.length} target(s)</span>
      </div>
      <div className="grid gap-2 md:grid-cols-[10rem_1fr_auto]">
        <select
          className="select select-bordered select-sm w-full"
          value={targetType}
          onChange={(event) => {
            setTargetType(event.target.value as OperationalNightAudienceTargetType)
            setTargetId('')
          }}
          disabled={disabled}
        >
          {AUDIENCE_TARGET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="select select-bordered select-sm w-full"
          value={targetType === 'everyone' ? '' : targetId}
          onChange={(event) => setTargetId(event.target.value)}
          disabled={disabled || targetType === 'everyone'}
        >
          <option value="">{targetType === 'everyone' ? 'All members' : 'Select target'}</option>
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={addTarget}
          disabled={disabled || !canAdd}
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {targets.length === 0 ? (
          <span className="text-xs text-base-content/55">No audience targets added.</span>
        ) : (
          targets.map((target) => (
            <span
              key={getTargetKey(target)}
              className="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-200 px-2 py-1 text-xs"
            >
              {formatAudienceTarget(target, divisions, tags, memberTypes)}
              <button
                type="button"
                className="btn btn-ghost btn-xs h-4 min-h-4 w-4 p-0"
                onClick={() => removeTarget(target)}
                disabled={disabled}
                aria-label={`Remove ${formatAudienceTarget(target, divisions, tags, memberTypes)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  )
}
