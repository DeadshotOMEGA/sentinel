import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { badgeRepository } from '../db/repositories/badge-repository';
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
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as BadgeStatus | undefined;
    const assignmentType = req.query.assignmentType as BadgeAssignmentType | undefined;

    const badges = await badgeRepository.findAll({
      status,
      assignmentType,
    });

    res.json({ badges });
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

// PUT /api/badges/:id/assign - Assign badge to member
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

    // Check if badge exists
    const existing = await badgeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Badge not found',
        `Badge ${id} not found`,
        'Please check the badge ID and try again.'
      );
    }

    // Check if badge is already assigned
    if (existing.assignmentType !== 'unassigned' && existing.assignedToId) {
      throw new ConflictError(
        'Badge already assigned',
        `Badge ${id} is already assigned to ${existing.assignedToId}`,
        'This badge is already assigned. Please unassign it first before reassigning.'
      );
    }

    const badge = await badgeRepository.assign(id, assignedToId, assignmentType);

    res.json({ badge });
  } catch (err) {
    next(err);
  }
});

// PUT /api/badges/:id/unassign - Unassign badge
router.put('/:id/unassign', requireAuth, requireRole('admin'), audit('badge_unassign', 'badge'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if badge exists
    const existing = await badgeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Badge not found',
        `Badge ${id} not found`,
        'Please check the badge ID and try again.'
      );
    }

    // Check if badge is already unassigned
    if (existing.assignmentType === 'unassigned') {
      throw new ConflictError(
        'Badge already unassigned',
        `Badge ${id} is already unassigned`,
        'This badge is not currently assigned to anyone.'
      );
    }

    const badge = await badgeRepository.unassign(id);

    res.json({ badge });
  } catch (err) {
    next(err);
  }
});

// PUT /api/badges/:id/status - Update badge status
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

    // Check if badge exists
    const existing = await badgeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Badge not found',
        `Badge ${id} not found`,
        'Please check the badge ID and try again.'
      );
    }

    const badge = await badgeRepository.updateStatus(id, status);

    res.json({ badge });
  } catch (err) {
    next(err);
  }
});

export { router as badgeRoutes };
