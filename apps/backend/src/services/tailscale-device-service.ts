import { SettingRepository } from '../repositories/setting-repository.js'
import { getPrismaClient } from '../lib/database.js'
import { serviceLogger } from '../lib/logger.js'

interface TailscaleDevice {
  id: string
  name: string
  owner: string | null
  os: string | null
  osVersion: string | null
  online: boolean
  lastSeen: string | null
  tailnetIps: string[]
  tags: string[]
  sentinelDeviceId: string | null
}

interface SentinelDeviceMapping {
  id: string
  hostname?: string
  tags?: string[]
}

interface PersistedMappings {
  byDeviceId: Record<string, { sentinelDeviceId: string; updatedAt: string }>
}

interface TailscaleDevicesResponse {
  devices: TailscaleDevice[]
  cache: {
    refreshedAt: string | null
    refreshIntervalSeconds: number
    stale: boolean
    lastError: string | null
  }
}

interface TailscaleApiDevice {
  id?: string
  hostname?: string
  name?: string
  user?: string
  os?: string
  osVersion?: string
  online?: boolean
  lastSeen?: string
  addresses?: string[]
  tags?: string[]
}

interface TailscaleApiDevicesPayload {
  devices?: TailscaleApiDevice[]
}

interface TailscaleTokenPayload {
  access_token?: string
  expires_in?: number
}

const TAILSCALE_MAPPING_KEY = 'tailscale.deviceMappings'
const SENTINEL_DEVICE_CATALOG_KEY = 'tailscale.sentinelDevices'
const DEFAULT_REFRESH_INTERVAL_SECONDS = 45
// Refresh access tokens slightly early to avoid edge-expiry races during API calls.
const TOKEN_EXPIRY_BUFFER_SECONDS = 30

function normalizeRefreshInterval(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10)
  if (Number.isNaN(parsed)) {
    return DEFAULT_REFRESH_INTERVAL_SECONDS
  }

  if (parsed < 30) {
    return 30
  }

  if (parsed > 60) {
    return 60
  }

  return parsed
}

function normalizeDeviceName(device: TailscaleApiDevice): string {
  return device.hostname?.trim() || device.name?.trim() || 'unknown-device'
}

function normalizeOwner(device: TailscaleApiDevice): string | null {
  if (device.user?.trim()) {
    return device.user.trim()
  }

  const firstTag =
    Array.isArray(device.tags) && device.tags.length > 0 && typeof device.tags[0] === 'string'
      ? device.tags[0]
      : null

  return firstTag?.trim() || null
}

function normalizeSentinelDeviceCatalog(value: unknown): SentinelDeviceMapping[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry): SentinelDeviceMapping | null => {
      if (!entry || typeof entry !== 'object') {
        return null
      }

      const candidate = entry as Record<string, unknown>
      if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
        return null
      }

      return {
        id: candidate.id,
        hostname: typeof candidate.hostname === 'string' ? candidate.hostname : undefined,
        tags: Array.isArray(candidate.tags)
          ? candidate.tags.filter((tag): tag is string => typeof tag === 'string')
          : undefined,
      }
    })
    .filter((entry): entry is SentinelDeviceMapping => entry !== null)
}

function normalizePersistedMappings(value: unknown): PersistedMappings {
  if (!value || typeof value !== 'object') {
    return { byDeviceId: {} }
  }

  const candidate = value as Record<string, unknown>
  const byDeviceIdRaw = candidate.byDeviceId
  if (!byDeviceIdRaw || typeof byDeviceIdRaw !== 'object') {
    return { byDeviceId: {} }
  }

  const byDeviceId: PersistedMappings['byDeviceId'] = {}

  for (const [deviceId, mapping] of Object.entries(byDeviceIdRaw as Record<string, unknown>)) {
    if (!mapping || typeof mapping !== 'object') {
      continue
    }

    const mappingRecord = mapping as Record<string, unknown>
    if (typeof mappingRecord.sentinelDeviceId !== 'string') {
      continue
    }

    byDeviceId[deviceId] = {
      sentinelDeviceId: mappingRecord.sentinelDeviceId,
      updatedAt:
        typeof mappingRecord.updatedAt === 'string'
          ? mappingRecord.updatedAt
          : new Date().toISOString(),
    }
  }

  return { byDeviceId }
}

export class TailscaleDeviceService {
  private readonly settingRepository = new SettingRepository(getPrismaClient())
  private readonly refreshIntervalSeconds = normalizeRefreshInterval(
    process.env.TAILSCALE_CACHE_REFRESH_SECONDS
  )

