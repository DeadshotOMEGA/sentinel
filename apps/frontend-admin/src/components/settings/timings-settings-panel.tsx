'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  OperationalAlertRateLimitKey,
  OperationalTimingsSettings,
  SecurityAlertRateLimitKey,
} from '@sentinel/contracts'
import { Clock3, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useOperationalTimings, useUpdateOperationalTimings } from '@/hooks/use-operational-timings'
import { TID } from '@/lib/test-ids'
import { AccountLevel, useAuthStore } from '@/store/auth-store'
import { DutyWatchRulesSection } from './duty-watch-rules-section'

const OPERATIONAL_ALERT_FIELDS: Array<{
  key: OperationalAlertRateLimitKey
  label: string
}> = [
  { key: 'lockup_reminder', label: 'Lockup Reminder' },
  { key: 'lockup_not_executed', label: 'Lockup Overdue' },
  { key: 'duty_watch_missing', label: 'Duty Watch Missing' },
  { key: 'duty_watch_not_checked_in', label: 'Duty Watch Not Checked In' },
  { key: 'building_not_secured', label: 'Building Not Secured' },
  { key: 'member_missed_checkout', label: 'Missed Checkout' },
]

const SECURITY_ALERT_FIELDS: Array<{
  key: SecurityAlertRateLimitKey
  label: string
}> = [
  { key: 'badge_disabled', label: 'Badge Disabled' },
  { key: 'badge_unknown', label: 'Unknown Badge' },
  { key: 'inactive_member', label: 'Inactive Member' },
  { key: 'unauthorized_access', label: 'Unauthorized Access' },
]

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function cloneSettings(settings: OperationalTimingsSettings): OperationalTimingsSettings {
  return deepClone(settings)
}

function compareMonthDay(left: string, right: string): number {
  const [leftMonthText, leftDayText] = left.split('-')
  const [rightMonthText, rightDayText] = right.split('-')

  const leftMonth = Number(leftMonthText)
  const leftDay = Number(leftDayText)
  const rightMonth = Number(rightMonthText)
  const rightDay = Number(rightDayText)

  if (leftMonth !== rightMonth) {
    return leftMonth - rightMonth
  }

  return leftDay - rightDay
}

function toNumber(value: string, fallback = 1): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(1, Math.floor(parsed))
}

function formatUpdatedAt(updatedAt: string | null): string {
  if (!updatedAt) {
    return 'Not yet saved'
  }

  const parsed = new Date(updatedAt)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown'
  }

  return parsed.toLocaleString()
}

