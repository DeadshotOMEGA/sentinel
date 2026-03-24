'use client'

import { useMemo, useState } from 'react'
import type { DutyWatchMonthlyOrdinal, DutyWatchRule, IsoWeekday } from '@sentinel/contracts'
import { CalendarDays, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import {
  AppCard,
  AppCardAction,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  formatDutyWatchOccurrenceLabel,
  formatDutyWatchRuleSummary,
  getNextOccurrenceForRule,
} from '@/lib/duty-watch'
import { formatDateISO } from '@/lib/date-utils'
import { ISO_WEEKDAY_OPTIONS } from '@/lib/iso-weekday'
import { TID } from '@/lib/test-ids'

type EditorState = {
  mode: 'create' | 'edit'
  originalRuleId: string | null
  rule: DutyWatchRule
}

const MONTHLY_ORDINAL_OPTIONS: Array<{ value: DutyWatchMonthlyOrdinal; label: string }> = [
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
  { value: 'third', label: 'Third' },
  { value: 'fourth', label: 'Fourth' },
  { value: 'last', label: 'Last' },
]

function createRuleId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }

  return `duty-watch-${Date.now()}`
}

function createBlankRule(): DutyWatchRule {
  return {
    id: createRuleId(),
    name: 'Duty Watch',
    effectiveStartDate: formatDateISO(new Date()),
    startTime: '19:00',
    endTime: '19:00',
    recurrence: {
      type: 'weekly',
      weekday: 2,
      intervalWeeks: 1,
    },
  }
}

interface DutyWatchRulesSectionProps {
  rules: DutyWatchRule[]
  disabled: boolean
  onChange: (rules: DutyWatchRule[]) => void
}

