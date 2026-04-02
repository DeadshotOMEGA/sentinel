import { Router, type Request, type Response } from 'express'
import * as v from 'valibot'
import {
  PreflightLoginSchema,
  LoginRequestWithRemoteSystemSchema,
  ChangePinSchema,
  SetPinSchema,
  SetupPinSchema,
} from '@sentinel/contracts'
import {
  AuthService,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  PinPolicyError,
  PinSetupRequiredError,
} from '../services/auth-service.js'
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
 * POST /api/auth/preflight-login
 */
router.post('/preflight-login', async (req: Request, res: Response) => {
  try {
    const parsed = v.safeParse(PreflightLoginSchema, req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parsed.issues[0]?.message ?? 'Validation failed',
      })
    }

    const authService = getAuthService()
    const result = await authService.preflightLogin(
      parsed.output.serialNumber,
      getRequestClientIp(req)
    )

    return res.status(200).json(result)
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        error: error.code,
        message: error.message,
      })
    }

    authLogger.error('Preflight login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Preflight login failed',
    })
  }
})

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

    const { serialNumber, pin, remoteSystemId, useKioskRemoteSystem } = parsed.output
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
          message:
            'Deployment Laptop remote system is not active. Update it in Settings > Network.',
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
      serialNumber,
      pin,
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
    if (error instanceof PinSetupRequiredError) {
      return res.status(403).json({
        error: error.code,
        message: error.message,
      })
    }
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
 * POST /api/auth/setup-pin
 */
router.post('/setup-pin', async (req: Request, res: Response) => {
  try {
    const parsed = v.safeParse(SetupPinSchema, req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parsed.issues[0]?.message ?? 'Validation failed',
      })
    }

    const authService = getAuthService()
    await authService.setupPin(
      parsed.output.serialNumber,
      parsed.output.newPin,
      getRequestClientIp(req)
    )

    return res.status(200).json({ message: 'PIN set' })
  } catch (error) {
    if (error instanceof PinPolicyError) {
      return res.status(400).json({
        error: error.code,
        message: error.message,
      })
    }
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        error: error.code,
        message: error.message,
      })
    }
    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        error: error.code,
        message: error.message,
      })
    }

    authLogger.error('Public PIN setup error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to set PIN',
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
        mustChangePin: session.member.mustChangePin,
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

/**
 * POST /api/auth/change-pin
 */
router.post('/change-pin', async (req: Request, res: Response) => {
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

    const parsed = v.safeParse(ChangePinSchema, req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parsed.issues[0]?.message ?? 'Validation failed',
      })
    }

    if (!session.member.mustChangePin && parsed.output.oldPin === undefined) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Current PIN is required',
      })
    }

    await authService.changePin(session.member.id, parsed.output.newPin, {
      oldPin: parsed.output.oldPin,
      allowWithoutCurrentPin: session.member.mustChangePin,
    })
    return res.status(200).json({ message: 'PIN changed' })
  } catch (error) {
    if (error instanceof PinPolicyError) {
      return res.status(400).json({
        error: error.code,
        message: error.message,
      })
    }
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: error.message,
      })
    }
    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: error.message,
      })
    }
    authLogger.error('Change PIN error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to change PIN',
    })
  }
})

/**
 * POST /api/auth/set-pin
 */
router.post('/set-pin', async (req: Request, res: Response) => {
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

    // Require account level 5+ (Admin)
    if (session.member.accountLevel < 5) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Requires admin access (account level 5+)',
      })
    }

    const parsed = v.safeParse(SetPinSchema, req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parsed.issues[0]?.message ?? 'Validation failed',
      })
    }

    await authService.setPin(parsed.output.memberId, parsed.output.newPin)
    return res.status(200).json({ message: 'PIN set' })
  } catch (error) {
    if (error instanceof PinPolicyError) {
      return res.status(400).json({
        error: error.code,
        message: error.message,
      })
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: error.message,
      })
    }
    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: error.message,
      })
    }
    authLogger.error('Set PIN error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to set PIN',
    })
  }
})

export { router as authRouter }
