import { Request, Response, NextFunction } from 'express'
import { authLogger } from '../lib/logger.js'
import { requestContext } from '../lib/logger.js'
import { SessionRepository } from '../repositories/session-repository.js'
import { getPrismaClient } from '../lib/database.js'

/**
 * Extend Express Request type to include authentication data
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      member?: {
        id: string
        firstName: string
        lastName: string
        rank: string
        serviceNumber: string
        accountLevel: number
      }
      apiKey?: {
        id: string
        name?: string | null
        scopes?: string[]
      }
    }
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code: string = 'UNAUTHORIZED'
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * Extract session token from sentinel-session cookie or Authorization: Bearer header
 */
function extractSessionToken(req: Request): string | null {
  // Check sentinel-session cookie first
  const cookie = req.cookies?.['sentinel-session']
  if (typeof cookie === 'string' && cookie.length > 0) return cookie

  // Fall back to Authorization: Bearer (skip API keys starting with sk_)
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token && !token.startsWith('sk_')) return token
  }

  return null
}

/**
 * Extract API key from header
 */
function extractApiKey(req: Request): string | null {
  const apiKeyHeader = req.headers['x-api-key']
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader
  }

  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer sk_')) {
    return authHeader.slice(7)
  }

  return null
}

/**
 * Authenticate request using session token or API key
 *
 * Checks for authentication in this order:
 * 1. Session cookie or Bearer token → sets req.member
 * 2. API key in X-API-Key header or Bearer token → sets req.apiKey
 *
 * @param required - If true, returns 401 on missing/invalid auth. If false, continues without auth.
 */
export function requireAuth(required: boolean = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try session authentication first
      const sessionToken = extractSessionToken(req)

      if (sessionToken) {
        const sessionRepo = new SessionRepository(getPrismaClient())
        const session = await sessionRepo.findByToken(sessionToken)

        if (session) {
          req.member = {
            id: session.member.id,
            firstName: session.member.firstName,
            lastName: session.member.lastName,
            rank: session.member.rank,
            serviceNumber: session.member.serviceNumber,
            accountLevel: session.member.accountLevel,
          }

          // Add user ID to request context for logging
          const store = requestContext.getStore()
          if (store) {
            store.userId = session.member.id
          }

          authLogger.debug('Session authenticated', {
            memberId: session.member.id,
          })

          return next()
        }

        authLogger.debug('Session validation failed: invalid or expired token')
      }

      // Try API key authentication
      const apiKey = extractApiKey(req)
      if (apiKey) {
        // TODO: Implement custom API key validation
        authLogger.debug('API key authentication not yet implemented')
      }

      // No valid authentication found
      if (required) {
        authLogger.warn('Authentication required but not provided', {
          path: req.path,
          method: req.method,
        })

        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid authentication required. Provide session token or API key.',
        })
      }

      next()
    } catch (error) {
      authLogger.error('Authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })

      if (required) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication failed',
        })
      }

      next()
    }
  }
}

/**
 * Require member to be authenticated (not API key)
 */
export function requireMember() {
  return async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(true)(req, res, () => {
      if (!req.member) {
        authLogger.warn('Member authentication required', {
          path: req.path,
          method: req.method,
        })

        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Member authentication required. API keys are not permitted for this endpoint.',
        })
      }

      next()
    })
  }
}

/**
 * Require API key authentication (not member session)
 */
export function requireApiKey(scopes?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(true)(req, res, () => {
      if (!req.apiKey) {
        authLogger.warn('API key required', {
          path: req.path,
          method: req.method,
        })

        return res.status(401).json({
          error: 'Unauthorized',
          message: 'API key required. User sessions are not permitted for this endpoint.',
        })
      }

      // Check scopes if provided
      if (scopes && scopes.length > 0) {
        const apiKeyScopes = req.apiKey.scopes || []
        const hasRequiredScope = scopes.some((scope) => apiKeyScopes.includes(scope))

        if (!hasRequiredScope) {
          authLogger.warn('Insufficient API key scopes', {
            path: req.path,
            method: req.method,
            required: scopes,
            actual: apiKeyScopes,
          })

          return res.status(403).json({
            error: 'Forbidden',
            message: `API key does not have required scopes: ${scopes.join(', ')}`,
          })
        }
      }

      next()
    })
  }
}

/**
 * Optional authentication - adds member/apiKey if present but doesn't require it
 */
export const optionalAuth = requireAuth(false)
