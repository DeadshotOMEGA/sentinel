import { Socket } from 'socket.io'
import { logger } from '../lib/logger.js'

/**
 * WebSocket authentication middleware
 * Validates session token or API key from Socket.IO handshake
 */
export async function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  try {
    // In development, bypass auth and assign dev user context
    if (process.env.NODE_ENV !== 'production') {
      socket.data.userId = 'dev-user'
      socket.data.sessionId = 'dev-session'
      socket.data.role = 'admin'

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

    // Verify session token with better-auth
    // This is a placeholder - better-auth integration would go here
    const session = await verifySessionToken(token)

    if (!session) {
      logger.warn('WebSocket connection rejected: Invalid session token', {
        socketId: socket.id,
        address: socket.handshake.address,
      })
      return next(new Error('Invalid authentication token'))
    }

    // Attach user info to socket
    socket.data.userId = session.userId
    socket.data.sessionId = session.sessionId
    socket.data.role = session.role

    logger.info('WebSocket authenticated', {
      socketId: socket.id,
      userId: session.userId,
      role: session.role,
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
 * Verify session token using better-auth
 * TODO: Implement with better-auth session verification
 */
async function verifySessionToken(token: string): Promise<{
  userId: string
  sessionId: string
  role: string
} | null> {
  try {
    // Placeholder for better-auth session verification
    // This would use auth.api.getSession() or similar

    // For now, just validate token format
    if (!token || token.length < 10) {
      return null
    }

    // Mock session data - replace with actual better-auth verification
    return {
      userId: 'user-id-from-session',
      sessionId: 'session-id',
      role: 'admin',
    }
  } catch (error) {
    logger.error('Session verification error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * Check if socket has required role
 */
export function requireRole(socket: Socket, requiredRole: string): boolean {
  return socket.data.role === requiredRole || socket.data.role === 'admin'
}

/**
 * Get user ID from socket
 */
export function getUserId(socket: Socket): string | undefined {
  return socket.data.userId
}
