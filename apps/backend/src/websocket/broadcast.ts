import { Server as SocketIOServer } from 'socket.io'
import { logger } from '../lib/logger.js'

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
 * Broadcast security alert
 */
export function broadcastSecurityAlert(alert: {
  id: string
  alertType: 'badge_disabled' | 'badge_unknown' | 'inactive_member' | 'unauthorized_access'
  severity: 'critical' | 'warning' | 'info'
  badgeSerial: string | null
  kioskId: string
  message: string
  createdAt: string
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
