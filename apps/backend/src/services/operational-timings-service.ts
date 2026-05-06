import * as v from 'valibot'
import {
  AlertRuleConfigSchema,
  ScheduleSettingsValueSchema,
  WorkingHoursSettingsValueSchema,
  LegacyOperationalTimingsSettingsSchema,
  OperationalTimingsSettingsSchema,
  OperationalTimingsSettingsV2Schema,
  type OperationalTimingsResponse,
  type OperationalTimingsSettings,
  type OperationalNightRule,
  type OperationalNightType,
  type DayOfWeek,
  type DutyWatchRule,
  type IsoWeekday,
  type LegacyOperationalTimingsSettings,
  type OperationalTimingsSettingsV2,
  type LocalDate,
} from '@sentinel/contracts'
import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { logger } from '../lib/logger.js'
import {
  applyOperationalTimingsRuntimeState,
  getDefaultOperationalTimingsSettings,
  DEFAULT_BACKEND_TIMEZONE,
} from '../lib/operational-timings-runtime.js'
import { OperationalTimingsRepository } from '../repositories/operational-timings-repository.js'
import { isJobSchedulerRunning, reconfigureJobScheduler, updateJobConfig } from '../jobs/index.js'

const dayNameToIsoWeekday: Record<DayOfWeek, 1 | 2 | 3 | 4 | 5 | 6 | 7> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
}

function mapLegacyDayList(days: DayOfWeek[]): IsoWeekday[] {
  const mapped = days.map((day) => dayNameToIsoWeekday[day])
  return [...new Set(mapped)].sort((left, right) => left - right)
}

const LEGACY_DUTY_WATCH_ANCHOR_MONDAY = '2026-01-05'
const LEGACY_NIGHT_ANCHOR_MONDAY = '2020-01-06'

function addDaysToLocalDate(date: string, days: number): LocalDate {
  const [yearText, monthText, dayText] = date.split('-')
  const next = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)))
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10) as LocalDate
}

function convertLegacyDutyWatchRule(day: IsoWeekday, time: string): DutyWatchRule {
  return {
    id: `legacy-duty-watch-${day}`,
    name: 'Duty Watch',
    effectiveStartDate: addDaysToLocalDate(LEGACY_DUTY_WATCH_ANCHOR_MONDAY, day - 1),
    startTime: time,
    endTime: time,
    recurrence: {
      type: 'weekly',
      weekday: day,
      intervalWeeks: 1,
    },
  }
}

function convertScheduleNightRule(options: {
  id: string
  name: string
  nightType: OperationalNightType
  weekday: IsoWeekday
  startTime: string
  endTime: string
}): OperationalNightRule {
  return {
    id: options.id,
    name: options.name,
    nightType: options.nightType,
    enabled: true,
    effectiveStartDate: addDaysToLocalDate(LEGACY_NIGHT_ANCHOR_MONDAY, options.weekday - 1),
    effectiveEndDate: null,
    startTime: options.startTime,
    endTime: options.endTime,
    recurrence: {
      type: 'weekly',
      weekdays: [options.weekday],
      intervalWeeks: 1,
    },
    requiredAudience: [{ targetType: 'everyone', targetId: null }],
    optionalAudience: [],
  }
}

function migrateLegacyOperationalTimingsSettings(
  legacySettings: LegacyOperationalTimingsSettings
): OperationalTimingsSettings {
  return {
    operational: {
      dayRolloverTime: legacySettings.operational.dayRolloverTime,
      lockupWarningTime: legacySettings.operational.lockupWarningTime,
      lockupCriticalTime: legacySettings.operational.lockupCriticalTime,
      dutyWatchRules: legacySettings.operational.dutyWatchDays.map((day) =>
        convertLegacyDutyWatchRule(day, legacySettings.operational.dutyWatchAlertTime)
      ),
      nightRules: [],
      nightCancellations: [],
    },
    workingHours: legacySettings.workingHours,
    alertRateLimits: legacySettings.alertRateLimits,
  }
}

function migrateV2OperationalTimingsSettings(
  v2Settings: OperationalTimingsSettingsV2,
  nightRules: OperationalNightRule[]
): OperationalTimingsSettings {
  return {
    operational: {
      ...v2Settings.operational,
      nightRules,
      nightCancellations: [],
    },
    workingHours: v2Settings.workingHours,
    alertRateLimits: v2Settings.alertRateLimits,
  }
}

