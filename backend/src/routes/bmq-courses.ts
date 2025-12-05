import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { requireAuth, requireRole } from '../auth/middleware';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { audit } from '../middleware/audit';
import type {
  BMQCourse,
  BMQEnrollment,
  BMQEnrollmentWithMember,
  BMQEnrollmentWithCourse,
  BMQEnrollmentStatus,
} from '../../../shared/types/reports';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const dayOfWeek = z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']);

const createCourseSchema = z.object({
  name: z.string().min(1).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trainingDays: z.array(dayOfWeek).min(1, 'At least one training day is required'),
  trainingStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  trainingEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean().default(true),
});

const updateCourseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  trainingDays: z.array(dayOfWeek).min(1, 'At least one training day is required').optional(),
  trainingStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  trainingEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isActive: z.boolean().optional(),
});

const createEnrollmentSchema = z.object({
  memberId: z.string().uuid(),
});

const updateEnrollmentSchema = z.object({
  status: z.enum(['enrolled', 'completed', 'withdrawn']),
  completedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert snake_case DB row to camelCase
 */
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

/**
 * Convert camelCase object to snake_case for DB
 */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// ============================================================================
// BMQ COURSE ROUTES
// ============================================================================

/**
 * GET /api/bmq-courses
 * List all BMQ courses with optional active filter
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeFilter = req.query.active as string | undefined;

    let query = `
      SELECT
        c.*,
        COUNT(e.id) as enrollment_count
      FROM bmq_courses c
      LEFT JOIN bmq_enrollments e ON c.id = e.bmq_course_id
    `;

    const params: unknown[] = [];

    if (activeFilter === 'true') {
      query += ' WHERE c.is_active = $1';
      params.push(true);
    } else if (activeFilter === 'false') {
      query += ' WHERE c.is_active = $1';
      params.push(false);
    }

    query += ' GROUP BY c.id ORDER BY c.start_date DESC';

    const result = await pool.query(query, params);

    const courses = result.rows.map((row) => {
      const camelRow = toCamelCase(row);
      return {
        ...camelRow,
        enrollmentCount: parseInt(row.enrollment_count as string, 10),
      };
    });

    res.json({ courses });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bmq-courses/:id
 * Get single BMQ course with enrollment count
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.*,
        COUNT(e.id) as enrollment_count
      FROM bmq_courses c
      LEFT JOIN bmq_enrollments e ON c.id = e.bmq_course_id
      WHERE c.id = $1
      GROUP BY c.id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError(
        'BMQ course not found',
        `BMQ course ${id} not found`,
        'Please check the course ID and try again.'
      );
    }

    const row = result.rows[0];
    const camelRow = toCamelCase(row);

    res.json({
      course: {
        ...camelRow,
        enrollmentCount: parseInt(row.enrollment_count as string, 10),
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bmq-courses
 * Create new BMQ course (admin only)
 */
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createCourseSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid BMQ course data',
        validationResult.error.message,
        'Please check all required fields and try again.'
      );
    }

    const data = validationResult.data;

    // Validate date range
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      throw new ValidationError(
        'Invalid date range',
        'Start date must be before end date',
        'Please ensure the start date is before the end date.'
      );
    }

    // Validate time range
    if (data.trainingStartTime >= data.trainingEndTime) {
      throw new ValidationError(
        'Invalid time range',
        'Training start time must be before end time',
        'Please ensure the training start time is before the end time.'
      );
    }

    const result = await pool.query(
      `
      INSERT INTO bmq_courses (
        name, start_date, end_date, training_days,
        training_start_time, training_end_time, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        data.name,
        data.startDate,
        data.endDate,
        data.trainingDays,
        data.trainingStartTime,
        data.trainingEndTime,
        data.isActive,
      ]
    );

    const course = toCamelCase(result.rows[0]);

    res.status(201).json({ course });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/bmq-courses/:id
 * Update BMQ course (admin only)
 */
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const validationResult = updateCourseSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid BMQ course data',
        validationResult.error.message,
        'Please check all fields and try again.'
      );
    }

    const data = validationResult.data;

    // Check if course exists
    const existingResult = await pool.query('SELECT * FROM bmq_courses WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      throw new NotFoundError(
        'BMQ course not found',
        `BMQ course ${id} not found`,
        'Please check the course ID and try again.'
      );
    }

    const existing = toCamelCase(existingResult.rows[0]) as unknown as BMQCourse;

    // Validate date range if dates are being updated
    const startDate = data.startDate || (existing.startDate instanceof Date ? existing.startDate.toISOString().split('T')[0] : existing.startDate);
    const endDate = data.endDate || (existing.endDate instanceof Date ? existing.endDate.toISOString().split('T')[0] : existing.endDate);

    if (new Date(startDate) >= new Date(endDate)) {
      throw new ValidationError(
        'Invalid date range',
        'Start date must be before end date',
        'Please ensure the start date is before the end date.'
      );
    }

    // Validate time range if times are being updated
    const startTime = data.trainingStartTime || existing.trainingStartTime;
    const endTime = data.trainingEndTime || existing.trainingEndTime;

    if (startTime >= endTime) {
      throw new ValidationError(
        'Invalid time range',
        'Training start time must be before end time',
        'Please ensure the training start time is before the end time.'
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.startDate !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(data.endDate);
    }
    if (data.trainingDays !== undefined) {
      updates.push(`training_days = $${paramIndex++}`);
      values.push(data.trainingDays);
    }
    if (data.trainingStartTime !== undefined) {
      updates.push(`training_start_time = $${paramIndex++}`);
      values.push(data.trainingStartTime);
    }
    if (data.trainingEndTime !== undefined) {
      updates.push(`training_end_time = $${paramIndex++}`);
      values.push(data.trainingEndTime);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    if (updates.length === 0) {
      throw new ValidationError(
        'No fields to update',
        'At least one field must be provided',
        'Please provide at least one field to update.'
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE bmq_courses SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    const course = toCamelCase(result.rows[0]);

    res.json({ course });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/bmq-courses/:id
 * Delete BMQ course and cascade delete enrollments (admin only)
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if course exists and get enrollment count
    const existingResult = await pool.query(
      `
      SELECT
        c.*,
        COUNT(e.id) as enrollment_count
      FROM bmq_courses c
      LEFT JOIN bmq_enrollments e ON c.id = e.bmq_course_id
      WHERE c.id = $1
      GROUP BY c.id
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      throw new NotFoundError(
        'BMQ course not found',
        `BMQ course ${id} not found`,
        'Please check the course ID and try again.'
      );
    }

    const enrollmentCount = parseInt(existingResult.rows[0].enrollment_count as string, 10);

    // Delete course (enrollments will cascade delete)
    await pool.query('DELETE FROM bmq_courses WHERE id = $1', [id]);

    res.status(200).json({
      message: 'BMQ course deleted successfully',
      enrollmentsDeleted: enrollmentCount,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// BMQ ENROLLMENT ROUTES
// ============================================================================

/**
 * GET /api/bmq-courses/:courseId/enrollments
 * Get all enrollments for a course with member details
 */
router.get('/:courseId/enrollments', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const courseResult = await pool.query('SELECT id FROM bmq_courses WHERE id = $1', [courseId]);
    if (courseResult.rows.length === 0) {
      throw new NotFoundError(
        'BMQ course not found',
        `BMQ course ${courseId} not found`,
        'Please check the course ID and try again.'
      );
    }

    const result = await pool.query(
      `
      SELECT
        e.*,
        m.id as member_id,
        m.service_number,
        m.first_name,
        m.last_name,
        m.rank,
        m.division_id
      FROM bmq_enrollments e
      INNER JOIN members m ON e.member_id = m.id
      WHERE e.bmq_course_id = $1
      ORDER BY m.last_name, m.first_name
      `,
      [courseId]
    );

    const enrollments: BMQEnrollmentWithMember[] = result.rows.map((row) => ({
      id: row.id,
      memberId: row.member_id,
      bmqCourseId: row.bmq_course_id,
      enrolledAt: row.enrolled_at,
      completedAt: row.completed_at,
      status: row.status as BMQEnrollmentStatus,
      member: {
        id: row.member_id,
        serviceNumber: row.service_number,
        firstName: row.first_name,
        lastName: row.last_name,
        rank: row.rank,
        divisionId: row.division_id,
      },
    }));

    res.json({ enrollments });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bmq-courses/:courseId/enrollments
 * Enroll a member in a BMQ course (admin only)
 */
router.post('/:courseId/enrollments', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;

    const validationResult = createEnrollmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid enrollment data',
        validationResult.error.message,
        'Please check all required fields and try again.'
      );
    }

    const { memberId } = validationResult.data;

    // Check if course exists
    const courseResult = await pool.query('SELECT id FROM bmq_courses WHERE id = $1', [courseId]);
    if (courseResult.rows.length === 0) {
      throw new NotFoundError(
        'BMQ course not found',
        `BMQ course ${courseId} not found`,
        'Please check the course ID and try again.'
      );
    }

    // Check if member exists
    const memberResult = await pool.query('SELECT id FROM members WHERE id = $1', [memberId]);
    if (memberResult.rows.length === 0) {
      throw new NotFoundError(
        'Member not found',
        `Member ${memberId} not found`,
        'Please check the member ID and try again.'
      );
    }

    // Check if already enrolled
    const existingEnrollment = await pool.query(
      'SELECT id FROM bmq_enrollments WHERE bmq_course_id = $1 AND member_id = $2',
      [courseId, memberId]
    );

    if (existingEnrollment.rows.length > 0) {
      throw new ConflictError(
        'Member already enrolled',
        `Member ${memberId} is already enrolled in course ${courseId}`,
        'This member is already enrolled in this BMQ course. Please choose a different member or course.'
      );
    }

    const result = await pool.query(
      `
      INSERT INTO bmq_enrollments (bmq_course_id, member_id, status)
      VALUES ($1, $2, 'enrolled')
      RETURNING *
      `,
      [courseId, memberId]
    );

    const enrollment = toCamelCase(result.rows[0]);

    res.status(201).json({ enrollment });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/bmq-courses/enrollments/:id
 * Update enrollment status (admin only)
 */
router.put('/enrollments/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const validationResult = updateEnrollmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid enrollment data',
        validationResult.error.message,
        'Please check all fields and try again.'
      );
    }

    const { status, completedAt } = validationResult.data;

    // Check if enrollment exists
    const existingResult = await pool.query('SELECT * FROM bmq_enrollments WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      throw new NotFoundError(
        'Enrollment not found',
        `Enrollment ${id} not found`,
        'Please check the enrollment ID and try again.'
      );
    }

    // Validate completedAt is provided if status is 'completed'
    if (status === 'completed' && !completedAt) {
      throw new ValidationError(
        'Completed date required',
        'completedAt is required when status is "completed"',
        'Please provide a completion date when marking an enrollment as completed.'
      );
    }

    const result = await pool.query(
      `
      UPDATE bmq_enrollments
      SET status = $1, completed_at = $2
      WHERE id = $3
      RETURNING *
      `,
      [status, completedAt || null, id]
    );

    const enrollment = toCamelCase(result.rows[0]);

    res.json({ enrollment });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/bmq-courses/enrollments/:id
 * Remove enrollment (admin only)
 */
router.delete('/enrollments/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if enrollment exists
    const existingResult = await pool.query('SELECT id FROM bmq_enrollments WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      throw new NotFoundError(
        'Enrollment not found',
        `Enrollment ${id} not found`,
        'Please check the enrollment ID and try again.'
      );
    }

    await pool.query('DELETE FROM bmq_enrollments WHERE id = $1', [id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// MEMBER BMQ ENROLLMENT ROUTES
// ============================================================================

/**
 * GET /api/bmq-courses/members/:memberId/enrollments
 * Get all BMQ enrollments for a member with course details
 */
router.get('/members/:memberId/enrollments', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.params;

    // Check if member exists
    const memberResult = await pool.query('SELECT id FROM members WHERE id = $1', [memberId]);
    if (memberResult.rows.length === 0) {
      throw new NotFoundError(
        'Member not found',
        `Member ${memberId} not found`,
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
        c.training_days,
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
      [memberId]
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
        trainingDays: row.training_days,
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

export { router as bmqCoursesRoutes };
