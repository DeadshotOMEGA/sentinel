import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { memberRepository } from '../db/repositories/member-repository';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { requireAuth, requireRole } from '../auth';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import type { MemberType, MemberStatus } from '../../../shared/types';

const router = Router();

// Validation schemas
const createMemberSchema = z.object({
  serviceNumber: z.string().min(1).max(20),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  rank: z.string().min(1).max(50),
  divisionId: z.string().uuid(),
  memberType: z.enum(['full-time', 'reserve', 'event-attendee']),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  badgeId: z.string().uuid().optional(),
});

const updateMemberSchema = z.object({
  serviceNumber: z.string().min(1).max(20).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  rank: z.string().min(1).max(50).optional(),
  divisionId: z.string().uuid().optional(),
  memberType: z.enum(['full-time', 'reserve', 'event-attendee']).optional(),
  status: z.enum(['active', 'inactive', 'leave']).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  badgeId: z.string().uuid().optional(),
});

// GET /api/members - List members with filters
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const divisionId = req.query.divisionId as string | undefined;
    const memberType = req.query.memberType as MemberType | undefined;
    const status = req.query.status as MemberStatus | undefined;
    const search = req.query.search as string | undefined;

    const members = await memberRepository.findAll({
      divisionId,
      memberType,
      status,
      search,
    });

    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// GET /api/members/:id - Get single member
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const member = await memberRepository.findById(id);
    if (!member) {
      throw new NotFoundError(
        'Member not found',
        `Member ${id} not found`,
        'Please check the member ID and try again.'
      );
    }

    res.json({ member });
  } catch (err) {
    next(err);
  }
});

// POST /api/members - Create member
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createMemberSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid member data',
        validationResult.error.message,
        'Please check all required fields and try again.'
      );
    }

    const data = validationResult.data;

    // Check if service number already exists
    const existing = await memberRepository.findByServiceNumber(data.serviceNumber);
    if (existing) {
      throw new ConflictError(
        'Service number already exists',
        `Service number ${data.serviceNumber} already exists`,
        'Service numbers must be unique. Please use a different service number.'
      );
    }

    const member = await memberRepository.create(data);

    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
});

// PUT /api/members/:id - Update member
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const validationResult = updateMemberSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid member data',
        validationResult.error.message,
        'Please check all fields and try again.'
      );
    }

    const data = validationResult.data;

    // Check if member exists
    const existing = await memberRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Member not found',
        `Member ${id} not found`,
        'Please check the member ID and try again.'
      );
    }

    // If updating service number, check for conflicts
    if (data.serviceNumber && data.serviceNumber !== existing.serviceNumber) {
      const conflict = await memberRepository.findByServiceNumber(data.serviceNumber);
      if (conflict) {
        throw new ConflictError(
          'Service number already exists',
          `Service number ${data.serviceNumber} already exists`,
          'Service numbers must be unique. Please use a different service number.'
        );
      }
    }

    const member = await memberRepository.update(id, data);

    res.json({ member });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/members/:id - Soft delete (set inactive)
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if member exists
    const existing = await memberRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Member not found',
        `Member ${id} not found`,
        'Please check the member ID and try again.'
      );
    }

    await memberRepository.delete(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/members/:id/history - Get member's checkin history
router.get('/:id/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Check if member exists
    const member = await memberRepository.findById(id);
    if (!member) {
      throw new NotFoundError(
        'Member not found',
        `Member ${id} not found`,
        'Please check the member ID and try again.'
      );
    }

    const checkins = await checkinRepository.findAll({
      memberId: id,
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
    });

    res.json({ checkins });
  } catch (err) {
    next(err);
  }
});

export { router as memberRoutes };
