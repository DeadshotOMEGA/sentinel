import type { SystemStatusResponse } from '@sentinel/contracts'

export const WIKI_APPLIANCE_URL = 'http://docs.sentinel.local/'

const WIKI_APPLIANCE_HOST = 'docs.sentinel.local'
const LOCAL_WIKI_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
const LOCAL_OR_LEGACY_WIKI_PORTS = new Set(['3002', '3020'])

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
      issueCode === 'hotspot_adapter_busy' ||
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

export function resolveWikiBaseUrl(configuredWikiBase: string): string {
  const normalizedWikiBase = configuredWikiBase.trim().replace(/\/+$/, '')
  if (!normalizedWikiBase) {
    return WIKI_APPLIANCE_URL
  }

  const parsedWikiBase = safeParseUrl(normalizedWikiBase)
  if (!parsedWikiBase) {
    return WIKI_APPLIANCE_URL
  }

  if (isLocalWikiUrl(parsedWikiBase)) {
    return WIKI_APPLIANCE_URL
  }

  if (isApplianceDocsRoot(parsedWikiBase)) {
    return WIKI_APPLIANCE_URL
  }

  return normalizedWikiBase
}

function isApplianceDocsRoot(url: globalThis.URL): boolean {
  return url.hostname.toLowerCase() === WIKI_APPLIANCE_HOST && url.pathname === '/' && !url.search
}

function isLocalWikiUrl(url: globalThis.URL): boolean {
  return (
    LOCAL_WIKI_HOSTS.has(url.hostname.toLowerCase()) || LOCAL_OR_LEGACY_WIKI_PORTS.has(url.port)
  )
}

function safeParseUrl(value: string): globalThis.URL | null {
  try {
    return new globalThis.URL(value)
  } catch {
    return null
  }
}
