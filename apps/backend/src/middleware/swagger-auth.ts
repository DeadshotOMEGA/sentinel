import type { Request, Response, NextFunction } from 'express'
import { apiLogger } from '../lib/logger.js'

/**
 * Swagger Authentication Middleware
 *
 * Protects Swagger UI and ReDoc endpoints based on ENABLE_SWAGGER_AUTH environment variable.
 *
 * Modes:
 * - false (default): Public access - no authentication required
 * - 'basic': HTTP Basic authentication (username/password)
 * - 'session': Requires valid user session
 * - 'disabled': Completely disables Swagger UI (returns 404)
 *
 * Environment Variables:
 * - ENABLE_SWAGGER_AUTH: Authentication mode (false | basic | session | disabled)
 * - SWAGGER_USERNAME: Username for basic auth (default: admin)
 * - SWAGGER_PASSWORD: Password for basic auth (default: changeme)
 */
export function swaggerAuth(req: Request, res: Response, next: NextFunction): void {
  const authMode = process.env.ENABLE_SWAGGER_AUTH || 'false'

  // Mode 1: Disabled - Swagger UI not available
  if (authMode === 'disabled') {
    apiLogger.warn('Swagger UI access blocked (disabled mode)', {
      path: req.path,
      ip: req.ip,
    })
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Swagger UI is disabled',
    })
    return
  }

  // Mode 2: Public access (no auth required)
  if (authMode === 'false' || authMode === false) {
    next()
    return
  }

  // Mode 3: Basic authentication
  if (authMode === 'basic') {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      apiLogger.warn('Swagger UI access denied - missing basic auth', {
        path: req.path,
        ip: req.ip,
      })
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger UI"')
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Basic authentication required',
      })
      return
    }

    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
    const [username, password] = credentials.split(':')

    const expectedUsername = process.env.SWAGGER_USERNAME || 'admin'
    const expectedPassword = process.env.SWAGGER_PASSWORD || 'changeme'

    if (username !== expectedUsername || password !== expectedPassword) {
      apiLogger.warn('Swagger UI access denied - invalid credentials', {
        path: req.path,
        ip: req.ip,
        username,
      })
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger UI"')
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      })
      return
    }

    apiLogger.info('Swagger UI access granted (basic auth)', {
      path: req.path,
      username,
    })
    next()
    return
  }

  // Mode 4: Session authentication
  if (authMode === 'session') {
    // Check if req.user exists (set by session middleware)
    if (!req.user) {
      apiLogger.warn('Swagger UI access denied - no session', {
        path: req.path,
        ip: req.ip,
      })
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Valid session required',
      })
      return
    }

    apiLogger.info('Swagger UI access granted (session auth)', {
      path: req.path,
      userId: req.user.id,
    })
    next()
    return
  }

  // Unknown auth mode - fail secure
  apiLogger.error('Unknown Swagger auth mode', {
    authMode,
    path: req.path,
  })
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Invalid Swagger authentication configuration',
  })
}
