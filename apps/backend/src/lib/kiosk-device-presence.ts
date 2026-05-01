interface KioskPresenceRecord {
  apiKeyId: string
  apiKeyName: string
  ipAddress: string | null
  lastSeenAt: Date
}

export interface KioskPresenceSession {
  sessionId: string
  memberId: string
  memberName: string
  memberRank: string
  remoteSystemId: string | null
  remoteSystemCode: string | null
  remoteSystemName: string
  lastSeenAt: Date
  ipAddress: string | null
}

export class KioskDevicePresenceStore {
  private records = new Map<string, KioskPresenceRecord>()

  touch(input: { apiKeyId: string; apiKeyName?: string | null; ipAddress?: string | null }): void {
    const now = new Date()
    const apiKeyName =
      input.apiKeyName && input.apiKeyName.trim().length > 0 ? input.apiKeyName.trim() : 'Kiosk'

    this.records.set(input.apiKeyId, {
      apiKeyId: input.apiKeyId,
      apiKeyName,
      ipAddress: input.ipAddress ?? null,
      lastSeenAt: now,
    })
  }

  listActive(input: { activeWithinSeconds: number; limit: number }): {
    activeCount: number
    overflowCount: number
    sessions: KioskPresenceSession[]
  } {
    const activeThreshold = new Date(Date.now() - input.activeWithinSeconds * 1000)
    const active = [...this.records.values()]
      .filter((record) => record.lastSeenAt >= activeThreshold)
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())

    return {
      activeCount: active.length,
      overflowCount: Math.max(active.length - input.limit, 0),
      sessions: active.slice(0, input.limit).map((record) => ({
        sessionId: `kiosk-device:${record.apiKeyId}`,
        memberId: record.apiKeyId,
        memberName: record.apiKeyName,
        memberRank: 'DEVICE',
        remoteSystemId: null,
        remoteSystemCode: 'kiosk',
        remoteSystemName: record.apiKeyName,
        lastSeenAt: record.lastSeenAt,
        ipAddress: record.ipAddress,
      })),
    }
  }
}

export const kioskDevicePresenceStore = new KioskDevicePresenceStore()
