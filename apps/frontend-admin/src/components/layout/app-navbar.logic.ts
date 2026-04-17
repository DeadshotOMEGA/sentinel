import type { SystemStatusResponse } from '@sentinel/contracts'

export interface WirelessRecoveryState {
  showSection: boolean
  showConnectLaptop: boolean
  connectLaptopHref: string | null
  showRepairHostHotspot: boolean
  primaryApprovedSsid: string | null
}

export function getWirelessRecoveryState(input: {
  systemStatus: SystemStatusResponse | null
  isLoading: boolean
  isError: boolean
  hasAdminAccess: boolean
}): WirelessRecoveryState {
  const { systemStatus, isLoading, isError, hasAdminAccess } = input
  const primaryApprovedSsid = systemStatus?.network.approvedSsids[0] ?? null
  const showConnectLaptop =
    !isLoading &&
    !isError &&
    systemStatus !== null &&
    (systemStatus.network.wifiConnected === false || systemStatus.network.approvedSsid === false)
  const connectLaptopHref =
    showConnectLaptop && primaryApprovedSsid
      ? `sentinel-hotspot://connect?ssid=${encodeURIComponent(primaryApprovedSsid)}`
      : null
  const showRepairHostHotspot = hasAdminAccess && !isLoading && !isError

  return {
    showSection: showConnectLaptop || showRepairHostHotspot,
    showConnectLaptop,
    connectLaptopHref,
    showRepairHostHotspot,
    primaryApprovedSsid,
  }
}
