'use client'

import { useQuery } from '@tanstack/react-query'
import type { AuditLogWithAdminResponse } from '@sentinel/contracts'
import { apiClient } from '@/lib/api-client'

export type ActivityArea =
  | 'attendance'
  | 'members'
  | 'badges'
  | 'settings'
  | 'responsibility'
  | 'access'
  | 'admin'
  | 'other'

export interface ActivityEntry {
  id: string
  timestamp: string
  area: ActivityArea
  actionLabel: string
  actorName: string
  subjectLabel: string
  summary: string
  raw: AuditLogWithAdminResponse
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: Record<string, unknown> | null, key: string): string | null {
  if (!value) {
    return null
  }

  const rawValue = value[key]
  return typeof rawValue === 'string' && rawValue.trim().length > 0 ? rawValue.trim() : null
}

function getNumber(value: Record<string, unknown> | null, key: string): number | null {
  if (!value) {
    return null
  }

  const rawValue = value[key]
  return typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : null
}

function getRecord(
  value: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  if (!value) {
    return null
  }

  const nestedValue = value[key]
  return isRecord(nestedValue) ? nestedValue : null
}

function getArrayLength(value: Record<string, unknown> | null, key: string): number | null {
  if (!value) {
    return null
  }

  const nestedValue = value[key]
  return Array.isArray(nestedValue) ? nestedValue.length : null
}

function getNestedString(
  value: Record<string, unknown> | null,
  key: string,
  nestedKey: string
): string | null {
  return getString(getRecord(value, key), nestedKey)
}

function formatFieldName(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .toLowerCase()
}

function getChangedFieldSummary(details: Record<string, unknown> | null): string | null {
  const requestedChanges = getRecord(details, 'requestedChanges')
  if (requestedChanges) {
    const keys = Object.keys(requestedChanges)
    if (keys.length > 0) {
      return `Changed ${keys.map(formatFieldName).join(', ')}`
    }
  }

  const changes = getRecord(details, 'changes')
  if (changes) {
    const keys = Object.keys(changes)
    if (keys.length > 0) {
      return `Changed ${keys.map(formatFieldName).join(', ')}`
    }
  }

  return null
}

function formatArea(action: string): ActivityArea {
  if (action.startsWith('checkin_')) {
    return 'attendance'
  }

  if (action.startsWith('member_')) {
    return 'members'
  }

  if (action.startsWith('badge_')) {
    return 'badges'
  }

  if (
    action.startsWith('setting_') ||
    action.startsWith('network_settings_') ||
    action.startsWith('operational_timings_') ||
    action.startsWith('remote_system_')
  ) {
    return 'settings'
  }

  if (action.startsWith('dds_') || action.startsWith('lockup_')) {
    return 'responsibility'
  }

  if (action === 'login' || action === 'logout' || action === 'login_failed') {
    return 'access'
  }

  if (action.startsWith('admin_') || action.startsWith('password_') || action.startsWith('role_')) {
    return 'admin'
  }

  return 'other'
}

