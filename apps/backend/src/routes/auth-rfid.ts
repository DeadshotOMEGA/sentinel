import { Router, Request, Response } from 'express'
import crypto from 'node:crypto'
import { z } from 'zod'
import { getPrismaClient } from '../lib/database.js'
import { authLogger } from '../lib/logger.js'

const router: Router = Router()

/**
 * RFID Login Request Schema
 */
const rfidLoginSchema = z.object({
  badgeNumber: z.string().min(1, 'Badge number is required'),
})

/**
 * POST /api/auth/rfid-login
 *
 * Authenticate user via RFID badge scan
 *
 * Flow:
 * 1. Validate badge number
 * 2. Look up Badge in database
 * 3. Find associated Member
 * 4. Find User linked to that badge (via badgeId field)
 * 5. Create better-auth session for the user
 * 6. Return session token and user data
 *
 * Security:
 * - Badge must exist in Badge table
 * - Badge must be assigned to a Member
 * - User must have badgeId matching the badge serialNumber
 * - Badge theft is mitigated by audit logging and ability to unlink badges
 */
router.post('/rfid-login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = rfidLoginSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: result.error.issues[0]?.message || 'Validation failed',
      })
    }

    const { badgeNumber } = result.data

    // Step 1: Look up badge
    const badge = await getPrismaClient().badge.findUnique({
      where: { serialNumber: badgeNumber },
      include: {
        members: true, // Include associated members
      },
    })

    if (!badge) {
      authLogger.warn('RFID login failed: Badge not found', { badgeNumber })
      return res.status(404).json({
        error: 'Badge Not Found',
        message: 'Invalid badge number',
      })
    }

    // Get the assigned member (should be first in array for member-assigned badges)
    const assignedMember = badge.members[0]

    if (!assignedMember) {
      authLogger.warn('RFID login failed: Badge not assigned to member', {
        badgeNumber,
        badgeId: badge.id,
      })
      return res.status(400).json({
        error: 'Badge Not Assigned',
        message: 'This badge is not assigned to any member',
      })
    }

    // Step 2: Find User with matching badgeId
    // Note: badgeId in User table should match badge.serialNumber
    const user = await getPrismaClient().user.findUnique({
      where: { badgeId: badgeNumber },
    })

    if (!user) {
      authLogger.warn('RFID login failed: No user linked to badge', {
        badgeNumber,
        memberId: assignedMember.id,
        memberName: `${assignedMember.firstName} ${assignedMember.lastName}`,
      })
      return res.status(403).json({
        error: 'User Not Linked',
        message: 'This badge is not linked to a user account. Contact admin to link your badge.',
      })
    }

    // Step 3: Create better-auth session
    // Note: We need to manually create a session since better-auth doesn't have RFID built-in
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7-day expiry (matches better-auth config)

    const session = await getPrismaClient().session.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        token: sessionToken,
        expiresAt,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] || 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    authLogger.info('RFID login successful', {
      userId: user.id,
      email: user.email,
      role: user.role,
      badgeNumber,
      sessionId: session.id,
    })

    // Step 4: Return session data
    return res.status(200).json({
      session: {
        id: session.id,
        token: sessionToken,
        expiresAt: session.expiresAt,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      member: {
        id: assignedMember.id,
        firstName: assignedMember.firstName,
        lastName: assignedMember.lastName,
        rank: assignedMember.rank,
      },
    })
  } catch (error) {
    authLogger.error('RFID login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process RFID login',
    })
  }
})

export default router
