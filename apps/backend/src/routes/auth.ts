import { Router, type Request, type Response } from 'express'
import * as v from 'valibot'
import { LoginRequestSchema, ChangePinSchema, SetPinSchema } from '@sentinel/contracts'
import { AuthService, AuthenticationError, NotFoundError } from '../services/auth-service.js'
import { getPrismaClient } from '../lib/database.js'
import { authLogger } from '../lib/logger.js'

const router: Router = Router()

function getAuthService(): AuthService {
  return new AuthService(getPrismaClient())
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
    const parsed = v.safeParse(LoginRequestSchema, req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parsed.issues[0]?.message ?? 'Validation failed',
      })
    }

    const { serialNumber, pin } = parsed.output
    const authService = getAuthService()
    const result = await authService.login(
      serialNumber,
      pin,
      req.ip ?? req.socket.remoteAddress,
      req.headers['user-agent']
    )

    // Set HTTP-only cookie
    res.cookie('sentinel-session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    })

    return res.status(200).json({
      token: result.token,
      member: result.member,
    })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
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

    res.clearCookie('sentinel-session', { path: '/' })
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

    await authService.changePin(session.member.id, parsed.output.oldPin, parsed.output.newPin)
    return res.status(200).json({ message: 'PIN changed' })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
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
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'NOT_FOUND',
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