export function TimingsSettingsPanel() {
  const { data, isLoading, isError, error, refetch } = useOperationalTimings()
  const updateOperationalTimings = useUpdateOperationalTimings()
  const member = useAuthStore((state) => state.member)
  const canEdit = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN

  const [draft, setDraft] = useState<OperationalTimingsSettings | null>(null)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!data?.settings) {
      return
    }

    setDraft((current) => current ?? cloneSettings(data.settings))
  }, [data?.settings])

  const isDirty = useMemo(() => {
    if (!draft || !data?.settings) {
      return false
    }
    return JSON.stringify(draft) !== JSON.stringify(data.settings)
  }, [draft, data?.settings])

  const isSaving = updateOperationalTimings.isPending
  const isDisabled = isSaving || !canEdit

  const updateDraft = (
    updater: (current: OperationalTimingsSettings) => OperationalTimingsSettings
  ) => {
    setDraft((current) => {
      if (!current) {
        return current
      }
      return updater(current)
    })
    setValidationMessage(null)
  }

  const setOperationalAlertRule = (
    key: OperationalAlertRateLimitKey,
    field: 'threshold' | 'timeWindowMinutes',
    value: string
  ) => {
    updateDraft((current) => ({
      ...current,
      alertRateLimits: {
        ...current.alertRateLimits,
        operational: {
          ...current.alertRateLimits.operational,
          [key]: {
            ...current.alertRateLimits.operational[key],
            [field]: toNumber(value),
          },
        },
      },
    }))
  }

  const setSecurityAlertRule = (
    key: SecurityAlertRateLimitKey,
    field: 'threshold' | 'timeWindowMinutes',
    value: string
  ) => {
    updateDraft((current) => ({
      ...current,
      alertRateLimits: {
        ...current.alertRateLimits,
        security: {
          ...current.alertRateLimits.security,
          [key]: {
            ...current.alertRateLimits.security[key],
            [field]: toNumber(value),
          },
        },
      },
    }))
  }

  const handleReset = () => {
    if (!data?.settings) {
      return
    }
    setDraft(cloneSettings(data.settings))
    setValidationMessage(null)
  }

  const handleSave = async () => {
    if (!draft || !canEdit) {
      return
    }

    if (draft.operational.dutyWatchRules.length < 1) {
      setValidationMessage('Add at least one Duty Watch rule.')
      return
    }

    if (compareMonthDay(draft.workingHours.summerStartDate, draft.workingHours.summerEndDate) > 0) {
      setValidationMessage('Summer end date must be on or after summer start date.')
      return
    }

    try {
      const updated = await updateOperationalTimings.mutateAsync(draft)
      setDraft(cloneSettings(updated.settings))
      setValidationMessage(null)
      toast.success('Operational timings saved')
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : 'Failed to update operational timings'
      setValidationMessage(message)
      toast.error(message)
    }
  }

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (isError) {
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5" />
            Timings
          </AppCardTitle>
          <AppCardDescription>
            Failed to load operational timings from the backend.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="space-y-3">
          <div role="alert" className="alert alert-error alert-soft">
            <span>{error instanceof Error ? error.message : 'Unknown error'}</span>
          </div>
          <button className="btn btn-sm btn-outline" onClick={() => refetch()}>
            Retry
          </button>
        </AppCardContent>
      </AppCard>
    )
  }

  return (
    <div className="space-y-4" data-testid={TID.settings.timings.form}>
      <AppCard variant="elevated">
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5" />
            Operational Timings
          </AppCardTitle>
          <AppCardDescription>
            Scheduler cutoffs, Duty Watch timing, working hours, and duplicate-alert limits.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="space-y-3">
          <div role="alert" className="alert alert-info alert-soft">
            <span>
              Source: <strong>{data?.metadata.source ?? 'unknown'}</strong> | Last update:{' '}
              {formatUpdatedAt(data?.metadata.updatedAt ?? null)}
            </span>
          </div>
          {!canEdit && (
            <div role="alert" className="alert alert-warning alert-soft text-base-content">
              <span>Admin or Developer account level is required to save timing changes.</span>
            </div>
          )}
          {validationMessage && (
            <div role="alert" className="alert alert-error alert-soft">
              <span>{validationMessage}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={!isDirty || isDisabled}
              data-testid={TID.settings.timings.saveBtn}
            >
              {isSaving ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Timings
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleReset}
              disabled={!isDirty || isDisabled}
              data-testid={TID.settings.timings.resetBtn}
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </AppCardContent>
      </AppCard>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle>Operational Clock</AppCardTitle>
          <AppCardDescription>Day rollover and lockup alert trigger times.</AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Day rollover</legend>
            <input
              type="time"
              className="input input-bordered input-sm w-full"
              value={draft.operational.dayRolloverTime}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  operational: {
                    ...current.operational,
                    dayRolloverTime: event.target.value,
                  },
                }))
              }
              disabled={isDisabled}
              data-testid={TID.settings.timings.dayRollover}
            />
            <p className="label">Operational date switches at this time.</p>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Lockup warning</legend>
            <input
              type="time"
              className="input input-bordered input-sm w-full"
              value={draft.operational.lockupWarningTime}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  operational: {
                    ...current.operational,
                    lockupWarningTime: event.target.value,
                  },
                }))
              }
              disabled={isDisabled}
              data-testid={TID.settings.timings.lockupWarning}
            />
            <p className="label">Warning alert trigger.</p>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Lockup critical</legend>
            <input
              type="time"
              className="input input-bordered input-sm w-full"
              value={draft.operational.lockupCriticalTime}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  operational: {
                    ...current.operational,
                    lockupCriticalTime: event.target.value,
                  },
                }))
              }
              disabled={isDisabled}
              data-testid={TID.settings.timings.lockupCritical}
            />
            <p className="label">Critical alert trigger.</p>
          </fieldset>
        </AppCardContent>
      </AppCard>

      <DutyWatchRulesSection
        rules={draft.operational.dutyWatchRules}
        disabled={isDisabled}
        onChange={(rules) =>
          updateDraft((current) => ({
            ...current,
            operational: {
              ...current.operational,
              dutyWatchRules: rules,
            },
          }))
        }
      />

      <AppCard>
        <AppCardHeader>
          <AppCardTitle>Workday + Summer Hours</AppCardTitle>
          <AppCardDescription>Standard and summer recurring timing windows.</AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Regular start</legend>
              <input
                type="time"
                className="input input-bordered input-sm w-full"
                value={draft.workingHours.regularWeekdayStart}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    workingHours: {
                      ...current.workingHours,
                      regularWeekdayStart: event.target.value,
                    },
                  }))
                }
                disabled={isDisabled}
                data-testid={TID.settings.timings.regularStart}
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Regular end</legend>
              <input
                type="time"
                className="input input-bordered input-sm w-full"
                value={draft.workingHours.regularWeekdayEnd}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    workingHours: {
                      ...current.workingHours,
                      regularWeekdayEnd: event.target.value,
                    },
                  }))
                }
                disabled={isDisabled}
                data-testid={TID.settings.timings.regularEnd}
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Summer start (MM-DD)</legend>
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                value={draft.workingHours.summerStartDate}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    workingHours: {
                      ...current.workingHours,
                      summerStartDate: event.target.value,
                    },
                  }))
                }
                disabled={isDisabled}
                data-testid={TID.settings.timings.summerStartDate}
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Summer end (MM-DD)</legend>
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                value={draft.workingHours.summerEndDate}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    workingHours: {
                      ...current.workingHours,
                      summerEndDate: event.target.value,
                    },
                  }))
                }
                disabled={isDisabled}
                data-testid={TID.settings.timings.summerEndDate}
              />
            </fieldset>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Summer start time</legend>
              <input
                type="time"
                className="input input-bordered input-sm w-full"
                value={draft.workingHours.summerWeekdayStart}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    workingHours: {
                      ...current.workingHours,
                      summerWeekdayStart: event.target.value,
                    },
                  }))
                }
                disabled={isDisabled}
                data-testid={TID.settings.timings.summerStart}
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Summer end time</legend>
              <input
                type="time"
                className="input input-bordered input-sm w-full"
                value={draft.workingHours.summerWeekdayEnd}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    workingHours: {
                      ...current.workingHours,
                      summerWeekdayEnd: event.target.value,
                    },
                  }))
                }
                disabled={isDisabled}
                data-testid={TID.settings.timings.summerEnd}
              />
            </fieldset>
          </div>
        </AppCardContent>
      </AppCard>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle>Alert Duplicate Rate Limits</AppCardTitle>
          <AppCardDescription>
            Thresholds apply per alert key across rolling windows in minutes.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="space-y-4">
          <div role="alert" className="alert alert-info alert-soft">
            <Clock3 className="h-5 w-5 shrink-0" />
            <div>
              <h3 className="font-semibold">What this controls</h3>
              <div className="text-xs">
                Prevents repeat alerts from spamming the dashboard and notifications.
              </div>
              <div className="mt-1 text-xs">
                <strong>Threshold</strong> is how many duplicates are allowed before suppression.
                <br />
                <strong>Window (minutes)</strong> is the rolling period used to count duplicates.
              </div>
            </div>
          </div>

          <div role="alert" className="alert alert-warning alert-soft text-base-content">
            <span className="text-sm">
              Example: threshold <strong>1</strong> + window <strong>60</strong> means the first
              alert emits, then matching duplicates are suppressed for 60 minutes.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Operational Alert</th>
                  <th>Threshold</th>
                  <th>Window (minutes)</th>
                </tr>
              </thead>
              <tbody>
                {OPERATIONAL_ALERT_FIELDS.map((field) => {
                  const rule = draft.alertRateLimits.operational[field.key]
                  return (
                    <tr key={field.key}>
                      <td className="font-medium">{field.label}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className="input input-bordered input-sm w-24"
                          value={rule.threshold}
                          onChange={(event) =>
                            setOperationalAlertRule(field.key, 'threshold', event.target.value)
                          }
                          disabled={isDisabled}
                          data-testid={TID.settings.timings.operationalAlertThreshold(field.key)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className="input input-bordered input-sm w-28"
                          value={rule.timeWindowMinutes}
                          onChange={(event) =>
                            setOperationalAlertRule(
                              field.key,
                              'timeWindowMinutes',
                              event.target.value
                            )
                          }
                          disabled={isDisabled}
                          data-testid={TID.settings.timings.operationalAlertWindow(field.key)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Security Alert</th>
                  <th>Threshold</th>
                  <th>Window (minutes)</th>
                </tr>
              </thead>
              <tbody>
                {SECURITY_ALERT_FIELDS.map((field) => {
                  const rule = draft.alertRateLimits.security[field.key]
                  return (
                    <tr key={field.key}>
                      <td className="font-medium">{field.label}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className="input input-bordered input-sm w-24"
                          value={rule.threshold}
                          onChange={(event) =>
                            setSecurityAlertRule(field.key, 'threshold', event.target.value)
                          }
                          disabled={isDisabled}
                          data-testid={TID.settings.timings.securityAlertThreshold(field.key)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className="input input-bordered input-sm w-28"
                          value={rule.timeWindowMinutes}
                          onChange={(event) =>
                            setSecurityAlertRule(field.key, 'timeWindowMinutes', event.target.value)
                          }
                          disabled={isDisabled}
                          data-testid={TID.settings.timings.securityAlertWindow(field.key)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </AppCardContent>
      </AppCard>
    </div>
  )
}
