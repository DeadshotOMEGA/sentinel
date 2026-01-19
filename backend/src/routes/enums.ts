import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { visitTypeRepository } from '../db/repositories/visit-type-repository';
import { memberStatusRepository } from '../db/repositories/member-status-repository';
import { memberTypeRepository } from '../db/repositories/member-type-repository';
import { badgeStatusRepository } from '../db/repositories/badge-status-repository';
import { requireAuth, requireRole } from '../auth';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';

const router = Router();

// Validation schemas - shared across all enum types
const createEnumSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Code must be lowercase alphanumeric with underscores only'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateEnumSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Code must be lowercase alphanumeric with underscores only')
    .optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

// ==================== Visit Types ====================

// GET /api/enums/visit-types - List all visit types with usage counts
router.get('/visit-types', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await visitTypeRepository.findAll();
    const visitTypes = await Promise.all(
      items.map(async (item) => ({
        ...item,
        usageCount: await visitTypeRepository.getUsageCount(item.id),
      }))
    );
    res.json({ visitTypes });
  } catch (err) {
    next(err);
  }
});

// POST /api/enums/visit-types - Create visit type
router.post(
  '/visit-types',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = createEnumSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid visit type data',
          validationResult.error.message,
          'Please check all required fields and try again.'
        );
      }

      const data = validationResult.data;

      // Check if code already exists
      const existing = await visitTypeRepository.findByCode(data.code);
      if (existing) {
        throw new ConflictError(
          'Visit type code already exists',
          `Visit type code "${data.code}" already exists`,
          'Codes must be unique. Please use a different code.'
        );
      }

      const visitType = await visitTypeRepository.create(data);

      res.status(201).json({ visitType });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/enums/visit-types/:id - Update visit type
router.put(
  '/visit-types/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = updateEnumSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid visit type data',
          validationResult.error.message,
          'Please check all fields and try again.'
        );
      }

      const data = validationResult.data;

      // Check if visit type exists
      const existing = await visitTypeRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(
          'Visit type not found',
          `Visit type ${id} not found`,
          'Please check the visit type ID and try again.'
        );
      }

      // If updating code, check for conflicts
      if (data.code && data.code !== existing.code) {
        const conflict = await visitTypeRepository.findByCode(data.code);
        if (conflict) {
          throw new ConflictError(
            'Visit type code already exists',
            `Visit type code "${data.code}" already exists`,
            'Codes must be unique. Please use a different code.'
          );
        }
      }

      const visitType = await visitTypeRepository.update(id, data);

      res.json({ visitType });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/enums/visit-types/:id - Delete visit type
router.delete(
  '/visit-types/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Check if visit type exists
      const existing = await visitTypeRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(
          'Visit type not found',
          `Visit type ${id} not found`,
          'Please check the visit type ID and try again.'
        );
      }

      // Check usage count
      const usageCount = await visitTypeRepository.getUsageCount(id);
      if (usageCount > 0) {
        throw new ConflictError(
          'Cannot delete visit type',
          `Cannot delete this visit type. It is currently in use by ${usageCount} records.`,
          'Remove or reassign all records using this visit type before deleting.'
        );
      }

      await visitTypeRepository.delete(id);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ==================== Member Statuses ====================

// GET /api/enums/member-statuses - List all member statuses with usage counts
router.get('/member-statuses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await memberStatusRepository.findAll();
    const memberStatuses = await Promise.all(
      items.map(async (item) => ({
        ...item,
        usageCount: await memberStatusRepository.getUsageCount(item.id),
      }))
    );
    res.json({ memberStatuses });
  } catch (err) {
    next(err);
  }
});

// POST /api/enums/member-statuses - Create member status
router.post(
  '/member-statuses',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = createEnumSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid member status data',
          validationResult.error.message,
          'Please check all required fields and try again.'
        );
      }

      const data = validationResult.data;

      // Check if code already exists
      const existing = await memberStatusRepository.findByCode(data.code);
      if (existing) {
        throw new ConflictError(
          'Member status code already exists',
          `Member status code "${data.code}" already exists`,
          'Codes must be unique. Please use a different code.'
        );
      }

      const memberStatus = await memberStatusRepository.create(data);

      res.status(201).json({ memberStatus });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/enums/member-statuses/:id - Update member status
router.put(
  '/member-statuses/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = updateEnumSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid member status data',
          validationResult.error.message,
          'Please check all fields and try again.'
        );
      }

      const data = validationResult.data;

      // Check if member status exists
      const existing = await memberStatusRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(
          'Member status not found',
          `Member status ${id} not found`,
          'Please check the member status ID and try again.'
        );
      }

      // If updating code, check for conflicts
      if (data.code && data.code !== existing.code) {
        const conflict = await memberStatusRepository.findByCode(data.code);
        if (conflict) {
          throw new ConflictError(
            'Member status code already exists',
            `Member status code "${data.code}" already exists`,
            'Codes must be unique. Please use a different code.'
          );
        }
      }

      const memberStatus = await memberStatusRepository.update(id, data);

      res.json({ memberStatus });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/enums/member-statuses/:id - Delete member status
