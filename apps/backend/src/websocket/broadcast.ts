import { Server as SocketIOServer } from 'socket.io'
import { logger } from '../lib/logger.js'
import type { LogEntry } from '../lib/log-transport-socketio.js'

let io: SocketIOServer | null = null

/**
 * Initialize Socket.IO server instance
 */
export function setSocketIOServer(server: SocketIOServer) {
  io = server
  logger.info('Socket.IO server instance registered for broadcasting')
}

/**
 * Get Socket.IO server instance
 */
export function getSocketIOServer(): SocketIOServer | null {
  return io
}

/**
 * Broadcast a log entry manually (outside of Winston transport)
 */
export function broadcastLogEntry(entry: LogEntry) {
  if (!io) {
    return
  }

  io.to('logs').emit('log:entry', entry)
}

/**
 * Broadcast presence statistics update
 */
export function broadcastPresenceUpdate(stats: {
  totalPresent: number
  totalMembers: number
  byDivision: Array<{
    divisionId: string
    divisionName: string
    present: number
    total: number
  }>
  lastUpdated: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast presence update: Socket.IO not initialized')
    return
  }

  io.to('presence').emit('presence:update', stats)

  logger.debug('Broadcasted presence update', {
    totalPresent: stats.totalPresent,
    totalMembers: stats.totalMembers,
  })
}

/**
 * Broadcast check-in event
 */
export function broadcastCheckin(checkin: {
  id: string
  memberId: string | null
  memberName?: string
  rank?: string
  division?: string
  direction: 'in' | 'out'
  timestamp: string
  kioskId: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast checkin: Socket.IO not initialized')
    return
  }

  io.to('checkins').emit('checkin:new', checkin)

  logger.debug('Broadcasted checkin event', {
    checkinId: checkin.id,
    memberId: checkin.memberId,
    direction: checkin.direction,
  })
}

/**
 * Broadcast visitor sign-in
 */
export function broadcastVisitorSignin(visitor: {
  id: string
  name: string
  organization: string
  visitType: string
  checkInTime: string
  hostName?: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast visitor signin: Socket.IO not initialized')
    return
  }

  io.to('visitors').emit('visitor:signin', visitor)

  logger.debug('Broadcasted visitor signin', {
    visitorId: visitor.id,
    name: visitor.name,
  })
}

/**
 * Broadcast visitor sign-out
 */
export function broadcastVisitorSignout(visitor: {
  id: string
  name: string
  checkOutTime: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast visitor signout: Socket.IO not initialized')
    return
  }

  io.to('visitors').emit('visitor:signout', visitor)

  logger.debug('Broadcasted visitor signout', {
    visitorId: visitor.id,
    name: visitor.name,
  })
}

/**
 * Security alert types - includes both badge-related and system alerts
 */
export type SecurityAlertType =
  | 'badge_disabled'
  | 'badge_unknown'
  | 'inactive_member'
  | 'unauthorized_access'
  | 'lockup_reminder'
  | 'lockup_not_executed'
  | 'duty_watch_missing'
  | 'duty_watch_not_checked_in'
  | 'building_not_secured'
  | 'member_missed_checkout'
  | 'system'

/**
 * Broadcast security alert
 */
export function broadcastSecurityAlert(alert: {
  id: string
  alertType: SecurityAlertType
  severity: 'critical' | 'warning' | 'info'
  message: string
  status: 'active' | 'acknowledged' | 'dismissed'
  timestamp: string
  acknowledgedAt: string | null
  badgeSerial?: string | null
  kioskId?: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast security alert: Socket.IO not initialized')
    return
  }

  io.to('alerts').emit('alert:new', alert)

  logger.info('Broadcasted security alert', {
    alertId: alert.id,
    alertType: alert.alertType,
    severity: alert.severity,
  })
}

/**
 * Broadcast DDS update
 */
export function broadcastDdsUpdate(update: {
  action: 'accepted' | 'assigned' | 'transferred' | 'released'
  assignment: {
    id: string
    memberId: string
    memberName: string
    rank: string
    status: string
  } | null
  timestamp: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast DDS update: Socket.IO not initialized')
    return
  }

  io.to('dds').emit('dds:update', update)

  logger.debug('Broadcasted DDS update', {
    action: update.action,
    memberId: update.assignment?.memberId,
  })
}

/**
 * Broadcast lockup execution
 */
