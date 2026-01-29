import { Socket } from 'socket.io'
import { logger } from '../lib/logger.js'
import { socketIOTransport } from '../lib/log-transport-socketio.js'
import { getUserId, requireRole } from './auth.js'

/**
 * Register event handlers for a connected socket
 */
export function registerSocketHandlers(socket: Socket) {
  logger.info('Registering socket handlers', {
    socketId: socket.id,
    userId: getUserId(socket),
  })

  // Subscribe to presence updates
  socket.on('presence:subscribe', () => {
    socket.join('presence')
    logger.debug('Socket subscribed to presence updates', { socketId: socket.id })
  })

  socket.on('presence:unsubscribe', () => {
    socket.leave('presence')
    logger.debug('Socket unsubscribed from presence updates', { socketId: socket.id })
  })

  // Subscribe to check-in events
  socket.on('checkins:subscribe', () => {
    socket.join('checkins')
    logger.debug('Socket subscribed to checkin events', { socketId: socket.id })
  })

  socket.on('checkins:unsubscribe', () => {
    socket.leave('checkins')
    logger.debug('Socket unsubscribed from checkin events', { socketId: socket.id })
  })

  // Subscribe to visitor events
  socket.on('visitors:subscribe', () => {
    socket.join('visitors')
    logger.debug('Socket subscribed to visitor events', { socketId: socket.id })
  })

  socket.on('visitors:unsubscribe', () => {
    socket.leave('visitors')
    logger.debug('Socket unsubscribed from visitor events', { socketId: socket.id })
  })

  // Subscribe to security alerts (admin only)
  socket.on('alerts:subscribe', () => {
    if (!requireRole(socket, 'admin')) {
      socket.emit('error', {
        code: 'FORBIDDEN',
        message: 'Admin role required to subscribe to alerts',
      })
      return
    }

    socket.join('alerts')
    logger.debug('Socket subscribed to security alerts', { socketId: socket.id })
  })

  socket.on('alerts:unsubscribe', () => {
    socket.leave('alerts')
    logger.debug('Socket unsubscribed from security alerts', { socketId: socket.id })
  })

  // Subscribe to DDS updates
  socket.on('dds:subscribe', () => {
    socket.join('dds')
    logger.debug('Socket subscribed to DDS updates', { socketId: socket.id })
  })

  socket.on('dds:unsubscribe', () => {
    socket.leave('dds')
    logger.debug('Socket unsubscribed from DDS updates', { socketId: socket.id })
  })

  // Subscribe to lockup events (admin only)
  socket.on('lockup:subscribe', () => {
    if (!requireRole(socket, 'admin')) {
      socket.emit('error', {
        code: 'FORBIDDEN',
        message: 'Admin role required to subscribe to lockup events',
      })
      return
    }

    socket.join('lockup')
    logger.debug('Socket subscribed to lockup events', { socketId: socket.id })
  })

  socket.on('lockup:unsubscribe', () => {
    socket.leave('lockup')
    logger.debug('Socket unsubscribed from lockup events', { socketId: socket.id })
  })

  // Subscribe to event updates
  socket.on('events:subscribe', () => {
    socket.join('events')
    logger.debug('Socket subscribed to event updates', { socketId: socket.id })
  })

  socket.on('events:unsubscribe', () => {
    socket.leave('events')
    logger.debug('Socket unsubscribed from event updates', { socketId: socket.id })
  })

  // Subscribe to badge updates
  socket.on('badges:subscribe', () => {
    socket.join('badges')
    logger.debug('Socket subscribed to badge updates', { socketId: socket.id })
  })

  socket.on('badges:unsubscribe', () => {
    socket.leave('badges')
    logger.debug('Socket unsubscribed from badge updates', { socketId: socket.id })
  })

  // Subscribe to kiosk status (admin only)
  socket.on('kiosks:subscribe', () => {
    if (!requireRole(socket, 'admin')) {
      socket.emit('error', {
        code: 'FORBIDDEN',
        message: 'Admin role required to subscribe to kiosk status',
      })
      return
    }

    socket.join('kiosks')
    logger.debug('Socket subscribed to kiosk status', { socketId: socket.id })
  })

  socket.on('kiosks:unsubscribe', () => {
    socket.leave('kiosks')
    logger.debug('Socket unsubscribed from kiosk status', { socketId: socket.id })
  })

  // Subscribe to live log streaming (admin only)
  socket.on('logs:subscribe', () => {
    if (!requireRole(socket, 'admin')) {
      socket.emit('error', {
        code: 'FORBIDDEN',
        message: 'Admin role required to subscribe to logs',
      })
      return
    }

    socket.join('logs')
    // Send buffered history on subscribe
    const history = socketIOTransport.getHistory()
    socket.emit('log:history', history)
    logger.debug('Socket subscribed to log streaming', { socketId: socket.id })
  })

  socket.on('logs:unsubscribe', () => {
    socket.leave('logs')
    logger.debug('Socket unsubscribed from log streaming', { socketId: socket.id })
  })

  socket.on('logs:set-level', (level: string) => {
    if (!requireRole(socket, 'admin')) {
      socket.emit('error', {
        code: 'FORBIDDEN',
        message: 'Admin role required to change log level',
      })
      return
    }

    const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']
    if (!validLevels.includes(level)) {
      socket.emit('error', {
        code: 'INVALID_LEVEL',
        message: `Invalid log level: ${level}. Valid levels: ${validLevels.join(', ')}`,
      })
      return
    }

    socketIOTransport.level = level
    logger.info('Log streaming level changed', { level, changedBy: getUserId(socket) })
    socket.emit('logs:level-changed', { level })
  })

  socket.on('logs:clear-history', () => {
    if (!requireRole(socket, 'admin')) {
      socket.emit('error', {
        code: 'FORBIDDEN',
        message: 'Admin role required to clear log history',
      })
      return
    }

    socketIOTransport.clearHistory()
    logger.info('Log history cleared', { clearedBy: getUserId(socket) })
    socket.emit('logs:history-cleared')
  })

  // Ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() })
  })

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.info('Socket disconnected', {
      socketId: socket.id,
      userId: getUserId(socket),
      reason,
    })
  })

  // Handle errors
  socket.on('error', (error) => {
    logger.error('Socket error', {
      socketId: socket.id,
      userId: getUserId(socket),
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  })
}