  private cachedResponse: TailscaleDevicesResponse = {
    devices: [],
    cache: {
      refreshedAt: null,
      refreshIntervalSeconds: this.refreshIntervalSeconds,
      stale: true,
      lastError: null,
    },
  }

  private refreshPromise: Promise<void> | null = null
  private scheduler: ReturnType<typeof setInterval> | null = null
  private oauthToken: { value: string; expiresAtMs: number } | null = null

  start(): void {
    if (this.scheduler) {
      return
    }

    if (
      !process.env.TAILSCALE_OAUTH_CLIENT_ID ||
      !process.env.TAILSCALE_OAUTH_CLIENT_SECRET ||
      !process.env.TAILSCALE_TAILNET
    ) {
      serviceLogger.info('Tailscale background refresh disabled (missing configuration)')
      return
    }

    this.scheduler = setInterval(() => {
      this.refreshFromTailscale('scheduled').catch((error) => {
        serviceLogger.error('Unexpected Tailscale background refresh error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      })
    }, this.refreshIntervalSeconds * 1000)
  }

  stop(): void {
    if (!this.scheduler) {
      return
    }

    clearInterval(this.scheduler)
    this.scheduler = null
  }

  async getDevices(): Promise<TailscaleDevicesResponse> {
    await this.ensureFreshCache()
    return this.cachedResponse
  }

  private async ensureFreshCache(): Promise<void> {
    const now = Date.now()
    const refreshedAtMs = this.cachedResponse.cache.refreshedAt
      ? Date.parse(this.cachedResponse.cache.refreshedAt)
      : Number.NaN

    const cacheStale =
      Number.isNaN(refreshedAtMs) || now - refreshedAtMs >= this.refreshIntervalSeconds * 1000

    if (!cacheStale) {
      return
    }

    await this.refreshFromTailscale('request')
  }

  private async refreshFromTailscale(trigger: 'request' | 'scheduled'): Promise<void> {
    if (this.refreshPromise) {
      await this.refreshPromise
      return
    }

    this.refreshPromise = this.doRefresh(trigger)

    try {
      await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async doRefresh(trigger: 'request' | 'scheduled'): Promise<void> {
    try {
      const devices = await this.fetchDevices()
      const mappedDevices = await this.applyMappings(devices)

      this.cachedResponse = {
        devices: mappedDevices,
        cache: {
          refreshedAt: new Date().toISOString(),
          refreshIntervalSeconds: this.refreshIntervalSeconds,
          stale: false,
          lastError: null,
        },
      }

      serviceLogger.info('Tailscale device cache refreshed', {
        trigger,
        deviceCount: mappedDevices.length,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Tailscale refresh error'

      this.cachedResponse = {
        ...this.cachedResponse,
        cache: {
          ...this.cachedResponse.cache,
          stale: true,
          lastError: message,
        },
      }

      serviceLogger.error('Failed to refresh tailscale device cache', {
        trigger,
        error: message,
      })

      throw error
    }
  }

  private async fetchDevices(): Promise<TailscaleApiDevice[]> {
    const token = await this.getAccessToken()
    const tailnet = process.env.TAILSCALE_TAILNET

    if (!tailnet) {
      throw new Error('TAILSCALE_TAILNET is required for tailscale integration')
    }

    const response = await globalThis.fetch(
      `https://api.tailscale.com/api/v2/tailnet/${encodeURIComponent(tailnet)}/devices`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `Tailscale devices request failed: ${response.status} ${response.statusText} ${errorBody}`.trim()
      )
    }

    const payload = (await response.json()) as TailscaleApiDevicesPayload
    return payload.devices ?? []
  }

  private async getAccessToken(): Promise<string> {
    if (this.oauthToken && Date.now() < this.oauthToken.expiresAtMs) {
      return this.oauthToken.value
    }

    const clientId = process.env.TAILSCALE_OAUTH_CLIENT_ID
    const clientSecret = process.env.TAILSCALE_OAUTH_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('TAILSCALE_OAUTH_CLIENT_ID and TAILSCALE_OAUTH_CLIENT_SECRET are required')
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await globalThis.fetch('https://api.tailscale.com/api/v2/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `Tailscale OAuth token request failed: ${response.status} ${response.statusText} ${errorBody}`.trim()
      )
    }

    const payload = (await response.json()) as TailscaleTokenPayload

    if (!payload.access_token) {
      throw new Error('Tailscale OAuth token response missing access_token')
    }

    const expiresInSeconds = typeof payload.expires_in === 'number' ? payload.expires_in : 300
    this.oauthToken = {
      value: payload.access_token,
      expiresAtMs:
        Date.now() +
        Math.max(expiresInSeconds - TOKEN_EXPIRY_BUFFER_SECONDS, TOKEN_EXPIRY_BUFFER_SECONDS) *
          1000,
    }

    return payload.access_token
  }

  private async applyMappings(devices: TailscaleApiDevice[]): Promise<TailscaleDevice[]> {
    const mappingSetting = await this.settingRepository.findByKey(TAILSCALE_MAPPING_KEY)
    const catalogSetting = await this.settingRepository.findByKey(SENTINEL_DEVICE_CATALOG_KEY)

    const persistedMappings = normalizePersistedMappings(mappingSetting?.value)
    const sentinelDeviceCatalog = normalizeSentinelDeviceCatalog(catalogSetting?.value)

    let mappingsChanged = false

    const normalizedDevices = devices.map((device) => {
      const deviceId = this.getStableDeviceId(device)
      const existingMapping = persistedMappings.byDeviceId[deviceId]

      let sentinelDeviceId = existingMapping?.sentinelDeviceId ?? null
      if (!sentinelDeviceId) {
        sentinelDeviceId = this.resolveSentinelDeviceId(device, sentinelDeviceCatalog)
        if (sentinelDeviceId) {
          persistedMappings.byDeviceId[deviceId] = {
            sentinelDeviceId,
            updatedAt: new Date().toISOString(),
          }
          mappingsChanged = true
        }
      }

      return {
        id: deviceId,
        name: normalizeDeviceName(device),
        owner: normalizeOwner(device),
        os: device.os ?? null,
        osVersion: device.osVersion ?? null,
        online: Boolean(device.online),
        lastSeen: device.lastSeen ?? null,
        tailnetIps: Array.isArray(device.addresses)
          ? device.addresses.filter((ip): ip is string => typeof ip === 'string')
          : [],
        tags: Array.isArray(device.tags)
          ? device.tags.filter((tag): tag is string => typeof tag === 'string')
          : [],
        sentinelDeviceId,
      }
    })

    if (mappingsChanged) {
      await this.persistMappings(mappingSetting?.id ?? null, persistedMappings)
    }

    return normalizedDevices
  }

  private resolveSentinelDeviceId(
    device: TailscaleApiDevice,
    sentinelDeviceCatalog: SentinelDeviceMapping[]
  ): string | null {
    const hostname = normalizeDeviceName(device).toLowerCase()
    const tags = Array.isArray(device.tags)
      ? device.tags.filter((tag): tag is string => typeof tag === 'string')
      : []

    const hostnameMatch = sentinelDeviceCatalog.find(
      (candidate) => candidate.hostname?.toLowerCase() === hostname
    )
    if (hostnameMatch) {
      return hostnameMatch.id
    }

    const tagMatch = sentinelDeviceCatalog.find((candidate) => {
      if (!candidate.tags || candidate.tags.length === 0) {
        return false
      }

      return candidate.tags.some((tag) => tags.includes(tag))
    })

    return tagMatch?.id ?? null
  }

  private getStableDeviceId(device: TailscaleApiDevice): string {
    if (device.id) {
      return device.id
    }

    const addresses = Array.isArray(device.addresses)
      ? device.addresses.filter((ip): ip is string => typeof ip === 'string')
      : []

    const fallbackSeed = JSON.stringify({
      hostname: normalizeDeviceName(device),
      addresses,
      name: device.name ?? '',
    })

    return `fallback:${Buffer.from(fallbackSeed).toString('base64url')}`
  }

  private async persistMappings(
    settingId: string | null,
    mappings: PersistedMappings
  ): Promise<void> {
    if (settingId) {
      await this.settingRepository.updateByKey(TAILSCALE_MAPPING_KEY, {
        value: mappings,
        description: 'Persisted mapping between tailscale devices and sentinel devices',
      })
      return
    }

    await this.settingRepository.create({
      key: TAILSCALE_MAPPING_KEY,
      value: mappings,
      category: 'tailscale',
      description: 'Persisted mapping between tailscale devices and sentinel devices',
    })
  }
}

export const tailscaleDeviceService = new TailscaleDeviceService()
tailscaleDeviceService.start()
