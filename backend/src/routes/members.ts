import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { memberRepository } from '../db/repositories/member-repository';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { importService } from '../services/import-service';
import { requireAuth, requireRole } from '../auth/middleware';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { audit } from '../middleware/audit';
import { pool } from '../db/connection';
import type {
  MemberType,
  MemberStatus,
  CreateMemberInput,
  UpdateMemberInput,
  MemberWithDivision,
} from '../../../shared/types';
import type { PaginatedResponse } from '../../../shared/types/api';
import type {
  BMQEnrollmentWithCourse,
  BMQEnrollmentStatus,
} from '../../../shared/types/reports';

const router = Router();

// Validation schemas
const createMemberSchema = z.object({
  serviceNumber: z.string().min(1).max(20),
  employeeNumber: z.string().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  initials: z.string().optional(),
  rank: z.string().min(1).max(50),
  divisionId: z.string().uuid(),
  mess: z.string().optional(),
  moc: z.string().optional(),
  memberType: z.enum(['class_a', 'class_b', 'class_c', 'reg_force']),
  classDetails: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending_review']).optional(),
  email: z.string().email().optional(),
  homePhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  badgeId: z.string().uuid().optional(),
});

const updateMemberSchema = z.object({
  serviceNumber: z.string().min(1).max(20).optional(),
  employeeNumber: z.string().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  initials: z.string().optional(),
  rank: z.string().min(1).max(50).optional(),
  divisionId: z.string().uuid().optional(),
  mess: z.string().optional(),
  moc: z.string().optional(),
  memberType: z.enum(['class_a', 'class_b', 'class_c', 'reg_force']).optional(),
  classDetails: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending_review']).optional(),
  email: z.string().email().optional(),
  homePhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  badgeId: z.string().uuid().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['lastName', 'firstName', 'rank', 'status', 'serviceNumber']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  all: z.string().optional(),
});

