import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { tagRepository } from '../db/repositories/tag-repository';
import { requireAuth, requireRole } from '../auth/middleware';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { audit } from '../middleware/audit';
import type { CreateTagInput, UpdateTagInput } from '../../../shared/types';

const router = Router();

// Validation schemas
const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(1).max(50),
  description: z.string().optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
});

// GET /api/tags - List all tags
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await tagRepository.findAll();
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

// GET /api/tags/:id - Get single tag
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const tag = await tagRepository.findById(id);
    if (!tag) {
      throw new NotFoundError(
        'Tag not found',
        `Tag ${id} not found`,
        'Please check the tag ID and try again.'
      );
    }

    res.json({ tag });
  } catch (err) {
    next(err);
  }
});

// POST /api/tags - Create tag (admin only)
router.post('/', requireAuth, requireRole('admin'), audit('tag_create', 'tag'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createTagSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid tag data',
        validationResult.error.message,
        'Please check all required fields and try again.'
      );
    }

    const data = validationResult.data as CreateTagInput;

    // Check if tag name already exists
    const existing = await tagRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError(
        'Tag name already exists',
        `Tag name "${data.name}" already exists`,
        'Tag names must be unique. Please use a different name.'
      );
    }

    const tag = await tagRepository.create(data);

    res.status(201).json({ tag });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tags/:id - Update tag (admin only)
router.put('/:id', requireAuth, requireRole('admin'), audit('tag_update', 'tag'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const validationResult = updateTagSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid tag data',
        validationResult.error.message,
        'Please check all fields and try again.'
      );
    }

    const data = validationResult.data as UpdateTagInput;

    // Check if tag exists
    const existing = await tagRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Tag not found',
        `Tag ${id} not found`,
        'Please check the tag ID and try again.'
      );
    }

    // If updating name, check for conflicts
    if (data.name && data.name !== existing.name) {
      const conflict = await tagRepository.findByName(data.name);
      if (conflict) {
        throw new ConflictError(
          'Tag name already exists',
          `Tag name "${data.name}" already exists`,
          'Tag names must be unique. Please use a different name.'
        );
      }
    }

    const tag = await tagRepository.update(id, data);

    res.json({ tag });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tags/:id - Delete tag (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), audit('tag_delete', 'tag'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if tag exists
    const existing = await tagRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Tag not found',
        `Tag ${id} not found`,
        'Please check the tag ID and try again.'
      );
    }

    await tagRepository.delete(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as tagRoutes };
