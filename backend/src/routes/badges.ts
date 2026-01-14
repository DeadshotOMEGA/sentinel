import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { badgeRepository } from '../db/repositories/badge-repository';
import { badgeService } from '../services/badge-service';
import { requireAuth, requireRole } from '../auth';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { audit } from '../middleware/audit';
import type { BadgeAssignmentType, BadgeStatus } from '../../../shared/types';

const router = Router();

// Validation schemas
const createBadgeSchema = z.object({
  serialNumber: z.string().min(1).max(255),
  status: z.enum(['active', 'disabled', 'lost', 'returned']).optional(),
});

const assignBadgeSchema = z.object({
  assignedToId: z.string().uuid(),
  assignmentType: z.enum(['member', 'event']),
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'disabled', 'lost', 'returned']),
});

// GET /api/badges - List badges with filters
// Add ?details=true to include member names and last scan info
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as BadgeStatus | undefined;
    const assignmentType = req.query.assignmentType as BadgeAssignmentType | undefined;
    const includeDetails = req.query.details === 'true';

    const filters = { status, assignmentType };

    const badges = includeDetails
      ? await badgeRepository.findAllWithDetails(filters)
      : await badgeRepository.findAll(filters);

    res.json({ badges });
  } catch (err) {
    next(err);
  }
});

// GET /api/badges/by-serial/:serialNumber - Get badge by serial number
router.get('/by-serial/:serialNumber', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { serialNumber } = req.params;

    const badge = await badgeRepository.findBySerialNumber(serialNumber);
    if (!badge) {
      throw new NotFoundError(
        'Badge not found',
        `Badge with serial number ${serialNumber} not found`,
        'Please check the serial number and try again.'
      );
    }

    res.json({ badge });
  } catch (err) {
    next(err);
  }
});

// POST /api/badges - Register new badge
router.post('/', requireAuth, requireRole('admin'), audit('badge_create', 'badge'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createBadgeSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid badge data',
        validationResult.error.message,
        'Please check all required fields and try again.'
      );
    }

    const data = validationResult.data;

    // Check if badge serial number already exists
    const existing = await badgeRepository.findBySerialNumber(data.serialNumber);
    if (existing) {
      throw new ConflictError(
        'Badge serial number already exists',
        `Badge with serial number ${data.serialNumber} already exists`,
        'Badge serial numbers must be unique. This badge may already be registered.'
      );
    }

    const badge = await badgeRepository.create({
      serialNumber: data.serialNumber,
      status: data.status,
      assignmentType: 'unassigned',
    });

    res.status(201).json({ badge });
  } catch (err) {
    next(err);
  }
});

// PUT /api/badges/:id/assign - Assign badge to member or event
router.put('/:id/assign', requireAuth, requireRole('admin'), audit('badge_assign', 'badge'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const validationResult = assignBadgeSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid assignment data',
        validationResult.error.message,
        'Please check the assigned member ID and assignment type.'
      );
    }

    const { assignedToId, assignmentType } = validationResult.data;

    // Use service for member assignments (handles both badge and member record updates)
    // Use repository directly for event assignments
    const badge = assignmentType === 'member'
      ? await badgeService.assign(id, assignedToId)
      : await badgeRepository.assign(id, assignedToId, assignmentType);

    res.json({ badge });
  } catch (err) {
    next(err);
  }
});

// PUT /api/badges/:id/unassign - Unassign badge
router.put('/:id/unassign', requireAuth, requireRole('admin'), audit('badge_unassign', 'badge'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Service handles validation and clears member.badgeId if assigned to member
    const badge = await badgeService.unassign(id);

    res.json({ badge });
  } catch (err) {
    next(err);
  }
});

// PUT /api/badges/:id/status - Update badge status
// Auto-unassigns badge when marked as 'lost'
router.put('/:id/status', requireAuth, requireRole('admin'), audit('badge_status_change', 'badge'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const validationResult = updateStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid status data',
        validationResult.error.message,
        'Please provide a valid badge status.'
      );
    }

    const { status } = validationResult.data;

    // Service handles validation and auto-unassign on 'lost'
    const badge = await badgeService.updateStatus(id, status);

    res.json({ badge });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/badges/:id - Delete a badge
router.delete('/:id', requireAuth, requireRole('admin'), audit('badge_delete', 'badge'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if badge exists
    const badge = await badgeRepository.findById(id);
    if (!badge) {
      throw new NotFoundError(
        'Badge not found',
        `Badge ${id} not found`,
        'Please check the badge ID and try again.'
      );
    }

    // Prevent deleting assigned badges
    if (badge.assignmentType !== 'unassigned') {
      throw new ConflictError(
        'Cannot delete assigned badge',
        `Badge ${id} is currently assigned`,
        'Please unassign this badge before deleting it.'
      );
    }

    await badgeRepository.delete(id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export { router as badgeRoutes };
