import { Socket } from 'socket.io'
import { logger } from '../lib/logger.js'
import { SessionRepository } from '../repositories/session-repository.js'
import { getPrismaClient } from '../lib/database.js'
import { AccountLevel } from '../middleware/roles.js'

/**
 * WebSocket authentication middleware
 * Validates session token from Socket.IO handshake
 */
export async function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  try {
    // In development, bypass auth and assign dev member context
    if (process.env.NODE_ENV !== 'production') {
      socket.data.memberId = 'dev-member'
      socket.data.sessionId = 'dev-session'
      socket.data.accountLevel = AccountLevel.DEVELOPER

      logger.debug('WebSocket auth bypassed (development mode)', {
        socketId: socket.id,
      })

      return next()
    }

    const token = socket.handshake.auth.token || socket.handshake.headers.authorization

    if (!token) {
      logger.warn('WebSocket connection rejected: No authentication token', {
        socketId: socket.id,
        address: socket.handshake.address,
      })
      return next(new Error('Authentication required'))
    }

    // Strip "Bearer " prefix if present
    const rawToken = typeof token === 'string' && token.startsWith('Bearer ') ? token.slice(7) : token

    const sessionRepo = new SessionRepository(getPrismaClient())
    const session = await sessionRepo.findByToken(rawToken)

    if (!session) {
      logger.warn('WebSocket connection rejected: Invalid session token', {
        socketId: socket.id,
        address: socket.handshake.address,
      })
      return next(new Error('Invalid authentication token'))
    }

    // Attach member info to socket
    socket.data.memberId = session.member.id
    socket.data.sessionId = session.id
    socket.data.accountLevel = session.member.accountLevel

    logger.info('WebSocket authenticated', {
      socketId: socket.id,
      memberId: session.member.id,
      accountLevel: session.member.accountLevel,
    })

    next()
  } catch (error) {
    logger.error('WebSocket authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      socketId: socket.id,
    })
    next(new Error('Authentication failed'))
  }
}

/**
 * Check if socket has at least the required account level
 */
export function hasMinimumLevel(socket: Socket, requiredLevel: number): boolean {
  const memberLevel = socket.data.accountLevel ?? 0
  return memberLevel >= requiredLevel
}

/**
 * Get member ID from socket
 */
export function getMemberId(socket: Socket): string | undefined {
  return socket.data.memberId
}
