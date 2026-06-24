import { Router, type Request, type Response } from 'express'
import * as v from 'valibot'
import { LoginRequestWithRemoteSystemSchema } from '@sentinel/contracts'
import { AuthService, AuthenticationError } from '../services/auth-service.js'
import { getPrismaClient } from '../lib/database.js'
import { authLogger } from '../lib/logger.js'
import { sessionHeartbeatsTotal } from '../lib/metrics.js'
import { RemoteSystemRepository } from '../repositories/remote-system-repository.js'
import {
  getRequestClientIp,
  shouldEnforceMainSystemLoginSelection,
} from '../lib/runtime-context.js'

const router: Router = Router()
const KIOSK_REMOTE_SYSTEM_CODE = 'kiosk'
const DEPLOYMENT_REMOTE_SYSTEM_CODE = 'deployment_laptop'

function getAuthService(): AuthService {
  return new AuthService(getPrismaClient())
}

function shouldUseSecureSessionCookie(req: Request): boolean {
  const forwardedProtoHeader = req.headers['x-forwarded-proto']
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader
  const normalizedForwardedProto = forwardedProto?.split(',')[0]?.trim().toLowerCase()

  return req.secure || normalizedForwardedProto === 'https'
}

/**
 * Extract session token from cookie or Authorization header.
 */
function extractToken(req: Request): string | null {
  // Check sentinel-session cookie first
  const cookie = req.cookies?.['sentinel-session']
  if (typeof cookie === 'string' && cookie.length > 0) return cookie

  // Fall back to Authorization: Bearer
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token && !token.startsWith('sk_')) return token
  }

  return null
}

/**
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = v.safeParse(LoginRequestWithRemoteSystemSchema, req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parsed.issues[0]?.message ?? 'Validation failed',
      })
    }

    const { remoteSystemId, useKioskRemoteSystem } = parsed.output
    const loginIdentifier = parsed.output.serialNumber.trim()
    const remoteSystemRepository = new RemoteSystemRepository(getPrismaClient())
    const shouldUseKioskRemoteSystem = useKioskRemoteSystem === true
    const shouldForceDeploymentRemoteSystem =
      !shouldUseKioskRemoteSystem && shouldEnforceMainSystemLoginSelection(req)

    const resolvedRemoteSystem = shouldUseKioskRemoteSystem
      ? await remoteSystemRepository.findByCode(KIOSK_REMOTE_SYSTEM_CODE)
      : shouldForceDeploymentRemoteSystem
        ? await remoteSystemRepository.findByCode(DEPLOYMENT_REMOTE_SYSTEM_CODE)
        : await remoteSystemRepository.findActiveById(remoteSystemId ?? '')

    if (!resolvedRemoteSystem || !resolvedRemoteSystem.isActive) {
      if (shouldUseKioskRemoteSystem) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Kiosk remote system is not active. Update it in Settings > Network.',
        })
      }

      if (shouldForceDeploymentRemoteSystem) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Server remote system is not active. Update it in Settings > Network.',
        })
      }

      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Choose an active remote system from the list',
      })
    }

    if (
      shouldForceDeploymentRemoteSystem &&
      resolvedRemoteSystem.code === DEPLOYMENT_REMOTE_SYSTEM_CODE &&
      remoteSystemId &&
      remoteSystemId !== resolvedRemoteSystem.id
    ) {
      authLogger.info('Remote system selection overridden for local production login', {
        selectedRemoteSystemId: remoteSystemId,
        appliedRemoteSystemId: resolvedRemoteSystem.id,
        clientIp: getRequestClientIp(req),
      })
    }

    const authService = getAuthService()
    const result = await authService.login(
      loginIdentifier,
      {
        remoteSystemId: resolvedRemoteSystem.id,
        remoteSystemName: resolvedRemoteSystem.name,
      },
      getRequestClientIp(req),
      req.headers['user-agent']
    )

    const secureCookie = shouldUseSecureSessionCookie(req)

    // Set HTTP-only cookie
    res.cookie('sentinel-session', result.token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    })

    return res.status(200).json({
      token: result.token,
      sessionId: result.sessionId,
      remoteSystemId: result.remoteSystemId,
      remoteSystemName: result.remoteSystemName,
      lastSeenAt: result.lastSeenAt,
      expiresAt: result.expiresAt,
      member: result.member,
    })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        error: error.code,
        message: error.message,
      })
    }
    authLogger.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Login failed',
    })
  }
})

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = extractToken(req)
    if (!token) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated',
      })
    }

    const authService = getAuthService()
    await authService.logout(token)

    const secureCookie = shouldUseSecureSessionCookie(req)
    res.clearCookie('sentinel-session', {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      path: '/',
    })
    return res.status(200).json({ message: 'Logged out' })
  } catch (error) {
    authLogger.error('Logout error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Logout failed',
    })
  }
})

/**
 * GET /api/auth/session
 */
router.get('/session', async (req: Request, res: Response) => {
  try {
    const token = extractToken(req)
    if (!token) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated',
      })
    }

    const authService = getAuthService()
    const session = await authService.validateSession(token)
    if (!session) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired session',
      })
    }

    return res.status(200).json({
      member: {
        id: session.member.id,
        firstName: session.member.firstName,
        lastName: session.member.lastName,
        rank: session.member.rank,
        serviceNumber: session.member.serviceNumber,
        accountLevel: session.member.accountLevel,
      },
      sessionId: session.id,
      remoteSystemId: session.remoteSystemId,
      remoteSystemName: session.remoteSystemName,
      lastSeenAt: session.lastSeenAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    })
  } catch (error) {
    authLogger.error('Session check error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Session check failed',
    })
  }
})

/**
 * POST /api/auth/heartbeat
 */
router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const token = extractToken(req)
    if (!token) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated',
      })
    }

    const authService = getAuthService()
    const session = await authService.heartbeat(token)
    if (!session) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired session',
      })
    }

    sessionHeartbeatsTotal.inc()

    return res.status(200).json({
      sessionId: session.sessionId,
      remoteSystemId: session.remoteSystemId,
      remoteSystemName: session.remoteSystemName,
      lastSeenAt: session.lastSeenAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    })
  } catch (error) {
    authLogger.error('Session heartbeat error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Heartbeat failed',
    })
  }
})

export { router as authRouter }
