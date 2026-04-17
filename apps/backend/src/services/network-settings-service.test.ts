import type { PrismaClientInstance } from '@sentinel/database'
import { describe, expect, it, vi } from 'vitest'
import type { SettingRepository } from '../repositories/setting-repository.js'
import {
  DEFAULT_APPROVED_SSID,
  NetworkSettingsService,
  type NetworkSettingsState,
} from './network-settings-service.js'

function createServiceWithRepository(repository: {
  findByKey: ReturnType<typeof vi.fn>
  updateByKey: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}) {
  const service = new NetworkSettingsService({} as PrismaClientInstance)

  ;(service as unknown as { settingRepository: SettingRepository }).settingRepository =
    repository as unknown as SettingRepository

  return service
}

describe('NetworkSettingsService', () => {
  it('normalizes legacy HMCS Chippawa SSID values to the default hotspot on read', async () => {
    const service = createServiceWithRepository({
      findByKey: vi.fn().mockResolvedValue({
        key: 'network.approved_ssids',
        value: { approvedSsids: ['HMCS_Chippawa', 'Guest'] },
        updatedAt: new Date('2026-04-01T11:50:00.000Z'),
      }),
      updateByKey: vi.fn(),
      create: vi.fn(),
    })

    const result = await service.getNetworkSettings()

    expect(result).toEqual<NetworkSettingsState>({
      settings: {
        approvedSsids: [DEFAULT_APPROVED_SSID, 'Guest'],
      },
      metadata: {
        source: 'stored',
        updatedAt: '2026-04-01T11:50:00.000Z',
      },
    })
  })

  it('normalizes legacy HMCS Chippawa SSID values to the default hotspot on write', async () => {
    const updateByKey = vi.fn().mockResolvedValue({
      updatedAt: new Date('2026-04-01T11:55:00.000Z'),
    })
    const service = createServiceWithRepository({
      findByKey: vi.fn().mockResolvedValue({
        key: 'network.approved_ssids',
        value: { approvedSsids: ['HMCS_Chippawa'] },
        updatedAt: new Date('2026-04-01T11:50:00.000Z'),
      }),
      updateByKey,
      create: vi.fn(),
    })

    const result = await service.updateNetworkSettings({
      approvedSsids: ['HMCS Chippawa', DEFAULT_APPROVED_SSID, 'Guest'],
    })

    expect(updateByKey).toHaveBeenCalledWith('network.approved_ssids', {
      value: {
        approvedSsids: [DEFAULT_APPROVED_SSID, 'Guest'],
      },
      description: 'Approved Wi-Fi SSID allowlist used for Sentinel hotspot validation.',
    })
    expect(result.settings.approvedSsids).toEqual([DEFAULT_APPROVED_SSID, 'Guest'])
  })
})
