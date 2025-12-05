import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { requireAuth, requireRole } from '../auth';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

// Validation schemas for each settings category
const scheduleSettingsSchema = z.object({
  trainingNightDay: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
  trainingNightStart: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  trainingNightEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  adminNightDay: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
  adminNightStart: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  adminNightEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
});

const workingHoursSettingsSchema = z.object({
  regularWeekdayStart: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  regularWeekdayEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  regularWeekdays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])),
  summerStartDate: z.string().regex(/^\d{2}-\d{2}$/, 'Date must be in MM-DD format'),
  summerEndDate: z.string().regex(/^\d{2}-\d{2}$/, 'Date must be in MM-DD format'),
  summerWeekdayStart: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  summerWeekdayEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
});

const thresholdSettingsSchema = z.object({
  warningThreshold: z.number().min(0).max(100),
  criticalThreshold: z.number().min(0).max(100),
  showThresholdFlags: z.boolean(),
  bmqSeparateThresholds: z.boolean(),
  bmqWarningThreshold: z.number().min(0).max(100),
  bmqCriticalThreshold: z.number().min(0).max(100),
}).refine(data => data.warningThreshold > data.criticalThreshold, {
  message: 'Warning threshold must be greater than critical threshold',
});

const memberHandlingSettingsSchema = z.object({
  newMemberGracePeriod: z.number().min(0).max(52),  // weeks
  minimumTrainingNights: z.number().min(1).max(20),
  includeFTStaff: z.boolean(),
  showBMQBadge: z.boolean(),
  showTrendIndicators: z.boolean(),
});

const formattingSettingsSchema = z.object({
  defaultSortOrder: z.enum(['division_rank', 'rank', 'alphabetical']),
  showServiceNumber: z.boolean(),
  dateFormat: z.enum(['DD MMM YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']),
  pageSize: z.enum(['letter', 'a4']),
});

// Map of setting keys to their validation schemas
const settingsSchemas: Record<string, z.ZodSchema> = {
  schedule: scheduleSettingsSchema,
  working_hours: workingHoursSettingsSchema,
  thresholds: thresholdSettingsSchema,
  member_handling: memberHandlingSettingsSchema,
  formatting: formattingSettingsSchema,
};

// GET /api/report-settings - Get all settings
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT key, value, updated_at FROM report_settings');

    // Convert to object map
    const settings: Record<string, { value: unknown; updatedAt: Date }> = {};
    for (const row of result.rows) {
      settings[row.key] = {
        value: row.value,
        updatedAt: row.updated_at,
      };
    }

    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// GET /api/report-settings/:key - Get specific setting
router.get('/:key', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;

    const result = await pool.query(
      'SELECT key, value, updated_at FROM report_settings WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError(
        `Setting not found: ${key}`,
        `The setting key "${key}" does not exist in the database.`,
        'Please check the setting key and try again. Valid keys are: schedule, working_hours, thresholds, member_handling, formatting.'
      );
    }

    res.json({
      setting: {
        key: result.rows[0].key,
        value: result.rows[0].value,
        updatedAt: result.rows[0].updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/report-settings/:key - Update specific setting
router.put('/:key', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      throw new ValidationError(
        'Value is required',
        'The request body must contain a "value" field.',
        'Please provide a "value" field in the request body with the setting data.'
      );
    }

    // Validate against schema if one exists for this key
    const schema = settingsSchemas[key];
    if (schema) {
      const validation = schema.safeParse(value);
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        throw new ValidationError(
          'Invalid setting value',
          firstError.message,
          `Please check the "${firstError.path.join('.')}" field and ensure it matches the expected format.`
        );
      }
    }

    // Check if setting exists
    const existing = await pool.query(
      'SELECT key FROM report_settings WHERE key = $1',
      [key]
    );

    if (existing.rows.length === 0) {
      // Create new setting
      await pool.query(
        'INSERT INTO report_settings (key, value) VALUES ($1, $2)',
        [key, JSON.stringify(value)]
      );
    } else {
      // Update existing
      await pool.query(
        'UPDATE report_settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [JSON.stringify(value), key]
      );
    }

    const result = await pool.query(
      'SELECT key, value, updated_at FROM report_settings WHERE key = $1',
      [key]
    );

    res.json({
      setting: {
        key: result.rows[0].key,
        value: result.rows[0].value,
        updatedAt: result.rows[0].updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/report-settings/bulk - Bulk update settings
router.put('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      throw new ValidationError(
        'Settings object is required',
        'The request body must contain a "settings" object.',
        'Please provide a "settings" object in the request body with key-value pairs to update.'
      );
    }

    const errors: string[] = [];
    const updated: string[] = [];

    // Validate all settings first
    for (const [key, value] of Object.entries(settings)) {
      const schema = settingsSchemas[key];
      if (schema) {
        const validation = schema.safeParse(value);
        if (!validation.success) {
          errors.push(`${key}: ${validation.error.errors[0].message}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        'Validation errors occurred',
        errors.join('; '),
        'Please fix the validation errors and try again.'
      );
    }

    // Update all settings in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO report_settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, JSON.stringify(value)]
        );
        updated.push(key);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      updated,
      message: `Updated ${updated.length} setting(s)`,
    });
  } catch (err) {
    next(err);
  }
});

export { router as reportSettingsRoutes };
