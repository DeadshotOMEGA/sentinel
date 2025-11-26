import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { divisionRepository } from '../db/repositories/division-repository';
import { requireAuth, requireRole } from '../auth';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';

const router = Router();

// Validation schemas
const createDivisionSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
});

const updateDivisionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
});

// GET /api/divisions - List all divisions
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const divisions = await divisionRepository.findAll();
    res.json({ divisions });
  } catch (err) {
    next(err);
  }
});

// POST /api/divisions - Create division
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createDivisionSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid division data',
        validationResult.error.message,
        'Please check all required fields and try again.'
      );
    }

    const data = validationResult.data;

    // Check if division code already exists
    const existing = await divisionRepository.findByCode(data.code);
    if (existing) {
      throw new ConflictError(
        'Division code already exists',
        `Division code ${data.code} already exists`,
        'Division codes must be unique. Please use a different code.'
      );
    }

    const division = await divisionRepository.create(data);

    res.status(201).json({ division });
  } catch (err) {
    next(err);
  }
});

// PUT /api/divisions/:id - Update division
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const validationResult = updateDivisionSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid division data',
        validationResult.error.message,
        'Please check all fields and try again.'
      );
    }

    const data = validationResult.data;

    // Check if division exists
    const existing = await divisionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Division not found',
        `Division ${id} not found`,
        'Please check the division ID and try again.'
      );
    }

    // If updating code, check for conflicts
    if (data.code && data.code !== existing.code) {
      const conflict = await divisionRepository.findByCode(data.code);
      if (conflict) {
        throw new ConflictError(
          'Division code already exists',
          `Division code ${data.code} already exists`,
          'Division codes must be unique. Please use a different code.'
        );
      }
    }

    const division = await divisionRepository.update(id, data);

    res.json({ division });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/divisions/:id - Delete division
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if division exists
    const existing = await divisionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Division not found',
        `Division ${id} not found`,
        'Please check the division ID and try again.'
      );
    }

    // The repository will check if there are assigned members
    await divisionRepository.delete(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as divisionRoutes };
