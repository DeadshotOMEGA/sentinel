import * as v from 'valibot'
import {
  AlertRuleConfigSchema,
  WorkingHoursSettingsValueSchema,
  OperationalTimingsSettingsSchema,
  type OperationalTimingsResponse,
  type OperationalTimingsSettings,
  type IsoWeekday,
  type DayOfWeek,
} from '@sentinel/contracts'
import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { logger } from '../lib/logger.js'
import {
  applyOperationalTimingsRuntimeState,
  getDefaultOperationalTimingsSettings,
  toCompactMilitaryTime,
  DEFAULT_BACKEND_TIMEZONE,
} from '../lib/operational-timings-runtime.js'
import { OperationalTimingsRepository } from '../repositories/operational-timings-repository.js'
import { isJobSchedulerRunning, reconfigureJobScheduler, updateJobConfig } from '../jobs/index.js'

const dayNameToIsoWeekday: Record<DayOfWeek, IsoWeekday> = {
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

  const dutyWatchStart = toCompactMilitaryTime(settings.operational.dutyWatchAlertTime)
  const regularStart = toCompactMilitaryTime(settings.workingHours.regularWeekdayStart)
  const regularEnd = toCompactMilitaryTime(settings.workingHours.regularWeekdayEnd)
  const summerEnd = toCompactMilitaryTime(settings.workingHours.summerWeekdayEnd)

  const handoffSection = clone.responsibilitySections?.find(
    (section) => section.id === 'handoff-duty-watch'
  )
  if (handoffSection?.items) {
    handoffSection.items = handoffSection.items.map((item) =>
      item.includes('Duty Watch starts at')
        ? item.replace(/Duty Watch starts at\s+\d{4}/i, `Duty Watch starts at ${dutyWatchStart}`)
        : item
    )
  }

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

    return settings
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
      dutyWatchAlertTime: settings.operational.dutyWatchAlertTime,
      lockupWarningTime: settings.operational.lockupWarningTime,
      lockupCriticalTime: settings.operational.lockupCriticalTime,
      dutyWatchDays: settings.operational.dutyWatchDays,
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