function describeActivity(
  log: AuditLogWithAdminResponse
): Omit<ActivityEntry, 'id' | 'timestamp' | 'actorName' | 'raw'> {
  const details = log.details ?? null
  const action = log.action
  const area = formatArea(action)
  const memberName =
    getString(details, 'memberName') ??
    getString(details, 'holderName') ??
    getString(details, 'openerName') ??
    getString(details, 'executedByName') ??
    getString(details, 'previousHolderName') ??
    getString(details, 'toMemberName') ??
    getString(details, 'subjectMemberId') ??
    'Unknown'
  const badgeSerialNumber = getString(details, 'badgeSerialNumber')
  const settingKey = getString(details, 'settingKey')
  const remoteSystemName = getString(details, 'remoteSystemName')
  const direction = getString(details, 'direction')
  const kioskId = getString(details, 'kioskId')
  const reason = getString(details, 'reason') ?? getString(details, 'editReason')
  const previousAssignedMemberName = getNestedString(
    details,
    'previousAssignedMember',
    'assignedMemberName'
  )
  const currentAssignedMemberName =
    getNestedString(details, 'currentAssignedMember', 'assignedMemberName') ??
    getString(details, 'assignedMemberName')

  switch (action) {
    case 'login':
      return {
        area,
        actionLabel: 'Logged in',
        subjectLabel: getString(details, 'actorName') ?? memberName,
        summary: remoteSystemName
          ? `Started a session on ${remoteSystemName}`
          : 'Started a session',
      }
    case 'member_create':
      return {
        area,
        actionLabel: 'Created member',
        subjectLabel: memberName,
        summary: getString(details, 'serviceNumber')
          ? `Service number ${getString(details, 'serviceNumber')}`
          : 'Member record created',
      }
    case 'member_update':
      return {
        area,
        actionLabel: 'Updated profile',
        subjectLabel: memberName,
        summary: getChangedFieldSummary(details) ?? 'Member profile updated',
      }
    case 'member_delete':
      return {
        area,
        actionLabel: 'Archived member',
        subjectLabel: memberName,
        summary: 'Member record archived',
      }
    case 'member_tag_add':
      return {
        area,
        actionLabel: 'Added tag',
        subjectLabel: memberName,
        summary: getString(details, 'tagName') ?? 'Member tag added',
      }
    case 'member_tag_remove':
      return {
        area,
        actionLabel: 'Removed tag',
        subjectLabel: memberName,
        summary: getString(details, 'tagName') ?? 'Member tag removed',
      }
    case 'badge_create':
      return {
        area,
        actionLabel: 'Created badge',
        subjectLabel: badgeSerialNumber ?? 'Badge',
        summary: currentAssignedMemberName
          ? `Assigned to ${currentAssignedMemberName}`
          : getString(details, 'assignmentType') === 'unassigned'
            ? 'Created as unassigned'
            : 'Badge created',
      }
    case 'badge_assign':
      return {
        area,
        actionLabel: 'Assigned badge',
        subjectLabel: badgeSerialNumber ?? 'Badge',
        summary: currentAssignedMemberName
          ? `Assigned to ${currentAssignedMemberName}`
          : 'Badge assignment updated',
      }
    case 'badge_unassign':
      return {
        area,
        actionLabel: 'Unassigned badge',
        subjectLabel: badgeSerialNumber ?? 'Badge',
        summary: previousAssignedMemberName
          ? `Removed from ${previousAssignedMemberName}`
          : 'Badge unassigned',
      }
    case 'badge_status_change':
      return {
        area,
        actionLabel: 'Changed badge status',
        subjectLabel: badgeSerialNumber ?? 'Badge',
        summary:
          getString(details, 'previousStatus') && getString(details, 'currentStatus')
            ? `${getString(details, 'previousStatus')} -> ${getString(details, 'currentStatus')}`
            : 'Badge status updated',
      }
    case 'badge_delete':
      return {
        area,
        actionLabel: 'Deleted badge',
        subjectLabel: badgeSerialNumber ?? 'Badge',
        summary: 'Badge removed from inventory',
      }
    case 'setting_create':
      return {
        area,
        actionLabel: 'Created setting',
        subjectLabel: settingKey ?? 'Setting',
        summary: getString(details, 'category')
          ? `${getString(details, 'category')} setting created`
          : 'Setting created',
      }
    case 'setting_update':
      return {
        area,
        actionLabel: 'Updated setting',
        subjectLabel: settingKey ?? 'Setting',
        summary: 'Setting value updated',
      }
    case 'setting_delete':
      return {
        area,
        actionLabel: 'Deleted setting',
        subjectLabel: settingKey ?? 'Setting',
        summary: 'Setting removed',
      }
    case 'network_settings_update': {
      const nextSettings = getRecord(details, 'nextSettings')
      const approvedSsids = nextSettings?.approvedSsids
      const ssidCount = Array.isArray(approvedSsids) ? approvedSsids.length : null

      return {
        area,
        actionLabel: 'Updated network settings',
        subjectLabel: 'Network settings',
        summary:
          typeof ssidCount === 'number'
            ? `${ssidCount} approved Wi-Fi networks`
            : 'Network settings updated',
      }
    }
    case 'operational_timings_update': {
      const nextSettings = getRecord(details, 'nextSettings')
      const keyCount = nextSettings ? Object.keys(nextSettings).length : 0

      return {
        area,
        actionLabel: 'Updated timings',
        subjectLabel: 'Operational timings',
        summary: keyCount > 0 ? `${keyCount} timing values saved` : 'Operational timings updated',
      }
    }
    case 'remote_system_create':
      return {
        area,
        actionLabel: 'Created remote system',
        subjectLabel: remoteSystemName ?? 'Remote system',
        summary: getString(details, 'remoteSystemCode')
          ? `Code ${getString(details, 'remoteSystemCode')}`
          : 'Remote system created',
      }
    case 'remote_system_update':
      return {
        area,
        actionLabel: 'Updated remote system',
        subjectLabel: remoteSystemName ?? 'Remote system',
        summary: getChangedFieldSummary(details) ?? 'Remote system updated',
      }
    case 'remote_system_delete':
      return {
        area,
        actionLabel: 'Deleted remote system',
        subjectLabel: remoteSystemName ?? 'Remote system',
        summary: getString(details, 'remoteSystemCode')
          ? `Removed ${getString(details, 'remoteSystemCode')}`
          : 'Remote system deleted',
      }
    case 'remote_system_reorder': {
      const orderCount = getArrayLength(details, 'nextOrder')

      return {
        area,
        actionLabel: 'Reordered remote systems',
        subjectLabel: 'Remote systems',
        summary:
          typeof orderCount === 'number' && orderCount > 0
            ? `${orderCount} systems reordered`
            : 'Remote systems reordered',
      }
    }
    case 'checkin_scan':
      return {
        area,
        actionLabel: direction === 'out' ? 'Scanned out' : 'Scanned in',
        subjectLabel: memberName,
        summary: kioskId ? `Badge scan at ${kioskId}` : 'Badge scan recorded',
      }
    case 'checkin_login':
      return {
        area,
        actionLabel: 'Login check-in',
        subjectLabel: memberName,
        summary: kioskId ? `Auto check-in at ${kioskId}` : 'Auto check-in from login',
      }
    case 'checkin_manual_create':
      return {
        area,
        actionLabel: direction === 'out' ? 'Manual check-out' : 'Manual check-in',
        subjectLabel: memberName,
        summary: kioskId ? `Recorded at ${kioskId}` : 'Manual attendance entry',
      }
    case 'checkin_manual_checkout':
      return {
        area,
        actionLabel: 'Force checkout',
        subjectLabel: memberName,
        summary: reason ? `Reason: ${reason}` : 'Manual checkout recorded',
      }
    case 'checkin_update':
      return {
        area,
        actionLabel: 'Edited attendance',
        subjectLabel: memberName,
        summary: reason
          ? `Reason: ${reason}`
          : (getChangedFieldSummary(details) ?? 'Attendance updated'),
      }
    case 'checkin_delete':
      return {
        area,
        actionLabel: 'Deleted attendance',
        subjectLabel: memberName,
        summary: 'Attendance entry removed',
      }
    case 'dds_accept':
      return {
        area,
        actionLabel: 'Accepted DDS',
        subjectLabel: 'DDS',
        summary: memberName,
      }
    case 'dds_assign':
      return {
        area,
        actionLabel: 'Assigned DDS',
        subjectLabel: 'DDS',
        summary: getString(details, 'previousHolderName')
          ? `${getString(details, 'previousHolderName')} -> ${memberName}`
          : memberName,
      }
    case 'dds_transfer':
      return {
        area,
        actionLabel: 'Transferred DDS',
        subjectLabel: 'DDS',
        summary:
          getString(details, 'fromMemberName') && getString(details, 'toMemberName')
            ? `${getString(details, 'fromMemberName')} -> ${getString(details, 'toMemberName')}`
            : 'DDS transferred',
      }
    case 'dds_release':
      return {
        area,
        actionLabel: 'Released DDS',
        subjectLabel: 'DDS',
        summary: getString(details, 'previousHolderName') ?? 'DDS released',
      }
    case 'lockup_acquire':
      return {
        area,
        actionLabel: 'Acquired lockup',
        subjectLabel: 'Lockup',
        summary: memberName,
      }
    case 'lockup_open':
      return {
        area,
        actionLabel: 'Opened building',
        subjectLabel: 'Lockup',
        summary: memberName,
      }
    case 'lockup_transfer':
      return {
        area,
        actionLabel: 'Transferred lockup',
        subjectLabel: 'Lockup',
        summary:
          getString(details, 'fromMemberName') && getString(details, 'toMemberName')
            ? `${getString(details, 'fromMemberName')} -> ${getString(details, 'toMemberName')}`
            : 'Lockup transferred',
      }
    case 'lockup_execute':
      return {
        area,
        actionLabel: 'Executed lockup',
        subjectLabel: 'Lockup',
        summary:
          getNumber(details, 'totalCheckedOut') !== null
            ? `${getNumber(details, 'totalCheckedOut')} people checked out`
            : 'Lockup executed',
      }
    default:
      return {
        area,
        actionLabel: formatFieldName(action).replace(/\b\w/g, (char) => char.toUpperCase()),
        subjectLabel: log.entityType,
        summary: 'Activity recorded',
      }
  }
}

function getActorName(log: AuditLogWithAdminResponse): string {
  const details = log.details ?? null

  return (
    log.adminUser?.displayName ??
    getString(details, 'actorName') ??
    getString(details, 'editorName') ??
    'System'
  )
}

function normalizeActivity(log: AuditLogWithAdminResponse): ActivityEntry {
  const description = describeActivity(log)

  return {
    id: log.id,
    timestamp: log.createdAt ?? '',
    actorName: getActorName(log),
    raw: log,
    ...description,
  }
}

export function useAuditActivityFeed(enabled: boolean, limit: number = 250) {
  return useQuery({
    queryKey: ['audit-activity', limit],
    queryFn: async () => {
      const response = await apiClient.auditLogs.getAuditLogs({
        query: {
          page: '1',
          limit: String(limit),
        },
      })

      if (response.status !== 200) {
        const message =
          response.body && typeof response.body === 'object' && 'message' in response.body
            ? String((response.body as { message?: unknown }).message ?? 'Failed to fetch activity')
            : 'Failed to fetch activity'

        throw new Error(message)
      }

      return {
        entries: response.body.auditLogs.map((log) => normalizeActivity(log)),
        total: response.body.total,
      }
    },
    enabled,
    refetchInterval: 15000,
  })
}
