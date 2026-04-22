import { Socket } from 'socket.io'
import { logger } from '../lib/logger.js'
import {
  authenticateKioskDeviceApiKey,
  extractKioskDeviceApiKeyFromCookieHeader,
} from '../lib/kiosk-device-auth.js'
import { SessionRepository } from '../repositories/session-repository.js'
import { getPrismaClient } from '../lib/database.js'
import { AccountLevel } from '../middleware/roles.js'

function extractSessionTokenFromCookieHeader(
  cookieHeader: string | string[] | undefined
): string | null {
  if (!cookieHeader) return null

  const cookieValue = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader
  const cookies = cookieValue.split(';').map((part) => part.trim())

  for (const cookie of cookies) {
    if (!cookie.startsWith('sentinel-session=')) continue
    const rawValue = cookie.slice('sentinel-session='.length)
    if (!rawValue) return null

    try {
      return decodeURIComponent(rawValue)
    } catch {
      return rawValue
    }
  }

  return null
}

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

    const tokenFromAuth = socket.handshake.auth.token || socket.handshake.headers.authorization
    const sessionTokenFromCookie = extractSessionTokenFromCookieHeader(
      socket.handshake.headers.cookie
    )
    const sessionToken = sessionTokenFromCookie
      ? sessionTokenFromCookie
      : typeof tokenFromAuth === 'string' && !tokenFromAuth.startsWith('sk_')
        ? tokenFromAuth
        : null

    if (sessionToken) {
      const rawToken =
        typeof sessionToken === 'string' && sessionToken.startsWith('Bearer ')
          ? sessionToken.slice(7)
          : sessionToken

      const sessionRepo = new SessionRepository(getPrismaClient())
      const session = await sessionRepo.findByToken(rawToken)

      if (session) {
        socket.data.memberId = session.member.id
        socket.data.sessionId = session.id
        socket.data.accountLevel = session.member.accountLevel

        logger.info('WebSocket authenticated', {
          socketId: socket.id,
          memberId: session.member.id,
          accountLevel: session.member.accountLevel,
        })

        return next()
      }

      logger.warn('WebSocket connection rejected: Invalid session token', {
        socketId: socket.id,
        address: socket.handshake.address,
      })
    }

    const cookieApiKey = extractKioskDeviceApiKeyFromCookieHeader(socket.handshake.headers.cookie)
    const rawApiKey =
      typeof tokenFromAuth === 'string' && tokenFromAuth.startsWith('Bearer sk_')
        ? tokenFromAuth.slice(7)
        : typeof tokenFromAuth === 'string' && tokenFromAuth.startsWith('sk_')
          ? tokenFromAuth
          : cookieApiKey
    const apiKey = authenticateKioskDeviceApiKey(rawApiKey)

    if (apiKey) {
      socket.data.apiKeyId = apiKey.id
      socket.data.accountLevel = 0

      logger.info('WebSocket authenticated with kiosk device API key', {
        socketId: socket.id,
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
      })

      return next()
    }

    if (!sessionToken && !rawApiKey) {
      logger.warn('WebSocket connection rejected: No authentication token', {
        socketId: socket.id,
        address: socket.handshake.address,
      })
      return next(new Error('Authentication required'))
    }

    logger.warn('WebSocket connection rejected: Invalid API key', {
      socketId: socket.id,
      address: socket.handshake.address,
    })
    next(new Error('Invalid authentication token'))
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
