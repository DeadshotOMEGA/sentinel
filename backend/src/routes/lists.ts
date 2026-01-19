import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { listItemRepository } from '../db/repositories/list-item-repository';
import { requireAuth, requireRole } from '../auth';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import type { ListType } from '../../../shared/types';

const router = Router();

// Valid list types
const VALID_LIST_TYPES: ListType[] = ['event_role', 'rank', 'mess', 'moc'];

// Validation schemas
const createListItemSchema = z.object({
  code: z.string().min(1).max(50).transform(v => v.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')),
  name: z.string().min(1).max(200).transform(v => v.trim()),
  displayOrder: z.number().optional(),
  description: z.string().max(500).optional(),
  isSystem: z.boolean().optional().default(false),
});

const updateListItemSchema = z.object({
  code: z.string().min(1).max(50).transform(v => v.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')).optional(),
  name: z.string().min(1).max(200).transform(v => v.trim()).optional(),
  displayOrder: z.number().optional(),
  description: z.string().max(500).optional(),
});

const reorderSchema = z.object({
  itemIds: z.array(z.string().uuid()),
});

/**
 * Validate list type parameter
 */
function validateListType(listType: string): ListType {
  if (!VALID_LIST_TYPES.includes(listType as ListType)) {
    throw new ValidationError(
      'Invalid list type',
      `List type must be one of: ${VALID_LIST_TYPES.join(', ')}`,
      'Please use a valid list type.'
    );
  }
  return listType as ListType;
}

// GET /:listType - List all items for a list type with usage counts
router.get('/:listType', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listType = validateListType(req.params.listType);
    const items = await listItemRepository.findByType(listType);

    // Add usage count to each item
    const itemsWithUsage = await Promise.all(
      items.map(async (item) => {
        const usageCount = await listItemRepository.getUsageCount(item.id);
        return { ...item, usageCount };
      })
    );

    res.json({ items: itemsWithUsage });
  } catch (err) {
    next(err);
  }
});

// POST /:listType - Create a new list item
router.post('/:listType', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listType = validateListType(req.params.listType);

    const validationResult = createListItemSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid list item data',
        validationResult.error.message,
        'Please check all required fields and try again.'
      );
    }

    const data = validationResult.data;

    // Check for duplicates (same list_type + code)
    const existing = await listItemRepository.findByTypeAndCode(listType, data.code);
    if (existing) {
      throw new ConflictError(
        'List item already exists',
        `A list item with code "${data.code}" already exists in ${listType}`,
        'List item codes must be unique within each list type. Please use a different code.'
      );
    }

    const item = await listItemRepository.create(listType, data);

    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

// PUT /:listType/reorder - Reorder items in a list
router.put('/:listType/reorder', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listType = validateListType(req.params.listType);

    const validationResult = reorderSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid reorder data',
        validationResult.error.message,
        'Please provide an array of item IDs in the desired order.'
      );
    }

    const { itemIds } = validationResult.data;

    await listItemRepository.reorder(listType, itemIds);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /:listType/:id/usage - Get usage count for an item
router.get('/:listType/:id/usage', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateListType(req.params.listType);
    const { id } = req.params;

    const item = await listItemRepository.findById(id);
    if (!item) {
      throw new NotFoundError(
        'List item not found',
        `List item ${id} not found`,
        'Please check the item ID and try again.'
      );
    }

    const usageCount = await listItemRepository.getUsageCount(id);

    res.json({ usageCount });
  } catch (err) {
    next(err);
  }
});

// PUT /:listType/:id - Update an existing list item
router.put('/:listType/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listType = validateListType(req.params.listType);
    const { id } = req.params;

    const validationResult = updateListItemSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid list item data',
        validationResult.error.message,
        'Please check all fields and try again.'
      );
    }

    const data = validationResult.data;

    // Check if item exists
    const existing = await listItemRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'List item not found',
        `List item ${id} not found`,
        'Please check the item ID and try again.'
      );
    }

    // If updating code, check for duplicates
    if (data.code && data.code !== existing.code) {
      const conflict = await listItemRepository.findByTypeAndCode(listType, data.code);
      if (conflict) {
        throw new ConflictError(
          'List item already exists',
          `A list item with code "${data.code}" already exists in ${listType}`,
          'List item codes must be unique within each list type. Please use a different code.'
        );
      }
    }

    const item = await listItemRepository.update(id, data);

    res.json({ item });
  } catch (err) {
    next(err);
  }
});

// DELETE /:listType/:id - Delete a list item
router.delete('/:listType/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateListType(req.params.listType);
    const { id } = req.params;

    // Check if item exists
    const existing = await listItemRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'List item not found',
        `List item ${id} not found`,
        'Please check the item ID and try again.'
      );
    }

    // Cannot delete system items
    if (existing.isSystem) {
      throw new ValidationError(
        'Cannot delete system items',
        'Cannot delete system items.',
        'System items are protected and cannot be deleted. You can rename them instead.'
      );
    }

    // Check usage count
    const usageCount = await listItemRepository.getUsageCount(id);
    if (usageCount > 0) {
      throw new ConflictError(
        'Item in use',
        `Cannot delete this item. It is currently in use by ${usageCount} records.`,
        'You must first reassign or delete the records using this item before you can delete it.'
      );
    }

    await listItemRepository.delete(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as listRoutes };
