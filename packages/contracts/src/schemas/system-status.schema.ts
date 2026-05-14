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
    'hotspot_adapter_busy',
    'scan_adapter_missing',
    'hotspot_not_visible',
    'remote_reachability_failed',
  ],
  'Choose a valid network issue code'
)

export const HostHotspotRecoveryStateSchema = v.picklist(
  ['queued', 'running', 'completed', 'failed'],
  'Choose a valid host hotspot recovery state'
)

export const HostHotspotRecoveryStageSchema = v.picklist(
  [
    'request_queued',
    'processing_request',
    'moving_internet_wifi',
    'ensuring_profile',
    'stopping_hotspot',
    'resetting_driver',
    'resetting_usb',
    'waiting_for_adapter',
    'starting_hotspot',
    'verifying_visibility',
    'completed',
    'failed',
  ],
  'Choose a valid host hotspot recovery stage'
)

export const HostHotspotRecoveryStatusSchema = v.object({
  state: HostHotspotRecoveryStateSchema,
  stage: HostHotspotRecoveryStageSchema,
  message: v.string(),
  requestId: v.nullable(v.string()),
  connectionName: v.nullable(v.string()),
  hotspotSsid: v.nullable(v.string()),
  hotspotDevice: v.nullable(v.string()),
  scanDevice: v.nullable(v.string()),
  usbDevice: v.nullable(v.string()),
  hardwareResetApplied: v.nullable(v.boolean()),
  startedAt: v.nullable(v.string()),
  updatedAt: v.string(),
  completedAt: v.nullable(v.string()),
})

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
  hotspotAdapterBusy: v.nullable(v.boolean()),
  internetWifiConnection: v.nullable(v.string()),
  internetWifiSsid: v.nullable(v.string()),
  approvedSsids: v.array(v.string()),
  approvedSsid: v.nullable(v.boolean()),
  internetReachable: v.nullable(v.boolean()),
  remoteTarget: v.nullable(v.string()),
  remoteReachable: v.nullable(v.boolean()),
  portalRecoveryLikely: v.nullable(v.boolean()),
  hostHotspotRecovery: v.optional(v.nullable(HostHotspotRecoveryStatusSchema)),
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
export type HostHotspotRecoveryState = v.InferOutput<typeof HostHotspotRecoveryStateSchema>
export type HostHotspotRecoveryStage = v.InferOutput<typeof HostHotspotRecoveryStageSchema>
export type HostHotspotRecoveryStatus = v.InferOutput<typeof HostHotspotRecoveryStatusSchema>
export type NetworkFacts = v.InferOutput<typeof NetworkFactsSchema>
export type ActiveRemoteSession = v.InferOutput<typeof ActiveRemoteSessionSchema>
export type ActiveRemoteSystemsSummary = v.InferOutput<typeof ActiveRemoteSystemsSummarySchema>
export type SystemStatusOverall = v.InferOutput<typeof SystemStatusOverallSchema>
export type SystemStatusResponse = v.InferOutput<typeof SystemStatusResponseSchema>
