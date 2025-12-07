import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth, requireRole } from '../auth';
import { auditRepository } from '../db/repositories/audit-repository';
import { logger } from '../utils/logger';
import {
  getSimulationService,
  resetSimulationService,
  DEFAULT_ATTENDANCE_RATES,
  DEFAULT_INTENSITY,
} from '../services/simulation-service';
import { resetScheduleResolver } from '../services/schedule-resolver';
import type { SimulationRequest } from '@shared/types';

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

// ============================================================================
// DATA SIMULATION ENDPOINTS
// ============================================================================

// Validation schema for simulation request
const SimulationTimeRangeSchema = z.object({
  mode: z.enum(['last_days', 'custom']),
  lastDays: z.number().min(1).max(365).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine(
  (data) => {
    if (data.mode === 'custom') {
      return data.startDate && data.endDate;
    }
    return data.lastDays !== undefined;
  },
  { message: 'Custom mode requires startDate and endDate, last_days mode requires lastDays' }
);

const SimulationAttendanceRatesSchema = z.object({
  ftsWorkDays: z.number().min(0).max(100),
  ftsTrainingNight: z.number().min(0).max(100),
  ftsAdminNight: z.number().min(0).max(100),
  reserveTrainingNight: z.number().min(0).max(100),
  reserveAdminNight: z.number().min(0).max(100),
  bmqAttendance: z.number().min(0).max(100),
  edtAppearance: z.number().min(0).max(100),
});

const SimulationIntensitySchema = z.object({
  visitorsPerDay: z.object({
    min: z.number().min(0).max(50),
    max: z.number().min(0).max(50),
  }),
  eventsPerMonth: z.object({
    min: z.number().min(0).max(10),
    max: z.number().min(0).max(10),
  }),
  edgeCasePercentage: z.number().min(0).max(50),
});

const SimulationRequestSchema = z.object({
  timeRange: SimulationTimeRangeSchema,
  attendanceRates: SimulationAttendanceRatesSchema,
  intensity: SimulationIntensitySchema,
  warnOnOverlap: z.boolean(),
});

/**
 * GET /api/dev-tools/simulate/defaults
 * Get default simulation parameters
 */
router.get('/simulate/defaults', (_req: Request, res: Response) => {
  res.json({
    attendanceRates: DEFAULT_ATTENDANCE_RATES,
    intensity: DEFAULT_INTENSITY,
  });
});

/**
 * POST /api/dev-tools/simulate/precheck
 * Pre-check simulation parameters before running
 */
router.post('/simulate/precheck', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = SimulationRequestSchema.parse(req.body) as SimulationRequest;

    // Reset services to get fresh data
    resetScheduleResolver();
    resetSimulationService();

    const service = await getSimulationService();
    const precheck = await service.precheck(request);

    res.json(precheck);
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
 * POST /api/dev-tools/simulate
 * Run the data simulation
 */
router.post('/simulate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    if (!req.ip) {
      throw new Error('IP address not found in request');
    }

    const request = SimulationRequestSchema.parse(req.body) as SimulationRequest;

    logger.info('Dev tools: starting data simulation', {
      adminUserId: req.user.id,
      timeRange: request.timeRange,
    });

    // Reset services to get fresh data
    resetScheduleResolver();
    resetSimulationService();

    const service = await getSimulationService();
    const result = await service.simulate(request);

    // Log the operation
    await auditRepository.log({
      adminUserId: req.user.id,
      action: 'dev_tools_simulate',
      entityType: 'dev_tools',
      entityId: null,
      details: {
        timeRange: request.timeRange,
        generated: result.summary.generated,
        daysSimulated: result.summary.daysSimulated,
      },
      ipAddress: req.ip,
    });

    logger.info('Dev tools: data simulation complete', {
      adminUserId: req.user.id,
      generated: result.summary.generated,
      daysSimulated: result.summary.daysSimulated,
    });

    res.json(result);
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
