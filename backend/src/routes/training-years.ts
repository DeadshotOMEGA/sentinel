import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { requireAuth, requireRole } from '../auth';
import { NotFoundError, ValidationError } from '../utils/errors';
import type { TrainingYear, HolidayExclusion } from '../../../shared/types';

const router = Router();

// Validation schemas
const holidayExclusionSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  name: z.string().min(1).max(100)
});

const trainingYearBaseSchema = z.object({
  name: z.string().min(1).max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  holidayExclusions: z.array(holidayExclusionSchema).default([]),
  isCurrent: z.boolean().default(false)
});

const createTrainingYearSchema = trainingYearBaseSchema.refine(
  data => new Date(data.startDate) < new Date(data.endDate),
  { message: 'Start date must be before end date' }
);

const updateTrainingYearSchema = trainingYearBaseSchema.partial().refine(
  data => {
    // Only validate dates if both are present
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

// Convert snake_case DB row to camelCase TrainingYear
function toTrainingYear(row: Record<string, unknown>): TrainingYear {
  return {
    id: row.id as string,
    name: row.name as string,
    startDate: new Date(row.start_date as string),
    endDate: new Date(row.end_date as string),
    holidayExclusions: (row.holiday_exclusions as HolidayExclusion[]) || [],
    isCurrent: row.is_current as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string)
  };
}

// GET /api/training-years - List all training years
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      'SELECT * FROM training_years ORDER BY start_date DESC'
    );

    const trainingYears = result.rows.map(toTrainingYear);
    res.json({ trainingYears });
  } catch (err) {
    next(err);
  }
});

// GET /api/training-years/current - Get current training year
router.get('/current', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      'SELECT * FROM training_years WHERE is_current = true LIMIT 1'
    );

    if (result.rows.length === 0) {
      throw new NotFoundError(
        'No current training year set',
        'No training year is marked as current in the database',
        'Please set a training year as current using the admin interface or API.'
      );
    }

    res.json({ trainingYear: toTrainingYear(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// GET /api/training-years/:id - Get specific training year
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM training_years WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError(
        'Training year not found',
        `Training year ${id} not found`,
        'Please check the training year ID and try again.'
      );
    }

    res.json({ trainingYear: toTrainingYear(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// POST /api/training-years - Create new training year
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createTrainingYearSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid training year data',
        validation.error.errors[0].message,
        'Please check all required fields and try again.'
      );
    }

    const { name, startDate, endDate, holidayExclusions, isCurrent } = validation.data;

    const result = await pool.query(
      `INSERT INTO training_years (name, start_date, end_date, holiday_exclusions, is_current)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, startDate, endDate, JSON.stringify(holidayExclusions), isCurrent]
    );

    res.status(201).json({ trainingYear: toTrainingYear(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/training-years/:id - Update training year
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const validation = updateTrainingYearSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid training year data',
        validation.error.errors[0].message,
        'Please check all fields and try again.'
      );
    }

    // Check if training year exists
    const existing = await pool.query(
      'SELECT * FROM training_years WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw new NotFoundError(
        'Training year not found',
        `Training year ${id} not found`,
        'Please check the training year ID and try again.'
      );
    }

    const updates = validation.data;
    const setClauses: string[] = [];
    const values: (string | boolean)[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.startDate !== undefined) {
      setClauses.push(`start_date = $${paramIndex++}`);
      values.push(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      setClauses.push(`end_date = $${paramIndex++}`);
      values.push(updates.endDate);
    }
    if (updates.holidayExclusions !== undefined) {
      setClauses.push(`holiday_exclusions = $${paramIndex++}`);
      values.push(JSON.stringify(updates.holidayExclusions));
    }
    if (updates.isCurrent !== undefined) {
      setClauses.push(`is_current = $${paramIndex++}`);
      values.push(updates.isCurrent);
    }

    if (setClauses.length === 0) {
      throw new ValidationError(
        'No fields to update',
        'No valid fields were provided for update',
        'Please provide at least one field to update.'
      );
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE training_years SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ trainingYear: toTrainingYear(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/training-years/:id/set-current - Set as current training year
router.put('/:id/set-current', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if training year exists
    const existing = await pool.query(
      'SELECT * FROM training_years WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw new NotFoundError(
        'Training year not found',
        `Training year ${id} not found`,
        'Please check the training year ID and try again.'
      );
    }

    // The trigger will automatically unset other current years
    const result = await pool.query(
      'UPDATE training_years SET is_current = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({ trainingYear: toTrainingYear(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/training-years/:id - Delete training year
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if training year exists and is not current
    const existing = await pool.query(
      'SELECT * FROM training_years WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw new NotFoundError(
        'Training year not found',
        `Training year ${id} not found`,
        'Please check the training year ID and try again.'
      );
    }

    if (existing.rows[0].is_current) {
      throw new ValidationError(
        'Cannot delete the current training year',
        'The training year is marked as current and cannot be deleted',
        'Set another year as current first, then delete this one.'
      );
    }

    await pool.query('DELETE FROM training_years WHERE id = $1', [id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as trainingYearRoutes };
