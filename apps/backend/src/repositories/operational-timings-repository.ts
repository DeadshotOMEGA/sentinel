import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { SettingRepository } from './setting-repository.js'
import { ReportSettingRepository } from './report-setting-repository.js'
import { AlertConfigRepository } from './alert-config-repository.js'

export const OPERATIONAL_TIMINGS_SETTING_KEY = 'operational.timings.v1'

export class OperationalTimingsRepository {
  private readonly settingRepository: SettingRepository
  private readonly reportSettingRepository: ReportSettingRepository
  private readonly alertConfigRepository: AlertConfigRepository

  constructor(prismaClient?: PrismaClientInstance) {
    const prisma = prismaClient || defaultPrisma
    this.settingRepository = new SettingRepository(prisma)
    this.reportSettingRepository = new ReportSettingRepository(prisma)
    this.alertConfigRepository = new AlertConfigRepository(prisma)
  }

  async findStoredSetting() {
    return this.settingRepository.findByKey(OPERATIONAL_TIMINGS_SETTING_KEY)
  }

  async upsertStoredSetting(value: unknown) {
    const existing = await this.findStoredSetting()

    if (existing) {
      return this.settingRepository.updateByKey(OPERATIONAL_TIMINGS_SETTING_KEY, {
        value,
        description: 'Operational timings and alert rate-limit settings',
      })
    }

    return this.settingRepository.create({
      key: OPERATIONAL_TIMINGS_SETTING_KEY,
      value,
      category: 'app_config',
      description: 'Operational timings and alert rate-limit settings',
    })
  }

  async findWorkingHoursSetting() {
    return this.reportSettingRepository.findByKey('working_hours')
  }

  async findAlertConfigByKey(key: string) {
    return this.alertConfigRepository.findByKey(key)
  }

  async findDdsTemplateSetting() {
    return this.settingRepository.findByKey('dds.page.content.v1')
  }

  async upsertDdsTemplateSetting(value: unknown) {
    const existing = await this.findDdsTemplateSetting()

    if (existing) {
      return this.settingRepository.updateByKey('dds.page.content.v1', {
        value,
        description: 'Editable DDS operations page template content',
      })
    }

    return this.settingRepository.create({
      key: 'dds.page.content.v1',
      value,
      category: 'app_config',
      description: 'Editable DDS operations page template content',
    })
  }
}
