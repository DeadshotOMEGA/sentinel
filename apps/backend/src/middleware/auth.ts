import { Request, Response, NextFunction } from 'express'
import { auth } from '../lib/auth.js'
import { authLogger } from '../lib/logger.js'
import { requestContext } from '../lib/logger.js'

/**
 * Extend Express Request type to include authentication data
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name?: string | null
        role?: string | null
      }
      apiKey?: {
        id: string
        name?: string | null
        scopes?: string[]
      }
      session?: {
        id: string
        expiresAt: Date
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
 * Extract bearer token from Authorization header
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null

  return parts[1] ?? null
}

/**
 * Extract API key from header
 */
function extractApiKey(req: Request): string | null {
  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key']
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader
  }

  // Check Authorization header with Bearer token (if it starts with 'sk_')
  const bearerToken = extractBearerToken(req)
  if (bearerToken?.startsWith('sk_')) {
    return bearerToken
  }

  return null
}

/**
 * Authenticate request using session token or API key
 *
 * This middleware checks for authentication in this order:
 * 1. Session cookie (for web app)
 * 2. Bearer token in Authorization header (for web app)
 * 3. API key in X-API-Key header or Bearer token (for kiosks)
 *
 * If authentication succeeds, adds `req.user` or `req.apiKey` to request.
 * If authentication fails, responds with 401 Unauthorized.
 *
 * @param required - If true, returns 401 on missing/invalid auth. If false, continues without auth.
 */
export function requireAuth(required: boolean = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try session authentication first (cookie or bearer token)
      const sessionToken = extractBearerToken(req) || req.cookies?.['better-auth.session_token']

      if (sessionToken && !sessionToken.startsWith('sk_')) {
        try {
          const session = await auth.api.getSession({
            headers: req.headers as unknown as Record<string, string>,
          })

          if (session?.user) {
            req.user = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name ?? null,
              role: ((session.user as Record<string, unknown>).role as string | undefined) ?? null,
            }
            req.session = {
              id: session.session.id,
              expiresAt: new Date(session.session.expiresAt),
            }

            // Add user ID to request context for logging
            const store = requestContext.getStore()
            if (store) {
              store.userId = session.user.id
            }

            authLogger.debug('Session authenticated', {
              userId: session.user.id,
              sessionId: session.session.id,
            })

            return next()
          }
        } catch (error) {
          authLogger.debug('Session validation failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          // Fall through to API key check
        }
      }

      // Try API key authentication
      // Note: API keys are validated against the api_key table directly
      // since we're not using the better-auth API key plugin
      const apiKey = extractApiKey(req)

      if (apiKey) {
        // TODO: Implement custom API key validation
        // For now, skip API key authentication until we implement it
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

      // Optional auth - continue without authentication
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
 * Require user to be authenticated (not API key)
 */
export function requireUser() {
  return async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(true)(req, res, () => {
      if (!req.user) {
        authLogger.warn('User authentication required', {
          path: req.path,
          method: req.method,
        })

        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication required. API keys are not permitted for this endpoint.',
        })
      }

      next()
    })
  }
}

/**
 * Require API key authentication (not user session)
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
 * Optional authentication - adds user/apiKey if present but doesn't require it
 */
export const optionalAuth = requireAuth(false)