// GET /api/members - List members with filters and pagination
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse pagination params
    const paginationResult = paginationSchema.safeParse(req.query);
    if (!paginationResult.success) {
      throw new ValidationError(
        'Invalid pagination parameters',
        paginationResult.error.message,
        'Please check pagination parameters (page >= 1, limit 1-100).'
      );
    }

    const { page, limit, sortBy, sortOrder, all } = paginationResult.data;

    // Parse filters
    const divisionId = req.query.divisionId as string | undefined;
    const memberType = req.query.memberType as MemberType | undefined;
    const status = req.query.status as MemberStatus | undefined;
    const search = req.query.search as string | undefined;

    const filters = {
      divisionId,
      memberType,
      status,
      search,
    };

    // Backward compatibility: if 'all=true' is specified, return all members without pagination
    if (all === 'true') {
      const members = await memberRepository.findAll(filters);
      res.json({ members });
      return;
    }

    // Use paginated query
    const { members, total } = await memberRepository.findPaginated(
      { page, limit, sortBy, sortOrder },
      filters
    );

    const totalPages = Math.ceil(total / limit);
    const response: PaginatedResponse<MemberWithDivision> = {
      data: members,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    res.json(response);
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
router.post('/', requireAuth, requireRole('admin'), audit('member_create', 'member'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createMemberSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid member data',
        validationResult.error.message,
        'Please check all required fields and try again.'
      );
    }

    const data = validationResult.data as CreateMemberInput;

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
router.put('/:id', requireAuth, requireRole('admin'), audit('member_update', 'member'), async (req: Request, res: Response, next: NextFunction) => {
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

    const data = validationResult.data as UpdateMemberInput;

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
router.delete('/:id', requireAuth, requireRole('admin'), audit('member_delete', 'member'), async (req: Request, res: Response, next: NextFunction) => {
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

// GET /api/members/:id/history - Get member's checkin history with pagination
router.get('/:id/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Parse pagination params
    const historyPaginationSchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      sortBy: z.enum(['timestamp', 'direction']).optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      all: z.string().optional(),
    });

    const paginationResult = historyPaginationSchema.safeParse(req.query);
    if (!paginationResult.success) {
      throw new ValidationError(
        'Invalid pagination parameters',
        paginationResult.error.message,
        'Please check pagination parameters (page >= 1, limit 1-100).'
      );
    }

    const { page, limit, sortBy, sortOrder, all } = paginationResult.data;

    // Check if member exists
    const member = await memberRepository.findById(id);
    if (!member) {
      throw new NotFoundError(
        'Member not found',
        `Member ${id} not found`,
        'Please check the member ID and try again.'
      );
    }

    const filters = {
      memberId: id,
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
    };

    // Backward compatibility: if 'all=true' is specified, return all checkins without pagination
    if (all === 'true') {
      const checkins = await checkinRepository.findAll(filters);
      res.json({ checkins });
      return;
    }

    // Use paginated query
    const { checkins, total } = await checkinRepository.findPaginated(
      { page, limit, sortBy, sortOrder },
      filters
    );

    const totalPages = Math.ceil(total / limit);
    const response: PaginatedResponse<typeof checkins[0]> = {
      data: checkins,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/members/import/preview - Preview import changes
const importPreviewSchema = z.object({
  csv: z.string().min(1, 'CSV content is required'),
});

router.post(
  '/import/preview',
  requireAuth,
  requireRole('admin'),
  audit('import_preview', 'member'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = importPreviewSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid import data',
          validationResult.error.message,
          'Please provide valid CSV content.'
        );
      }

      const { csv } = validationResult.data;

      const preview = await importService.generatePreview(csv);

      res.json(preview);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/members/import/execute - Execute import
const importExecuteSchema = z.object({
  csv: z.string().min(1, 'CSV content is required'),
  deactivateIds: z.array(z.string().uuid()).optional(),
});

router.post(
  '/import/execute',
  requireAuth,
  requireRole('admin'),
  audit('import_execute', 'member'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = importExecuteSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid import data',
          validationResult.error.message,
          'Please provide valid CSV content and optional deactivate IDs.'
        );
      }

      const { csv, deactivateIds } = validationResult.data;

      const result = await importService.executeImport(csv, deactivateIds);

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/members/:id/bmq-enrollments - Get member's BMQ enrollments
router.get('/:id/bmq-enrollments', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if member exists
    const member = await memberRepository.findById(id);
    if (!member) {
      throw new NotFoundError(
        'Member not found',
        `Member ${id} not found`,
        'Please check the member ID and try again.'
      );
    }

    const result = await pool.query(
      `
      SELECT
        e.*,
        c.id as course_id,
        c.name as course_name,
        c.start_date,
        c.end_date,
        c.training_day,
        c.training_start_time,
        c.training_end_time,
        c.is_active,
        c.created_at as course_created_at,
        c.updated_at as course_updated_at
      FROM bmq_enrollments e
      INNER JOIN bmq_courses c ON e.bmq_course_id = c.id
      WHERE e.member_id = $1
      ORDER BY c.start_date DESC
      `,
      [id]
    );

    const enrollments: BMQEnrollmentWithCourse[] = result.rows.map((row) => ({
      id: row.id,
      memberId: row.member_id,
      bmqCourseId: row.bmq_course_id,
      enrolledAt: row.enrolled_at,
      completedAt: row.completed_at,
      status: row.status as BMQEnrollmentStatus,
      course: {
        id: row.course_id,
        name: row.course_name,
        startDate: row.start_date,
        endDate: row.end_date,
        trainingDay: row.training_day,
        trainingStartTime: row.training_start_time,
        trainingEndTime: row.training_end_time,
        isActive: row.is_active,
        createdAt: row.course_created_at,
        updatedAt: row.course_updated_at,
      },
    }));

    res.json({ enrollments });
  } catch (err) {
    next(err);
  }
});

export { router as memberRoutes };
