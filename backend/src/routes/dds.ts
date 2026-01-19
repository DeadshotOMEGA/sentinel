import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ddsService } from '../services/dds-service';
import { requireAuth, requireRole } from '../auth';
import { ValidationError } from '../utils/errors';

const router = Router();

// Validation schemas
const acceptDdsSchema = z.object({
  memberId: z.string().uuid('Invalid member ID format'),
});

const assignDdsSchema = z.object({
  memberId: z.string().uuid('Invalid member ID format'),
  notes: z.string().max(1000).optional(),
});

const transferDdsSchema = z.object({
  toMemberId: z.string().uuid('Invalid member ID format'),
  notes: z.string().max(1000).optional(),
});

const releaseDdsSchema = z.object({
  notes: z.string().max(1000).optional(),
});

const auditLogQuerySchema = z.object({
  memberId: z.string().uuid('Invalid member ID format').optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

// GET /api/dds/current - Get today's DDS (public, used by kiosk)
router.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dds = await ddsService.getCurrentDds();
    res.json({ dds });
  } catch (err) {
    next(err);
  }
});

// GET /api/dds/status - Check if DDS exists for today (public, used by kiosk)
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hasDds = await ddsService.hasDdsForToday();
    res.json({ hasDds });
  } catch (err) {
    next(err);
  }
});

// POST /api/dds/accept - Member self-accepts DDS at kiosk
router.post('/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = acceptDdsSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'INVALID_ACCEPT_DATA',
        validationResult.error.message,
        'Please provide a valid member ID.'
      );
    }

    const dds = await ddsService.acceptDds(validationResult.data.memberId);
    res.status(201).json({ dds });
  } catch (err) {
    next(err);
  }
});

// POST /api/dds/assign - Admin assigns DDS to a member
router.post(
  '/assign',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = assignDdsSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'INVALID_ASSIGN_DATA',
          validationResult.error.message,
          'Please provide valid assignment data.'
        );
      }

      if (!req.user) {
        throw new ValidationError(
          'UNAUTHORIZED',
          'User not authenticated',
          'You must be logged in to assign DDS.'
        );
      }

      const dds = await ddsService.assignDds(
        validationResult.data.memberId,
        req.user.id,
        validationResult.data.notes
      );

      res.status(201).json({ dds });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/dds/transfer - Admin transfers DDS to another member
router.post(
  '/transfer',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = transferDdsSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'INVALID_TRANSFER_DATA',
          validationResult.error.message,
          'Please provide valid transfer data.'
        );
      }

      if (!req.user) {
        throw new ValidationError(
          'UNAUTHORIZED',
          'User not authenticated',
          'You must be logged in to transfer DDS.'
        );
      }

      const dds = await ddsService.transferDds(
        validationResult.data.toMemberId,
        req.user.id,
        validationResult.data.notes
      );

      res.json({ dds });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/dds/release - Release DDS role
router.post(
  '/release',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = releaseDdsSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'INVALID_RELEASE_DATA',
          validationResult.error.message,
          'Please provide valid release data.'
        );
      }

      if (!req.user) {
        throw new ValidationError(
          'UNAUTHORIZED',
          'User not authenticated',
          'You must be logged in to release DDS.'
        );
      }

      await ddsService.releaseDds(req.user.id, validationResult.data.notes);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/dds/audit-log - Get DDS audit history
router.get(
  '/audit-log',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = auditLogQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        throw new ValidationError(
          'INVALID_QUERY_PARAMS',
          validationResult.error.message,
          'Please provide valid query parameters.'
        );
      }

      const auditLog = await ddsService.getAuditLog(
        validationResult.data.memberId,
        validationResult.data.limit
      );

      res.json({ auditLog });
    } catch (err) {
      next(err);
    }
  }
);

export { router as ddsRoutes };