function parseAlertConfigRule(value: unknown): { threshold?: number; timeWindowMinutes?: number } {
  const result = v.safeParse(AlertRuleConfigSchema, value)
  if (!result.success) {
    return {}
  }

  return {
    threshold: typeof result.output.threshold === 'number' ? result.output.threshold : undefined,
    timeWindowMinutes:
      typeof result.output.timeWindowMinutes === 'number'
        ? result.output.timeWindowMinutes
        : undefined,
  }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function updateDdsTemplateFromTimings(
  ddsTemplate: unknown,
  settings: OperationalTimingsSettings
): unknown {
  if (!ddsTemplate || typeof ddsTemplate !== 'object' || Array.isArray(ddsTemplate)) {
    return ddsTemplate
  }

  const clone = deepClone(ddsTemplate) as {
    responsibilitySections?: Array<{ id?: string; items?: string[] }>
    checklistBlocks?: Array<{ id?: string; timeLabel?: string; tasks?: string[] }>
  }

  const regularStart = settings.workingHours.regularWeekdayStart.replace(':', '')
  const regularEnd = settings.workingHours.regularWeekdayEnd.replace(':', '')
  const summerEnd = settings.workingHours.summerWeekdayEnd.replace(':', '')

  const daytimeBlock = clone.checklistBlocks?.find((block) => block.id === 'daytime-routine')
  if (daytimeBlock) {
    daytimeBlock.timeLabel = `${regularStart}-${regularEnd}`
  }

  const sunsetBlock = clone.checklistBlocks?.find((block) => block.id === 'sunset')
  if (sunsetBlock?.tasks && sunsetBlock.tasks.length > 0) {
    sunsetBlock.tasks[0] = `Lower and stow ensign (${regularEnd} standard / ${summerEnd} modified summer hours).`
  }

  return clone
}

export class OperationalTimingsService {
  private readonly repository: OperationalTimingsRepository

  constructor(prismaClient?: PrismaClientInstance) {
    const prisma = prismaClient || defaultPrisma
    this.repository = new OperationalTimingsRepository(prisma)
  }

  private async buildBackfilledSettings(): Promise<OperationalTimingsSettings> {
    const settings = getDefaultOperationalTimingsSettings()

    const workingHoursSetting = await this.repository.findWorkingHoursSetting()
    if (workingHoursSetting) {
      const parsedWorkingHours = v.safeParse(
        WorkingHoursSettingsValueSchema,
        workingHoursSetting.value
      )
      if (parsedWorkingHours.success) {
        settings.workingHours.regularWeekdayStart = parsedWorkingHours.output.regularWeekdayStart
        settings.workingHours.regularWeekdayEnd = parsedWorkingHours.output.regularWeekdayEnd
        settings.workingHours.regularWeekdays = mapLegacyDayList(
          parsedWorkingHours.output.regularWeekdays
        )
        settings.workingHours.summerStartDate = parsedWorkingHours.output.summerStartDate
        settings.workingHours.summerEndDate = parsedWorkingHours.output.summerEndDate
        settings.workingHours.summerWeekdayStart = parsedWorkingHours.output.summerWeekdayStart
        settings.workingHours.summerWeekdayEnd = parsedWorkingHours.output.summerWeekdayEnd
      }
    }

    const allAlertKeys = [
      ...Object.keys(settings.alertRateLimits.operational),
      ...Object.keys(settings.alertRateLimits.security),
    ]

    for (const key of allAlertKeys) {
      const alertConfig = await this.repository.findAlertConfigByKey(key)
      if (!alertConfig) {
        continue
      }

      const parsedRule = parseAlertConfigRule(alertConfig.config)
      if (
        key in settings.alertRateLimits.operational &&
        typeof parsedRule.threshold === 'number' &&
        typeof parsedRule.timeWindowMinutes === 'number'
      ) {
        settings.alertRateLimits.operational[
          key as keyof typeof settings.alertRateLimits.operational
        ] = {
          threshold: parsedRule.threshold,
          timeWindowMinutes: parsedRule.timeWindowMinutes,
        }
      }

      if (
        key in settings.alertRateLimits.security &&
        typeof parsedRule.threshold === 'number' &&
        typeof parsedRule.timeWindowMinutes === 'number'
      ) {
        settings.alertRateLimits.security[key as keyof typeof settings.alertRateLimits.security] = {
          threshold: parsedRule.threshold,
          timeWindowMinutes: parsedRule.timeWindowMinutes,
        }
      }
    }

    settings.operational.nightRules = await this.buildNightRulesFromLegacySchedule()

    return settings
  }

  private async buildNightRulesFromLegacySchedule(): Promise<OperationalNightRule[]> {
    const scheduleSetting = await this.repository.findScheduleSetting()
    if (!scheduleSetting) {
      return []
    }

    const parsedSchedule = v.safeParse(ScheduleSettingsValueSchema, scheduleSetting.value)
    if (!parsedSchedule.success) {
      return []
    }

    return [
      convertScheduleNightRule({
        id: 'legacy-training-night',
        name: 'Training Night',
        nightType: 'training',
        weekday: dayNameToIsoWeekday[parsedSchedule.output.trainingNightDay],
        startTime: parsedSchedule.output.trainingNightStart,
        endTime: parsedSchedule.output.trainingNightEnd,
      }),
      convertScheduleNightRule({
        id: 'legacy-admin-night',
        name: 'Admin Night',
        nightType: 'administrative',
        weekday: dayNameToIsoWeekday[parsedSchedule.output.adminNightDay],
        startTime: parsedSchedule.output.adminNightStart,
        endTime: parsedSchedule.output.adminNightEnd,
      }),
    ]
  }

  private async applyRuntimeSettings(
    settings: OperationalTimingsSettings,
    source: 'default' | 'stored' | 'backfilled',
    updatedAt: Date | null
  ): Promise<void> {
    applyOperationalTimingsRuntimeState({
      settings,
      source,
      updatedAt,
    })

    const schedulerConfig = {
      timezone: DEFAULT_BACKEND_TIMEZONE,
      dayRolloverTime: settings.operational.dayRolloverTime,
      lockupWarningTime: settings.operational.lockupWarningTime,
      lockupCriticalTime: settings.operational.lockupCriticalTime,
      dutyWatchRules: settings.operational.dutyWatchRules,
    }

    if (isJobSchedulerRunning()) {
      await reconfigureJobScheduler(schedulerConfig)
    } else {
      updateJobConfig(schedulerConfig)
    }
  }

  private async syncDdsTemplate(settings: OperationalTimingsSettings): Promise<void> {
    const templateSetting = await this.repository.findDdsTemplateSetting()
    if (!templateSetting) {
      return
    }

    const updatedTemplate = updateDdsTemplateFromTimings(templateSetting.value, settings)
    await this.repository.upsertDdsTemplateSetting(updatedTemplate)
  }

  private toResponse(
    settings: OperationalTimingsSettings,
    source: 'default' | 'stored' | 'backfilled',
    updatedAt: Date | null
  ): OperationalTimingsResponse {
    return {
      settings,
      metadata: {
        source,
        updatedAt: updatedAt ? updatedAt.toISOString() : null,
      },
    }
  }

  async getOperationalTimings(): Promise<OperationalTimingsResponse> {
    const stored = await this.repository.findStoredSetting()

    if (stored) {
      const parsed = v.safeParse(OperationalTimingsSettingsSchema, stored.value)
      if (parsed.success) {
        await this.applyRuntimeSettings(parsed.output, 'stored', stored.updatedAt)
        return this.toResponse(parsed.output, 'stored', stored.updatedAt)
      }

      logger.warn('Stored operational timings invalid, rebuilding from backfill/default sources', {
        issueCount: parsed.issues.length,
      })
    }

    const v2Stored = await this.repository.findV2StoredSetting()
    if (v2Stored) {
      const parsedV2 = v.safeParse(OperationalTimingsSettingsV2Schema, v2Stored.value)
      if (parsedV2.success) {
        const migratedSettings = migrateV2OperationalTimingsSettings(
          parsedV2.output,
          await this.buildNightRulesFromLegacySchedule()
        )
        const persisted = await this.repository.upsertStoredSetting(migratedSettings)
        await this.applyRuntimeSettings(migratedSettings, 'stored', persisted.updatedAt)
        return this.toResponse(migratedSettings, 'stored', persisted.updatedAt)
      }

      logger.warn('V2 operational timings invalid, rebuilding from backfill/default sources', {
        issueCount: parsedV2.issues.length,
      })
    }

    const legacyStored = await this.repository.findLegacyStoredSetting()
    if (legacyStored) {
      const parsedLegacy = v.safeParse(LegacyOperationalTimingsSettingsSchema, legacyStored.value)
      if (parsedLegacy.success) {
        const migratedSettings = migrateLegacyOperationalTimingsSettings(parsedLegacy.output)
        migratedSettings.operational.nightRules = await this.buildNightRulesFromLegacySchedule()
        const persisted = await this.repository.upsertStoredSetting(migratedSettings)
        await this.applyRuntimeSettings(migratedSettings, 'stored', persisted.updatedAt)
        return this.toResponse(migratedSettings, 'stored', persisted.updatedAt)
      }

      logger.warn('Legacy operational timings invalid, rebuilding from backfill/default sources', {
        issueCount: parsedLegacy.issues.length,
      })
    }

    const backfilledSettings = await this.buildBackfilledSettings()
    const persisted = await this.repository.upsertStoredSetting(backfilledSettings)
    await this.applyRuntimeSettings(backfilledSettings, 'backfilled', persisted.updatedAt)

    return this.toResponse(backfilledSettings, 'backfilled', persisted.updatedAt)
  }

  async updateOperationalTimings(
    settings: OperationalTimingsSettings
  ): Promise<OperationalTimingsResponse> {
    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    if (!parsed.success) {
      const firstIssue = parsed.issues[0]
      throw new Error(firstIssue.message)
    }

    const persisted = await this.repository.upsertStoredSetting(parsed.output)
    await this.applyRuntimeSettings(parsed.output, 'stored', persisted.updatedAt)
    await this.syncDdsTemplate(parsed.output)

    return this.toResponse(parsed.output, 'stored', persisted.updatedAt)
  }
}