export function broadcastLockupExecution(data: {
  performedBy: string
  performedByName: string
  membersCheckedOut: number
  visitorsCheckedOut: number
  timestamp: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast lockup execution: Socket.IO not initialized')
    return
  }

  io.to('lockup').emit('lockup:executed', data)

  logger.info('Broadcasted lockup execution', {
    performedBy: data.performedBy,
    membersCheckedOut: data.membersCheckedOut,
    visitorsCheckedOut: data.visitorsCheckedOut,
  })
}

/**
 * Broadcast lockup transfer
 */
export function broadcastLockupTransfer(data: {
  transferId: string
  fromMemberId: string
  fromMemberName: string
  toMemberId: string
  toMemberName: string
  reason: string
  timestamp: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast lockup transfer: Socket.IO not initialized')
    return
  }

  io.to('lockup').emit('lockup:transferred', data)

  logger.info('Broadcasted lockup transfer', {
    transferId: data.transferId,
    fromMemberId: data.fromMemberId,
    toMemberId: data.toMemberId,
    reason: data.reason,
  })
}

/**
 * Broadcast lockup status update
 */
export function broadcastLockupStatusUpdate(data: {
  date: string
  buildingStatus: 'secured' | 'open' | 'locking_up'
  currentHolder: {
    id: string
    firstName: string
    lastName: string
    rank: string
  } | null
  timestamp: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast lockup status: Socket.IO not initialized')
    return
  }

  io.to('lockup').emit('lockup:status', data)

  logger.debug('Broadcasted lockup status update', {
    date: data.date,
    buildingStatus: data.buildingStatus,
    holderId: data.currentHolder?.id,
  })
}

/**
 * Broadcast event update
 */
export function broadcastEventUpdate(event: {
  id: string
  action: 'created' | 'updated' | 'closed' | 'deleted'
  name: string
  status: string
  timestamp: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast event update: Socket.IO not initialized')
    return
  }

  io.to('events').emit('event:update', event)

  logger.debug('Broadcasted event update', {
    eventId: event.id,
    action: event.action,
  })
}

/**
 * Broadcast badge assignment
 */
export function broadcastBadgeAssignment(data: {
  badgeId: string
  serialNumber: string
  assignmentType: 'member' | 'event' | 'unassigned'
  assignedToId: string | null
  assignedToName?: string
  timestamp: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast badge assignment: Socket.IO not initialized')
    return
  }

  io.to('badges').emit('badge:assignment', data)

  logger.debug('Broadcasted badge assignment', {
    badgeId: data.badgeId,
    assignmentType: data.assignmentType,
  })
}

/**
 * Broadcast kiosk status update
 */
export function broadcastKioskStatus(kiosk: {
  kioskId: string
  status: 'online' | 'offline'
  lastSeen: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast kiosk status: Socket.IO not initialized')
    return
  }

  io.to('kiosks').emit('kiosk:status', kiosk)

  logger.debug('Broadcasted kiosk status', {
    kioskId: kiosk.kioskId,
    status: kiosk.status,
  })
}

/**
 * Broadcast schedule update
 */
export function broadcastScheduleUpdate(data: {
  action: 'created' | 'updated' | 'published' | 'deleted'
  scheduleId: string
  dutyRoleCode: string
  weekStartDate: string
  status: string
  timestamp: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast schedule update: Socket.IO not initialized')
    return
  }

  io.to('schedules').emit('schedule:update', data)

  logger.debug('Broadcasted schedule update', {
    action: data.action,
    scheduleId: data.scheduleId,
    dutyRoleCode: data.dutyRoleCode,
    weekStartDate: data.weekStartDate,
  })
}

/**
 * Broadcast schedule assignment update
 */
export function broadcastScheduleAssignmentUpdate(data: {
  action: 'created' | 'updated' | 'deleted'
  scheduleId: string
  assignmentId: string
  memberId: string
  memberName: string
  positionCode: string | null
  timestamp: string
}) {
  if (!io) {
    logger.warn('Cannot broadcast schedule assignment update: Socket.IO not initialized')
    return
  }

  io.to('schedules').emit('schedule:assignment', data)

  logger.debug('Broadcasted schedule assignment update', {
    action: data.action,
    scheduleId: data.scheduleId,
    assignmentId: data.assignmentId,
    memberId: data.memberId,
  })
}