router.delete(
  '/member-statuses/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Check if member status exists
      const existing = await memberStatusRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(
          'Member status not found',
          `Member status ${id} not found`,
          'Please check the member status ID and try again.'
        );
      }

      // Check usage count
      const usageCount = await memberStatusRepository.getUsageCount(id);
      if (usageCount > 0) {
        throw new ConflictError(
          'Cannot delete member status',
          `Cannot delete this member status. It is currently in use by ${usageCount} records.`,
          'Remove or reassign all records using this member status before deleting.'
        );
      }

      await memberStatusRepository.delete(id);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ==================== Member Types ====================

// GET /api/enums/member-types - List all member types with usage counts
router.get('/member-types', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await memberTypeRepository.findAll();
    const memberTypes = await Promise.all(
      items.map(async (item) => ({
        ...item,
        usageCount: await memberTypeRepository.getUsageCount(item.id),
      }))
    );
    res.json({ memberTypes });
  } catch (err) {
    next(err);
  }
});

// POST /api/enums/member-types - Create member type
router.post(
  '/member-types',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = createEnumSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid member type data',
          validationResult.error.message,
          'Please check all required fields and try again.'
        );
      }

      const data = validationResult.data;

      // Check if code already exists
      const existing = await memberTypeRepository.findByCode(data.code);
      if (existing) {
        throw new ConflictError(
          'Member type code already exists',
          `Member type code "${data.code}" already exists`,
          'Codes must be unique. Please use a different code.'
        );
      }

      const memberType = await memberTypeRepository.create(data);

      res.status(201).json({ memberType });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/enums/member-types/:id - Update member type
router.put(
  '/member-types/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = updateEnumSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid member type data',
          validationResult.error.message,
          'Please check all fields and try again.'
        );
      }

      const data = validationResult.data;

      // Check if member type exists
      const existing = await memberTypeRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(
          'Member type not found',
          `Member type ${id} not found`,
          'Please check the member type ID and try again.'
        );
      }

      // If updating code, check for conflicts
      if (data.code && data.code !== existing.code) {
        const conflict = await memberTypeRepository.findByCode(data.code);
        if (conflict) {
          throw new ConflictError(
            'Member type code already exists',
            `Member type code "${data.code}" already exists`,
            'Codes must be unique. Please use a different code.'
          );
        }
      }

      const memberType = await memberTypeRepository.update(id, data);

      res.json({ memberType });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/enums/member-types/:id - Delete member type
router.delete(
  '/member-types/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Check if member type exists
      const existing = await memberTypeRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(
          'Member type not found',
          `Member type ${id} not found`,
          'Please check the member type ID and try again.'
        );
      }

      // Check usage count
      const usageCount = await memberTypeRepository.getUsageCount(id);
      if (usageCount > 0) {
        throw new ConflictError(
          'Cannot delete member type',
          `Cannot delete this member type. It is currently in use by ${usageCount} records.`,
          'Remove or reassign all records using this member type before deleting.'
        );
      }

      await memberTypeRepository.delete(id);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ==================== Badge Statuses ====================

// GET /api/enums/badge-statuses - List all badge statuses with usage counts
router.get('/badge-statuses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await badgeStatusRepository.findAll();
    const badgeStatuses = await Promise.all(
      items.map(async (item) => ({
        ...item,
        usageCount: await badgeStatusRepository.getUsageCount(item.id),
      }))
    );
    res.json({ badgeStatuses });
  } catch (err) {
    next(err);
  }
});

// POST /api/enums/badge-statuses - Create badge status
router.post(
  '/badge-statuses',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = createEnumSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid badge status data',
          validationResult.error.message,
          'Please check all required fields and try again.'
        );
      }

      const data = validationResult.data;

      // Check if code already exists
      const existing = await badgeStatusRepository.findByCode(data.code);
      if (existing) {
        throw new ConflictError(
          'Badge status code already exists',
          `Badge status code "${data.code}" already exists`,
          'Codes must be unique. Please use a different code.'
        );
      }

      const badgeStatus = await badgeStatusRepository.create(data);

      res.status(201).json({ badgeStatus });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/enums/badge-statuses/:id - Update badge status
router.put(
  '/badge-statuses/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = updateEnumSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid badge status data',
          validationResult.error.message,
          'Please check all fields and try again.'
        );
      }

      const data = validationResult.data;

      // Check if badge status exists
      const existing = await badgeStatusRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(
          'Badge status not found',
          `Badge status ${id} not found`,
          'Please check the badge status ID and try again.'
        );
      }

      // If updating code, check for conflicts
      if (data.code && data.code !== existing.code) {
        const conflict = await badgeStatusRepository.findByCode(data.code);
        if (conflict) {
          throw new ConflictError(
            'Badge status code already exists',
            `Badge status code "${data.code}" already exists`,
            'Codes must be unique. Please use a different code.'
          );
        }
      }

      const badgeStatus = await badgeStatusRepository.update(id, data);

      res.json({ badgeStatus });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/enums/badge-statuses/:id - Delete badge status
router.delete(
  '/badge-statuses/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Check if badge status exists
      const existing = await badgeStatusRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(
          'Badge status not found',
          `Badge status ${id} not found`,
          'Please check the badge status ID and try again.'
        );
      }

      // Check usage count
      const usageCount = await badgeStatusRepository.getUsageCount(id);
      if (usageCount > 0) {
        throw new ConflictError(
          'Cannot delete badge status',
          `Cannot delete this badge status. It is currently in use by ${usageCount} records.`,
          'Remove or reassign all records using this badge status before deleting.'
        );
      }

      await badgeStatusRepository.delete(id);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export { router as enumRoutes };
