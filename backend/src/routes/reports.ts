import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { requireAuth } from '../auth/middleware';
import { ValidationError, NotFoundError } from '../utils/errors';
import {
  calculateTrainingNightAttendance,
  calculateTrend,
  getTrainingNights,
} from '../services/attendance-calculator';
import { calculateBMQAttendance } from '../services/bmq-attendance-calculator';
import type {
  TrainingNightReportConfig,
  BMQReportConfig,
  PersonnelRosterConfig,
  VisitorSummaryConfig,
  DailyCheckinConfig,
  TrainingNightAttendanceData,
  BMQAttendanceData,
  HolidayExclusion,
} from '../../../shared/types/reports';

const router = Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Log report generation to audit table
 */
async function logReportGeneration(
  reportType: string,
  reportConfig: Record<string, unknown>,
  generatedBy: string,
  startTime: number
): Promise<void> {
  const generationTimeMs = Date.now() - startTime;
  await pool.query(
    `INSERT INTO report_audit_log (report_type, report_config, generated_by, generation_time_ms)
     VALUES ($1, $2, $3, $4)`,
    [reportType, JSON.stringify(reportConfig), generatedBy, generationTimeMs]
  );
}

/**
 * Get report settings as a key-value map
 */
async function getReportSettings(): Promise<Record<string, unknown>> {
  const result = await pool.query('SELECT key, value FROM report_settings');
  const settings: Record<string, unknown> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

/**
 * Get current training year with holiday exclusions
 */
async function getCurrentTrainingYear(): Promise<{
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  holidayExclusions: HolidayExclusion[];
}> {
  const result = await pool.query(
    `SELECT id, name, start_date, end_date, holiday_exclusions
     FROM training_years
     WHERE is_current = true
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(
      'No current training year found',
      'A current training year must be configured in settings.',
      'Please configure a training year in the settings page.'
    );
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    holidayExclusions: row.holiday_exclusions || [],
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const dailyCheckinSchema = z.object({
  divisionId: z.string().uuid().optional(),
  memberType: z.enum(['all', 'ft_staff', 'reserve']).optional(),
});

const trainingNightReportSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  organizationOption: z.enum(['full_unit', 'grouped_by_division', 'separated_by_division', 'specific_division', 'specific_member']),
  divisionId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
  includeFTStaff: z.boolean(),
  showBMQBadge: z.boolean(),
});

const bmqReportSchema = z.object({
  courseId: z.string().uuid(),
  organizationOption: z.enum(['full_unit', 'grouped_by_division', 'separated_by_division', 'specific_division', 'specific_member']),
  divisionId: z.string().uuid().optional(),
});

const personnelRosterSchema = z.object({
  divisionId: z.string().uuid().optional(),
  sortOrder: z.enum(['division_rank', 'rank', 'alphabetical']),
});

const visitorSummarySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  visitType: z.string().optional(),
  organization: z.string().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/reports/daily-checkin
 * Generate daily check-in summary
 */
router.post('/daily-checkin', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const validation = dailyCheckinSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid daily check-in report configuration',
        validation.error.errors[0].message,
        'Please check the request body and try again.'
      );
    }

    const config = validation.data;

    // Build query for present FT staff
    let ftStaffQuery = `
      SELECT DISTINCT ON (m.id)
        m.id, m.service_number, m.first_name, m.last_name, m.rank,
        d.id as division_id, d.name as division_name
      FROM members m
      JOIN divisions d ON m.division_id = d.id
      WHERE m.status = 'active'
        AND m.member_type IN ('class_b', 'class_c', 'reg_force')
        AND EXISTS (
          SELECT 1 FROM checkins c
          WHERE c.member_id = m.id
            AND c.direction = 'in'
            AND DATE(c.timestamp AT TIME ZONE 'America/Winnipeg') = CURRENT_DATE
        )
    `;

    const ftStaffParams: string[] = [];
    if (config.divisionId) {
      ftStaffParams.push(config.divisionId);
      ftStaffQuery += ` AND m.division_id = $${ftStaffParams.length}`;
    }

    ftStaffQuery += ' ORDER BY m.id, d.name, m.rank, m.last_name';

    // Build query for absent FT staff (those who haven't checked in today)
    let absentFtStaffQuery = `
      SELECT m.id, m.service_number, m.first_name, m.last_name, m.rank,
        d.id as division_id, d.name as division_name
      FROM members m
      JOIN divisions d ON m.division_id = d.id
      WHERE m.status = 'active'
        AND m.member_type IN ('class_b', 'class_c', 'reg_force')
        AND NOT EXISTS (
          SELECT 1 FROM checkins c
          WHERE c.member_id = m.id
            AND c.direction = 'in'
            AND DATE(c.timestamp AT TIME ZONE 'America/Winnipeg') = CURRENT_DATE
        )
    `;

    const absentFtStaffParams: string[] = [];
    if (config.divisionId) {
      absentFtStaffParams.push(config.divisionId);
      absentFtStaffQuery += ` AND m.division_id = $${absentFtStaffParams.length}`;
    }

    absentFtStaffQuery += ' ORDER BY d.name, m.rank, m.last_name';

    // Build query for present reserve members
    let reserveQuery = `
      SELECT DISTINCT ON (m.id)
        m.id, m.service_number, m.first_name, m.last_name, m.rank,
        d.id as division_id, d.name as division_name
      FROM members m
      JOIN divisions d ON m.division_id = d.id
      WHERE m.status = 'active'
        AND m.member_type = 'class_a'
        AND EXISTS (
          SELECT 1 FROM checkins c
          WHERE c.member_id = m.id
            AND c.direction = 'in'
            AND DATE(c.timestamp AT TIME ZONE 'America/Winnipeg') = CURRENT_DATE
        )
    `;

    const reserveParams: string[] = [];
    if (config.divisionId) {
      reserveParams.push(config.divisionId);
      reserveQuery += ` AND m.division_id = $${reserveParams.length}`;
    }

    reserveQuery += ' ORDER BY m.id, d.name, m.rank, m.last_name';

    // Execute queries based on memberType filter
    let presentFTStaff: Array<{
      id: string;
      serviceNumber: string;
      firstName: string;
      lastName: string;
      rank: string;
      division: { id: string; name: string };
    }> = [];
    let absentFTStaff: Array<{
      id: string;
      serviceNumber: string;
      firstName: string;
      lastName: string;
      rank: string;
      division: { id: string; name: string };
    }> = [];
    let presentReserve: Array<{
      id: string;
      serviceNumber: string;
      firstName: string;
      lastName: string;
      rank: string;
      division: { id: string; name: string };
    }> = [];

    if (!config.memberType || config.memberType === 'all' || config.memberType === 'ft_staff') {
      const ftResult = await pool.query(ftStaffQuery, ftStaffParams);
      presentFTStaff = ftResult.rows.map(row => ({
        id: row.id,
        serviceNumber: row.service_number,
        firstName: row.first_name,
        lastName: row.last_name,
        rank: row.rank,
        division: {
          id: row.division_id,
          name: row.division_name,
        },
      }));

      const absentResult = await pool.query(absentFtStaffQuery, absentFtStaffParams);
      absentFTStaff = absentResult.rows.map(row => ({
        id: row.id,
        serviceNumber: row.service_number,
        firstName: row.first_name,
        lastName: row.last_name,
        rank: row.rank,
        division: {
          id: row.division_id,
          name: row.division_name,
        },
      }));
    }

    if (!config.memberType || config.memberType === 'all' || config.memberType === 'reserve') {
      const reserveResult = await pool.query(reserveQuery, reserveParams);
      presentReserve = reserveResult.rows.map(row => ({
        id: row.id,
        serviceNumber: row.service_number,
        firstName: row.first_name,
        lastName: row.last_name,
        rank: row.rank,
        division: {
          id: row.division_id,
          name: row.division_name,
        },
      }));
    }

    // Calculate summary by division
    const divisionSummary: Record<string, { name: string; ftStaff: number; reserve: number }> = {};

    for (const member of presentFTStaff) {
      if (!divisionSummary[member.division.id]) {
        divisionSummary[member.division.id] = {
          name: member.division.name,
          ftStaff: 0,
          reserve: 0,
        };
      }
      divisionSummary[member.division.id].ftStaff++;
    }

    for (const member of presentReserve) {
      if (!divisionSummary[member.division.id]) {
        divisionSummary[member.division.id] = {
          name: member.division.name,
          ftStaff: 0,
          reserve: 0,
        };
      }
      divisionSummary[member.division.id].reserve++;
    }

    const reportData = {
      generatedAt: new Date().toISOString(),
      presentFTStaff,
      absentFTStaff,
      presentReserve,
      summary: {
        totalFTStaff: presentFTStaff.length,
        totalReserve: presentReserve.length,
        totalAbsentFTStaff: absentFTStaff.length,
        byDivision: Object.entries(divisionSummary).map(([id, data]) => ({
          divisionId: id,
          divisionName: data.name,
          ftStaff: data.ftStaff,
          reserve: data.reserve,
        })),
      },
    };

    // Log report generation
    if (req.user?.id) {
      await logReportGeneration('daily_checkin', config, req.user.id, startTime);
    }

    res.json(reportData);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports/training-night-attendance
 * Generate training night attendance report
 */
router.post('/training-night-attendance', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const validation = trainingNightReportSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid training night attendance report configuration',
        validation.error.errors[0].message,
        'Please check the request body and try again.'
      );
    }

    const config = validation.data;

    // Get settings
    const settings = await getReportSettings();
    const scheduleSettings = settings.schedule as {
      trainingNightDay: string;
      trainingNightStart: string;
      trainingNightEnd: string;
    };
    const thresholdSettings = settings.thresholds as {
      warningThreshold: number;
      criticalThreshold: number;
      bmqSeparateThresholds: boolean;
      bmqWarningThreshold: number;
      bmqCriticalThreshold: number;
    };
    const memberHandlingSettings = settings.member_handling as {
      newMemberGracePeriod: number;
      minimumTrainingNights: number;
    };

    // Get current training year for holiday exclusions
    const trainingYear = await getCurrentTrainingYear();

    // Build query for members
    let membersQuery = `
      SELECT m.id, m.service_number, m.first_name, m.last_name, m.rank, m.created_at,
        d.id as division_id, d.name as division_name,
        EXISTS (
          SELECT 1 FROM bmq_enrollments be
          WHERE be.member_id = m.id AND be.status = 'enrolled'
        ) as is_bmq_enrolled
      FROM members m
      JOIN divisions d ON m.division_id = d.id
      WHERE m.status = 'active'
    `;

    const membersParams: string[] = [];

    // Apply member type filter
    if (!config.includeFTStaff) {
      membersQuery += ` AND m.member_type = 'class_a'`;
    }

    // Apply organization filters
    if (config.organizationOption === 'specific_division' && config.divisionId) {
      membersParams.push(config.divisionId);
      membersQuery += ` AND m.division_id = $${membersParams.length}`;
    }

    if (config.organizationOption === 'specific_member' && config.memberId) {
      membersParams.push(config.memberId);
      membersQuery += ` AND m.id = $${membersParams.length}`;
    }

    membersQuery += ' ORDER BY d.name, m.rank, m.last_name';

    const membersResult = await pool.query(membersQuery, membersParams);

    // Calculate attendance for each member
    const attendanceData: TrainingNightAttendanceData[] = [];

    for (const row of membersResult.rows) {
      const isBMQEnrolled = row.is_bmq_enrolled;

      // Use BMQ thresholds if applicable
      const thresholds = isBMQEnrolled && thresholdSettings.bmqSeparateThresholds
        ? {
            warningThreshold: thresholdSettings.bmqWarningThreshold,
            criticalThreshold: thresholdSettings.bmqCriticalThreshold,
          }
        : {
            warningThreshold: thresholdSettings.warningThreshold,
            criticalThreshold: thresholdSettings.criticalThreshold,
          };

      const attendance = await calculateTrainingNightAttendance({
        memberId: row.id,
        periodStart: new Date(config.periodStart),
        periodEnd: new Date(config.periodEnd),
        trainingDay: scheduleSettings.trainingNightDay,
        trainingStartTime: scheduleSettings.trainingNightStart,
        trainingEndTime: scheduleSettings.trainingNightEnd,
        holidayExclusions: trainingYear.holidayExclusions,
        thresholds,
        memberHandling: memberHandlingSettings,
      });

      const trend = await calculateTrend(
        row.id,
        new Date(config.periodStart),
        new Date(config.periodEnd),
        {
          trainingDay: scheduleSettings.trainingNightDay,
          trainingStartTime: scheduleSettings.trainingNightStart,
          trainingEndTime: scheduleSettings.trainingNightEnd,
          holidayExclusions: trainingYear.holidayExclusions,
          thresholds,
          memberHandling: memberHandlingSettings,
        }
      );

      attendanceData.push({
        member: {
          id: row.id,
          serviceNumber: row.service_number,
          firstName: row.first_name,
          lastName: row.last_name,
          rank: row.rank,
          division: {
            id: row.division_id,
            name: row.division_name,
          },
        },
        attendance,
        trend,
        isBMQEnrolled: isBMQEnrolled && config.showBMQBadge,
        enrollmentDate: new Date(row.created_at),
      });
    }

    const reportData = {
      generatedAt: new Date().toISOString(),
      config,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      data: attendanceData,
    };

    // Log report generation
    if (req.user?.id) {
      await logReportGeneration('training_night_attendance', config, req.user.id, startTime);
    }

    res.json(reportData);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports/bmq-attendance
 * Generate BMQ course attendance report
 */
router.post('/bmq-attendance', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const validation = bmqReportSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid BMQ attendance report configuration',
        validation.error.errors[0].message,
        'Please check the request body and try again.'
      );
    }

    const config = validation.data;

    // Verify course exists
    const courseResult = await pool.query(
      'SELECT id, name, start_date, end_date FROM bmq_courses WHERE id = $1',
      [config.courseId]
    );

    if (courseResult.rows.length === 0) {
      throw new NotFoundError(
        'BMQ course not found',
        `No BMQ course found with ID: ${config.courseId}`,
        'Please check the course ID and try again.'
      );
    }

    const course = courseResult.rows[0];

    // Get settings
    const settings = await getReportSettings();
    const thresholdSettings = settings.thresholds as {
      warningThreshold: number;
      criticalThreshold: number;
      bmqSeparateThresholds: boolean;
      bmqWarningThreshold: number;
      bmqCriticalThreshold: number;
    };

    // Determine thresholds to use
    const thresholds = thresholdSettings.bmqSeparateThresholds
      ? {
          warningThreshold: thresholdSettings.bmqWarningThreshold,
          criticalThreshold: thresholdSettings.bmqCriticalThreshold,
        }
      : {
          warningThreshold: thresholdSettings.warningThreshold,
          criticalThreshold: thresholdSettings.criticalThreshold,
        };

    // Build query for enrolled members
    let enrollmentsQuery = `
      SELECT m.id, m.service_number, m.first_name, m.last_name, m.rank,
        d.id as division_id, d.name as division_name,
        be.id as enrollment_id, be.enrolled_at, be.completed_at, be.status
      FROM bmq_enrollments be
      JOIN members m ON be.member_id = m.id
      JOIN divisions d ON m.division_id = d.id
      WHERE be.bmq_course_id = $1
        AND m.status = 'active'
    `;

    const enrollmentsParams: string[] = [config.courseId];

    // Apply organization filters
    if (config.organizationOption === 'specific_division' && config.divisionId) {
      enrollmentsParams.push(config.divisionId);
      enrollmentsQuery += ` AND m.division_id = $${enrollmentsParams.length}`;
    }

    enrollmentsQuery += ' ORDER BY d.name, m.rank, m.last_name';

    const enrollmentsResult = await pool.query(enrollmentsQuery, enrollmentsParams);

    // Calculate attendance for each enrolled member
    const attendanceData: BMQAttendanceData[] = [];

    for (const row of enrollmentsResult.rows) {
      const attendance = await calculateBMQAttendance({
        memberId: row.id,
        courseId: config.courseId,
        thresholds,
      });

      attendanceData.push({
        member: {
          id: row.id,
          serviceNumber: row.service_number,
          firstName: row.first_name,
          lastName: row.last_name,
          rank: row.rank,
          division: {
            id: row.division_id,
            name: row.division_name,
          },
        },
        attendance,
        enrollment: {
          id: row.enrollment_id,
          memberId: row.id,
          bmqCourseId: config.courseId,
          enrolledAt: new Date(row.enrolled_at),
          completedAt: row.completed_at ? new Date(row.completed_at) : null,
          status: row.status,
        },
      });
    }

    const reportData = {
      generatedAt: new Date().toISOString(),
      config,
      course: {
        id: course.id,
        name: course.name,
        startDate: course.start_date,
        endDate: course.end_date,
      },
      data: attendanceData,
    };

    // Log report generation
    if (req.user?.id) {
      await logReportGeneration('bmq_attendance', config, req.user.id, startTime);
    }

    res.json(reportData);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports/personnel-roster
 * Generate personnel status roster
 */
router.post('/personnel-roster', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const validation = personnelRosterSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid personnel roster report configuration',
        validation.error.errors[0].message,
        'Please check the request body and try again.'
      );
    }

    const config = validation.data;

    // Build query
    let query = `
      SELECT m.id, m.service_number, m.first_name, m.last_name, m.rank,
        m.member_type, m.created_at,
        d.id as division_id, d.name as division_name
      FROM members m
      JOIN divisions d ON m.division_id = d.id
      WHERE m.status = 'active'
    `;

    const params: string[] = [];

    if (config.divisionId) {
      params.push(config.divisionId);
      query += ` AND m.division_id = $${params.length}`;
    }

    // Apply sort order
    switch (config.sortOrder) {
      case 'division_rank':
        query += ' ORDER BY d.name, m.rank, m.last_name';
        break;
      case 'rank':
        query += ' ORDER BY m.rank, m.last_name';
        break;
      case 'alphabetical':
        query += ' ORDER BY m.last_name, m.first_name';
        break;
    }

    const result = await pool.query(query, params);

    const members = result.rows.map(row => ({
      id: row.id,
      serviceNumber: row.service_number,
      firstName: row.first_name,
      lastName: row.last_name,
      rank: row.rank,
      division: {
        id: row.division_id,
        name: row.division_name,
      },
      classification: row.member_type,
      enrollmentDate: new Date(row.created_at),
    }));

    const reportData = {
      generatedAt: new Date().toISOString(),
      config,
      members,
      summary: {
        totalMembers: members.length,
      },
    };

    // Log report generation
    if (req.user?.id) {
      await logReportGeneration('personnel_roster', config, req.user.id, startTime);
    }

    res.json(reportData);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports/visitor-summary
 * Generate visitor activity summary
 */
router.post('/visitor-summary', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const validation = visitorSummarySchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid visitor summary report configuration',
        validation.error.errors[0].message,
        'Please check the request body and try again.'
      );
    }

    const config = validation.data;

    // Build query
    let query = `
      SELECT id, full_name, organization, visit_type, purpose, host_name,
        signin_time, signout_time
      FROM visitors
      WHERE DATE(signin_time AT TIME ZONE 'America/Winnipeg') >= $1::date
        AND DATE(signin_time AT TIME ZONE 'America/Winnipeg') <= $2::date
    `;

    const params: (string | Date)[] = [config.startDate, config.endDate];

    if (config.visitType) {
      params.push(config.visitType);
      query += ` AND visit_type = $${params.length}`;
    }

    if (config.organization) {
      params.push(config.organization);
      query += ` AND organization = $${params.length}`;
    }

    query += ' ORDER BY signin_time DESC';

    const result = await pool.query(query, params);

    // Calculate duration for each visit
    const visitors = result.rows.map(row => {
      let durationMinutes: number | null = null;
      if (row.signout_time) {
        const signinTime = new Date(row.signin_time).getTime();
        const signoutTime = new Date(row.signout_time).getTime();
        durationMinutes = Math.round((signoutTime - signinTime) / 1000 / 60);
      }

      return {
        id: row.id,
        fullName: row.full_name,
        organization: row.organization,
        visitType: row.visit_type,
        purpose: row.purpose,
        hostName: row.host_name,
        signinTime: new Date(row.signin_time),
        signoutTime: row.signout_time ? new Date(row.signout_time) : null,
        durationMinutes,
      };
    });

    // Calculate summary statistics
    const byType: Record<string, number> = {};
    const byOrganization: Record<string, number> = {};
    let totalDuration = 0;
    let visitsWithDuration = 0;

    for (const visitor of visitors) {
      // Count by type
      byType[visitor.visitType] = (byType[visitor.visitType] || 0) + 1;

      // Count by organization
      if (visitor.organization) {
        byOrganization[visitor.organization] = (byOrganization[visitor.organization] || 0) + 1;
      }

      // Calculate average duration
      if (visitor.durationMinutes !== null) {
        totalDuration += visitor.durationMinutes;
        visitsWithDuration++;
      }
    }

    const averageDurationMinutes = visitsWithDuration > 0
      ? Math.round(totalDuration / visitsWithDuration)
      : null;

    const reportData = {
      generatedAt: new Date().toISOString(),
      config,
      visitors,
      summary: {
        totalVisitors: visitors.length,
        byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
        byOrganization: Object.entries(byOrganization).map(([org, count]) => ({ organization: org, count })),
        averageDurationMinutes,
      },
    };

    // Log report generation
    if (req.user?.id) {
      await logReportGeneration('visitor_summary', config, req.user.id, startTime);
    }

    res.json(reportData);
  } catch (err) {
    next(err);
  }
});

export { router as reportRoutes };
