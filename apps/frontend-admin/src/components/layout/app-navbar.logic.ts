import type { SystemStatusResponse } from '@sentinel/contracts'

export interface WirelessRecoveryState {
  showSection: boolean
  showConnectLaptop: boolean
  connectLaptopHref: string | null
  showRepairHostHotspot: boolean
  primaryApprovedSsid: string | null
  issueCode: SystemStatusResponse['network']['issueCode'] | null
}

export function getWirelessRecoveryState(input: {
  systemStatus: SystemStatusResponse | null
  isLoading: boolean
  isError: boolean
  hasAdminAccess: boolean
}): WirelessRecoveryState {
  const { systemStatus, isLoading, isError, hasAdminAccess } = input
  const primaryApprovedSsid = systemStatus?.network.approvedSsids[0] ?? null
  const issueCode = systemStatus?.network.issueCode ?? null
  const showConnectLaptop =
    !isLoading &&
    !isError &&
    systemStatus !== null &&
    (issueCode === 'wifi_disconnected' || issueCode === 'unapproved_ssid')
  const connectLaptopHref =
    showConnectLaptop && primaryApprovedSsid
      ? `sentinel-hotspot://connect?ssid=${encodeURIComponent(primaryApprovedSsid)}`
      : null
  const showRepairHostHotspot = hasAdminAccess && !isLoading && !isError
  const hotspotVisibilityIssue =
    !isLoading &&
    !isError &&
    systemStatus !== null &&
    (issueCode === 'hotspot_not_visible' ||
      issueCode === 'hotspot_profile_missing' ||
      issueCode === 'approved_hotspot_adapter_missing' ||
      issueCode === 'scan_adapter_missing' ||
      issueCode === 'telemetry_unavailable')

  return {
    showSection: showConnectLaptop || showRepairHostHotspot || hotspotVisibilityIssue,
    showConnectLaptop,
    connectLaptopHref,
    showRepairHostHotspot,
    primaryApprovedSsid,
    issueCode,
  }
}
