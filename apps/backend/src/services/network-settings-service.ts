import * as v from 'valibot'
import type { PrismaClientInstance } from '@sentinel/database'
import { NetworkSettingsSchema, type NetworkSettings } from '@sentinel/contracts'
import { prisma as defaultPrisma } from '@sentinel/database'
import { SettingRepository } from '../repositories/setting-repository.js'
import { logger } from '../lib/logger.js'

const NETWORK_SETTINGS_KEY = 'network.approved_ssids'
const DEFAULT_APPROVED_SSID = 'Stone Frigate'
const LEGACY_DEFAULT_APPROVED_SSID_KEYS = new Set(['hmcschippawa'])
const DEFAULT_NETWORK_SETTINGS: NetworkSettings = {
  approvedSsids: [DEFAULT_APPROVED_SSID],
}

export interface NetworkSettingsState {
  settings: NetworkSettings
  metadata: {
    source: 'default' | 'stored'
    updatedAt: string | null
  }
}

function cloneDefaultSettings(): NetworkSettings {
  return {
    approvedSsids: [...DEFAULT_NETWORK_SETTINGS.approvedSsids],
  }
}

function normalizeSsidKey(ssid: string): string {
  return ssid.replace(/[^a-z0-9]+/gi, '').toLowerCase()
}

function normalizeApprovedSsids(settings: NetworkSettings): NetworkSettings {
  const normalizedSsids: string[] = []
  const seen = new Set<string>()

  for (const rawSsid of settings.approvedSsids) {
    const trimmed = rawSsid.trim()
    if (trimmed.length === 0) {
      continue
    }

    const normalizedValue = LEGACY_DEFAULT_APPROVED_SSID_KEYS.has(normalizeSsidKey(trimmed))
      ? DEFAULT_APPROVED_SSID
      : trimmed
    const dedupeKey = normalizedValue.toLocaleLowerCase()

    if (seen.has(dedupeKey)) {
      continue
    }

    seen.add(dedupeKey)
    normalizedSsids.push(normalizedValue)
  }

  return {
    approvedSsids: normalizedSsids,
  }
}

export class NetworkSettingsService {
  private settingRepository: SettingRepository

  constructor(prismaClient: PrismaClientInstance = defaultPrisma) {
    this.settingRepository = new SettingRepository(prismaClient)
  }

  async getNetworkSettings(): Promise<NetworkSettingsState> {
    const setting = await this.settingRepository.findByKey(NETWORK_SETTINGS_KEY)

    if (!setting) {
      return {
        settings: cloneDefaultSettings(),
        metadata: {
          source: 'default',
          updatedAt: null,
        },
      }
    }

    const parsed = v.safeParse(NetworkSettingsSchema, setting.value)
    if (!parsed.success) {
      logger.warn('Stored network settings are invalid; using defaults', {
        issues: parsed.issues.map((issue) => issue.message),
      })
      return {
        settings: cloneDefaultSettings(),
        metadata: {
          source: 'default',
          updatedAt: setting.updatedAt.toISOString(),
        },
      }
    }

    return {
      settings: normalizeApprovedSsids(parsed.output),
      metadata: {
        source: 'stored',
        updatedAt: setting.updatedAt.toISOString(),
      },
    }
  }

  async updateNetworkSettings(settings: NetworkSettings): Promise<NetworkSettingsState> {
    const normalizedSettings = normalizeApprovedSsids(settings)
    const existing = await this.settingRepository.findByKey(NETWORK_SETTINGS_KEY)

    if (existing) {
      const updated = await this.settingRepository.updateByKey(NETWORK_SETTINGS_KEY, {
        value: normalizedSettings,
        description: 'Approved Wi-Fi SSID allowlist used for Sentinel hotspot validation.',
      })

      return {
        settings: normalizedSettings,
        metadata: {
          source: 'stored',
          updatedAt: updated.updatedAt.toISOString(),
        },
      }
    }

    const created = await this.settingRepository.create({
      key: NETWORK_SETTINGS_KEY,
      value: normalizedSettings,
      category: 'network',
      description: 'Approved Wi-Fi SSID allowlist used for Sentinel hotspot validation.',
    })

    return {
      settings: normalizedSettings,
      metadata: {
        source: 'stored',
        updatedAt: created.updatedAt.toISOString(),
      },
    }
  }
}

export {
  NETWORK_SETTINGS_KEY,
  DEFAULT_APPROVED_SSID,
  DEFAULT_NETWORK_SETTINGS,
  normalizeApprovedSsids,
}