export function DutyWatchRulesSection({ rules, disabled, onChange }: DutyWatchRulesSectionProps) {
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const today = useMemo(() => formatDateISO(new Date()), [])

  const beginCreate = () => {
    setEditor({
      mode: 'create',
      originalRuleId: null,
      rule: createBlankRule(),
    })
    setEditorError(null)
  }

  const beginEdit = (rule: DutyWatchRule) => {
    setEditor({
      mode: 'edit',
      originalRuleId: rule.id,
      rule: JSON.parse(JSON.stringify(rule)) as DutyWatchRule,
    })
    setEditorError(null)
  }

  const cancelEditor = () => {
    setEditor(null)
    setEditorError(null)
  }

  const updateEditor = (updater: (rule: DutyWatchRule) => DutyWatchRule) => {
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

  const saveEditor = () => {
    if (!editor) {
      return
    }

    const trimmedName = editor.rule.name.trim()
    if (!trimmedName) {
      setEditorError('Rule name is required.')
      return
    }

    const normalizedRule: DutyWatchRule = {
      ...editor.rule,
      name: trimmedName,
      recurrence:
        editor.rule.recurrence.type === 'weekly'
          ? {
              ...editor.rule.recurrence,
              intervalWeeks: Math.max(1, Math.floor(editor.rule.recurrence.intervalWeeks)),
            }
          : editor.rule.recurrence,
    }

    if (editor.mode === 'create') {
      onChange([...rules, normalizedRule])
    } else {
      onChange(rules.map((rule) => (rule.id === editor.originalRuleId ? normalizedRule : rule)))
    }

    setEditor(null)
    setEditorError(null)
  }

  const deleteRule = (ruleId: string) => {
    onChange(rules.filter((rule) => rule.id !== ruleId))
    if (editor?.originalRuleId === ruleId) {
      cancelEditor()
    }
  }

  return (
    <AppCard>
      <AppCardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AppCardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Duty Watch
            </AppCardTitle>
            <AppCardDescription>
              Define named Duty Watch rules with weekly or monthly recurrence and exact time
              windows.
            </AppCardDescription>
          </div>
          <AppCardAction>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={beginCreate}
              disabled={disabled}
              data-testid={TID.settings.timings.dutyWatchAddRule}
            >
              <Plus className="h-4 w-4" />
              Add rule
            </button>
          </AppCardAction>
        </div>
      </AppCardHeader>

      <AppCardContent className="space-y-4">
        <div role="alert" className="alert alert-info alert-soft">
          <span>
            Each rule can schedule a weekly pattern or a monthly nth-weekday pattern. The start time
            is the v1 alert trigger.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Recurrence</th>
                <th>Time Window</th>
                <th>Next Occurrence</th>
                <th className="w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const nextOccurrence = getNextOccurrenceForRule(rule, today)

                return (
                  <tr key={rule.id} data-testid={TID.settings.timings.dutyWatchRuleRow(rule.id)}>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{rule.name}</span>
                        {rule.recurrence.type === 'monthly_nth_weekday' && (
                          <AppBadge status="info" size="sm">
                            Monthly
                          </AppBadge>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{formatDutyWatchRuleSummary(rule)}</div>
                      <div className="text-xs text-base-content/60">
                        Starts {rule.effectiveStartDate}
                      </div>
                    </td>
                    <td className="font-mono text-xs">
                      {rule.startTime} - {rule.endTime}
                    </td>
                    <td className="text-sm">
                      {nextOccurrence ? (
                        <span>{formatDutyWatchOccurrenceLabel(nextOccurrence)}</span>
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
                          data-testid={TID.settings.timings.dutyWatchRuleEdit(rule.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => deleteRule(rule.id)}
                          disabled={disabled || rules.length <= 1}
                          data-testid={TID.settings.timings.dutyWatchRuleDelete(rule.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {editor && (
          <>
            <div className="divider divider-start">Rule Editor</div>
            {editorError && (
              <div role="alert" className="alert alert-error alert-soft">
                <span>{editorError}</span>
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Rule name</legend>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  value={editor.rule.name}
                  onChange={(event) =>
                    updateEditor((rule) => ({ ...rule, name: event.target.value }))
                  }
                  disabled={disabled}
                  data-testid={TID.settings.timings.dutyWatchEditorName}
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Recurrence type</legend>
                <select
                  className="select select-bordered select-sm w-full"
                  value={editor.rule.recurrence.type}
                  onChange={(event) =>
                    updateEditor((rule) => ({
                      ...rule,
                      recurrence:
                        event.target.value === 'monthly_nth_weekday'
                          ? {
                              type: 'monthly_nth_weekday',
                              weekday: rule.recurrence.weekday,
                              ordinal: 'first',
                            }
                          : {
                              type: 'weekly',
                              weekday: rule.recurrence.weekday,
                              intervalWeeks: 1,
                            },
                    }))
                  }
                  disabled={disabled}
                  data-testid={TID.settings.timings.dutyWatchEditorType}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly_nth_weekday">Monthly nth weekday</option>
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Weekday</legend>
                <select
                  className="select select-bordered select-sm w-full"
                  value={editor.rule.recurrence.weekday}
                  onChange={(event) =>
                    updateEditor((rule) => ({
                      ...rule,
                      recurrence: {
                        ...rule.recurrence,
                        weekday: Number(event.target.value) as IsoWeekday,
                      },
                    }))
                  }
                  disabled={disabled}
                  data-testid={TID.settings.timings.dutyWatchEditorWeekday}
                >
                  {ISO_WEEKDAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.longLabel}
                    </option>
                  ))}
                </select>
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
                      updateEditor((rule) => ({
                        ...rule,
                        recurrence: {
                          ...rule.recurrence,
                          intervalWeeks: Number(event.target.value) || 1,
                        },
                      }))
                    }
                    disabled={disabled}
                    data-testid={TID.settings.timings.dutyWatchEditorInterval}
                  />
                ) : (
                  <select
                    className="select select-bordered select-sm w-full"
                    value={editor.rule.recurrence.ordinal}
                    onChange={(event) =>
                      updateEditor((rule) => ({
                        ...rule,
                        recurrence: {
                          ...rule.recurrence,
                          ordinal: event.target.value as DutyWatchMonthlyOrdinal,
                        },
                      }))
                    }
                    disabled={disabled}
                    data-testid={TID.settings.timings.dutyWatchEditorOrdinal}
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
                <legend className="fieldset-legend">Effective start date</legend>
                <input
                  type="date"
                  className="input input-bordered input-sm w-full"
                  value={editor.rule.effectiveStartDate}
                  onChange={(event) =>
                    updateEditor((rule) => ({
                      ...rule,
                      effectiveStartDate: event.target.value,
                    }))
                  }
                  disabled={disabled}
                  data-testid={TID.settings.timings.dutyWatchEditorStartDate}
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Start time</legend>
                <input
                  type="time"
                  className="input input-bordered input-sm w-full"
                  value={editor.rule.startTime}
                  onChange={(event) =>
                    updateEditor((rule) => ({ ...rule, startTime: event.target.value }))
                  }
                  disabled={disabled}
                  data-testid={TID.settings.timings.dutyWatchEditorStartTime}
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">End time</legend>
                <input
                  type="time"
                  className="input input-bordered input-sm w-full"
                  value={editor.rule.endTime}
                  onChange={(event) =>
                    updateEditor((rule) => ({ ...rule, endTime: event.target.value }))
                  }
                  disabled={disabled}
                  data-testid={TID.settings.timings.dutyWatchEditorEndTime}
                />
              </fieldset>

              <div className="fieldset justify-end">
                <legend className="fieldset-legend">Actions</legend>
                <div className="join join-vertical sm:join-horizontal">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm join-item"
                    onClick={saveEditor}
                    disabled={disabled}
                    data-testid={TID.settings.timings.dutyWatchEditorSave}
                  >
                    <Save className="h-4 w-4" />
                    Apply rule
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm join-item"
                    onClick={cancelEditor}
                    disabled={disabled}
                    data-testid={TID.settings.timings.dutyWatchEditorCancel}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </AppCardContent>
    </AppCard>
  )
}
