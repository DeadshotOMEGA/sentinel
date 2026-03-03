import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireMinimumLevel, AccountLevel } from '../middleware/roles.js'
import { SessionRepository } from '../repositories/session-repository.js'
import { getPrismaClient } from '../lib/database.js'
import { authLogger } from '../lib/logger.js'
import { tailscaleDeviceService } from '../services/tailscale-device-service.js'

const router: Router = Router()

/**
 * GET /api/admin/sessions
 *
 * List active member sessions
 * Requires: Admin (level 5+)
 */
router.get(
  '/tailscale/devices',
  requireAuth(),
  requireMinimumLevel(AccountLevel.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const result = await tailscaleDeviceService.getDevices()

      return res.status(200).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      authLogger.error('Fetch tailscale devices error', {
        error: message,
        requestedBy: req.member?.id,
      })

      return res.status(503).json({
        error: 'Service Unavailable',
        message: message.includes('required')
          ? 'Tailscale integration is not configured'
          : 'Unable to fetch Tailscale devices from Tailscale API',
      })
    }
  }
)

router.get(
  '/sessions',
  requireAuth(),
  requireMinimumLevel(AccountLevel.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const memberId = req.query.memberId as string | undefined
      const prisma = getPrismaClient()

      const where: Record<string, unknown> = {
        expiresAt: { gt: new Date() },
      }
      if (memberId) {
        where.memberId = memberId
      }

      const sessions = await prisma.memberSession.findMany({
        where,
        select: {
          id: true,
          memberId: true,
          expiresAt: true,
          ipAddress: true,
          createdAt: true,
          member: {
            select: {
              firstName: true,
              lastName: true,
              rank: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      authLogger.info('Listed sessions', {
        count: sessions.length,
        memberId,
        requestedBy: req.member?.id,
      })

      return res.status(200).json({ sessions })
    } catch (error) {
      authLogger.error('List sessions error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list sessions',
      })
    }
  }
)

/**
 * DELETE /api/admin/sessions/:id
 *
 * Revoke a specific session by token
 * Requires: Admin (level 5+)
 */
router.delete(
  '/sessions/:id',
  requireAuth(),
  requireMinimumLevel(AccountLevel.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id as string
      const sessionRepo = new SessionRepository(getPrismaClient())
      await sessionRepo.deleteByToken(sessionId)

      authLogger.info('Session revoked', {
        sessionId,
        revokedBy: req.member?.id,
      })

      return res.status(200).json({
        message: 'Session revoked successfully',
      })
    } catch (error) {
      authLogger.error('Revoke session error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: req.params.id,
      })

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to revoke session',
      })
    }
  }
)

export default router
