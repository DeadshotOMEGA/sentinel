import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth, requireRole } from '../auth';
import { auditRepository } from '../db/repositories/audit-repository';
import { logger } from '../utils/logger';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireRole('admin'));

// Validation schemas
const ClearTableSchema = z.object({
  table: z.enum([
    'members',
    'checkins',
    'visitors',
    'badges',
    'events',
    'event_attendees',
    'event_checkins',
  ]),
});

/**
 * POST /api/dev-tools/clear-all
 * Clear all data except admin_users, divisions, and migrations
 * Tables cleared: members, checkins, visitors, badges, events, event_attendees, event_checkins
 */
router.post('/clear-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    if (!req.ip) {
      throw new Error('IP address not found in request');
    }

    // Clear data in correct order to respect foreign key constraints
    const cleared: string[] = [];

    await prisma.$transaction(async (tx) => {
      // Event-related tables first (most dependent)
      await tx.eventCheckin.deleteMany({});
      cleared.push('event_checkins');

      await tx.eventAttendee.deleteMany({});
      cleared.push('event_attendees');

      await tx.event.deleteMany({});
      cleared.push('events');

      // Checkins and visitors
      await tx.checkin.deleteMany({});
      cleared.push('checkins');

      await tx.visitor.deleteMany({});
      cleared.push('visitors');

      // Members
      await tx.member.deleteMany({});
      cleared.push('members');

      // Badges last (referenced by many tables)
      await tx.badge.deleteMany({});
      cleared.push('badges');
    });

    // Log the operation
    await auditRepository.log({
      adminUserId: req.user.id,
      action: 'dev_tools_clear_all',
      entityType: 'dev_tools',
      entityId: null,
      details: { cleared },
      ipAddress: req.ip,
    });

    logger.warn('Dev tools: cleared all data', {
      adminUserId: req.user.id,
      cleared,
    });

    res.json({ cleared });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      if (!firstError) {
        throw new Error('Zod validation failed but no error details available');
      }
      res.status(400).json({ error: firstError.message });
      return;
    }
    next(error);
  }
});

/**
 * POST /api/dev-tools/clear-table
 * Clear data from a specific table
 */
router.post('/clear-table', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table } = ClearTableSchema.parse(req.body);

    if (!req.user) {
      throw new Error('User not found in request');
    }
    if (!req.ip) {
      throw new Error('IP address not found in request');
    }

    let count = 0;

    // Clear the specified table
    switch (table) {
      case 'members':
        count = await prisma.member.deleteMany({}).then((result) => result.count);
        break;
      case 'checkins':
        count = await prisma.checkin.deleteMany({}).then((result) => result.count);
        break;
      case 'visitors':
        count = await prisma.visitor.deleteMany({}).then((result) => result.count);
        break;
      case 'badges':
        count = await prisma.badge.deleteMany({}).then((result) => result.count);
        break;
      case 'events':
        count = await prisma.event.deleteMany({}).then((result) => result.count);
        break;
      case 'event_attendees':
        count = await prisma.eventAttendee.deleteMany({}).then((result) => result.count);
        break;
      case 'event_checkins':
        count = await prisma.eventCheckin.deleteMany({}).then((result) => result.count);
        break;
      default:
        res.status(400).json({ error: 'Invalid table name' });
        return;
    }

    // Log the operation
    await auditRepository.log({
      adminUserId: req.user.id,
      action: 'dev_tools_clear_table',
      entityType: 'dev_tools',
      entityId: null,
      details: { table, count },
      ipAddress: req.ip,
    });

    logger.warn('Dev tools: cleared table', {
      adminUserId: req.user.id,
      table,
      count,
    });

    res.json({ cleared: table, count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      if (!firstError) {
        throw new Error('Zod validation failed but no error details available');
      }
      res.status(400).json({ error: firstError.message });
      return;
    }
    next(error);
  }
});

/**
 * POST /api/dev-tools/reset
 * Nuclear option: Drop all data including divisions
 * Re-runs migrations to reset to fresh state
 */
router.post('/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    if (!req.ip) {
      throw new Error('IP address not found in request');
    }

    // Log the operation BEFORE clearing (so we don't lose the audit log)
    await auditRepository.log({
      adminUserId: req.user.id,
      action: 'dev_tools_reset',
      entityType: 'dev_tools',
      entityId: null,
      details: { action: 'complete_reset' },
      ipAddress: req.ip,
    });

    logger.warn('Dev tools: complete reset initiated', {
      adminUserId: req.user.id,
    });

    // Clear all data including divisions
    await prisma.$transaction(async (tx) => {
      // Clear in order of dependencies
      await tx.eventCheckin.deleteMany({});
      await tx.eventAttendee.deleteMany({});
      await tx.event.deleteMany({});
      await tx.checkin.deleteMany({});
      await tx.visitor.deleteMany({});
      await tx.badge.deleteMany({});
      await tx.member.deleteMany({});
      await tx.division.deleteMany({});
      // Keep admin_users for login access
      // Keep audit_log for tracking
      // Keep migrations table
    });

    logger.warn('Dev tools: complete reset finished', {
      adminUserId: req.user.id,
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      if (!firstError) {
        throw new Error('Zod validation failed but no error details available');
      }
      res.status(400).json({ error: firstError.message });
      return;
    }
    next(error);
  }
});

export { router as devToolsRoutes };
