import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { tagRepository } from '../db/repositories/tag-repository';
import { tagService } from '../services/tag-service';
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

const transferLockupSchema = z.object({
  toMemberId: z.string().uuid(),
  notes: z.string().optional(),
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

// GET /api/tags/lockup-holder - Get current Lockup tag holder (admin only)
// NOTE: This MUST come before /:id route to avoid matching "lockup-holder" as an ID
router.get('/lockup-holder', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[Lockup Holder API] Endpoint called');
    console.log('[Lockup Holder API] User:', req.user);
    const holder = await tagService.getCurrentLockupHolder();
    console.log('[Lockup Holder API] Holder result:', holder);
    res.json({ holder });
  } catch (err) {
    console.error('[Lockup Holder API] Error:', err);
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

// GET /api/tags/:id/usage - Get tag usage count
router.get('/:id/usage', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const usageCount = await tagRepository.getUsageCount(id);
    res.json({ usageCount });
  } catch (error) {
    next(error);
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

    // Check usage count before deletion
    const usageCount = await tagRepository.getUsageCount(id);
    if (usageCount > 0) {
      throw new ConflictError(`Cannot delete tag. Used by ${usageCount} ${usageCount === 1 ? 'member' : 'members'}.`);
    }

    await tagRepository.delete(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/tags/transfer-lockup - Transfer Lockup tag to another member (admin only)
router.post(
  '/transfer-lockup',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = transferLockupSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'INVALID_TRANSFER_DATA',
          validationResult.error.message,
          'Please provide a valid member ID to transfer the Lockup tag to.'
        );
      }

      if (!req.user) {
        throw new ValidationError(
          'UNAUTHORIZED',
          'User not authenticated',
          'You must be logged in to transfer the Lockup tag.'
        );
      }

      const result = await tagService.transferLockupTag(
        validationResult.data.toMemberId,
        req.user.id,
        'admin',
        validationResult.data.notes
      );

      if (!result) {
        res.json({
          success: false,
          message: 'No current Lockup holder found',
        });
        return;
      }

      res.json({
        success: result.success,
        previousHolder: result.previousHolder,
        newHolder: result.newHolder,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as tagRoutes };
