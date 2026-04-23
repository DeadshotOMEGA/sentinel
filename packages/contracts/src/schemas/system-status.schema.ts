import * as v from 'valibot'

export const SystemHealthStatusSchema = v.picklist(
  ['healthy', 'warning', 'error', 'unknown'],
  'Status must be healthy, warning, error, or unknown'
)

export const BackendHealthSchema = v.object({
  status: v.picklist(['healthy', 'unhealthy']),
  environment: v.string(),
  version: v.string(),
  uptimeSeconds: v.number(),
  serviceTimestamp: v.string(),
})

export const DatabaseHealthSchema = v.object({
  healthy: v.boolean(),
  address: v.nullable(v.string()),
})

export const NetworkIssueCodeSchema = v.picklist(
  [
    'none',
    'telemetry_unavailable',
    'telemetry_stale',
    'wifi_disconnected',
    'unapproved_ssid',
    'hotspot_profile_missing',
    'approved_hotspot_adapter_missing',
    'scan_adapter_missing',
    'hotspot_not_visible',
    'remote_reachability_failed',
  ],
  'Choose a valid network issue code'
)

export const NetworkFactsSchema = v.object({
  status: SystemHealthStatusSchema,
  telemetryAvailable: v.boolean(),
  telemetryAgeSeconds: v.nullable(v.number()),
  message: v.string(),
  issueCode: NetworkIssueCodeSchema,
  wifiConnected: v.nullable(v.boolean()),
  currentSsid: v.nullable(v.string()),
  hostIpAddress: v.nullable(v.string()),
  hotspotProfilePresent: v.nullable(v.boolean()),
  hotspotAdapterApproved: v.nullable(v.boolean()),
  scanAdapterPresent: v.nullable(v.boolean()),
  hotspotDevice: v.nullable(v.string()),
  hotspotSsid: v.nullable(v.string()),
  hotspotScanDevice: v.nullable(v.string()),
  hotspotSsidVisibleFromLaptop: v.nullable(v.boolean()),
  approvedSsids: v.array(v.string()),
  approvedSsid: v.nullable(v.boolean()),
  internetReachable: v.nullable(v.boolean()),
  remoteTarget: v.nullable(v.string()),
  remoteReachable: v.nullable(v.boolean()),
  portalRecoveryLikely: v.nullable(v.boolean()),
  generatedAt: v.nullable(v.string()),
})

export const ActiveRemoteSessionSchema = v.object({
  sessionId: v.string(),
  memberId: v.string(),
  memberName: v.string(),
  memberRank: v.string(),
  remoteSystemId: v.nullable(v.string()),
  remoteSystemCode: v.nullable(v.string()),
  remoteSystemName: v.string(),
  lastSeenAt: v.string(),
  ipAddress: v.nullable(v.string()),
})

export const ActiveRemoteSystemsSummarySchema = v.object({
  status: SystemHealthStatusSchema,
  activeCount: v.number(),
  staleThresholdSeconds: v.number(),
  overflowCount: v.number(),
  sessions: v.array(ActiveRemoteSessionSchema),
})

export const SystemStatusOverallSchema = v.object({
  status: SystemHealthStatusSchema,
  label: v.string(),
})

export const SystemStatusResponseSchema = v.object({
  overall: SystemStatusOverallSchema,
  backend: BackendHealthSchema,
  database: DatabaseHealthSchema,
  network: NetworkFactsSchema,
  remoteSystems: ActiveRemoteSystemsSummarySchema,
  lastCheckedAt: v.string(),
})

export type SystemHealthStatus = v.InferOutput<typeof SystemHealthStatusSchema>
export type BackendHealth = v.InferOutput<typeof BackendHealthSchema>
export type DatabaseHealth = v.InferOutput<typeof DatabaseHealthSchema>
export type NetworkIssueCode = v.InferOutput<typeof NetworkIssueCodeSchema>
export type NetworkFacts = v.InferOutput<typeof NetworkFactsSchema>
export type ActiveRemoteSession = v.InferOutput<typeof ActiveRemoteSessionSchema>
export type ActiveRemoteSystemsSummary = v.InferOutput<typeof ActiveRemoteSystemsSummarySchema>
export type SystemStatusOverall = v.InferOutput<typeof SystemStatusOverallSchema>
export type SystemStatusResponse = v.InferOutput<typeof SystemStatusResponseSchema>
