import { initContract } from '@ts-rest/core'
import {
  DailyCheckinConfigSchema,
  DailyCheckinReportSchema,
  TrainingNightReportConfigSchema,
  TrainingNightAttendanceReportSchema,
  BMQReportConfigSchema,
  BMQAttendanceReportSchema,
  PersonnelRosterConfigSchema,
  PersonnelRosterReportSchema,
  VisitorSummaryConfigSchema,
  VisitorSummaryReportSchema,
  DailyPresenceReportConfigSchema,
  WeeklyPresenceReportConfigSchema,
  MonthlyPresenceReportConfigSchema,
  TrainingNightMonthlyReportConfigSchema,
  VisitorActivityReportConfigSchema,
  OperationalExceptionsReportConfigSchema,
  ReportErrorResponseSchema,
} from '../schemas/report.schema.js'
import type {
  DailyPresenceReportResponse,
  MonthlyPresenceReportResponse,
  OperationalExceptionsReportResponse,
  TrainingNightMonthlyReportResponse,
  VisitorActivityReportResponse,
  WeeklyPresenceReportResponse,
} from '../schemas/report.schema.js'

const c = initContract()

/**
 * Report Generation Contract
 *
 * Endpoints for generating various attendance and personnel reports:
 * - Daily check-in summary
 * - Training night attendance reports
 * - BMQ course attendance reports
 * - Personnel roster reports
 * - Visitor summary reports
 */
export const reportContract = c.router(
  {
    generateDailyPresence: {
      method: 'POST',
      path: '/api/reports/presence/daily',
      body: DailyPresenceReportConfigSchema,
      responses: {
        200: c.type<DailyPresenceReportResponse>(),
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        403: ReportErrorResponseSchema,
        404: ReportErrorResponseSchema,
        409: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate daily presence report',
      description:
        'Generate an operational daily presence report with first arrival, final departure, session count, leave-and-return state, and warning metadata.',
    },

    generateWeeklyPresence: {
      method: 'POST',
      path: '/api/reports/presence/weekly',
      body: WeeklyPresenceReportConfigSchema,
      responses: {
        200: c.type<WeeklyPresenceReportResponse>(),
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        403: ReportErrorResponseSchema,
        404: ReportErrorResponseSchema,
        409: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate weekly presence report',
      description:
        'Generate an operational weekly presence report grouped around daily presence markers and Training/Admin night attendance.',
    },

    generateMonthlyPresence: {
      method: 'POST',
      path: '/api/reports/presence/monthly',
      body: MonthlyPresenceReportConfigSchema,
      responses: {
        200: c.type<MonthlyPresenceReportResponse>(),
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        403: ReportErrorResponseSchema,
        404: ReportErrorResponseSchema,
        409: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate monthly presence report',
      description:
        'Generate an operational monthly presence overview with compact day markers, key-night attendance, and scoped member summaries.',
    },

    generateTrainingNightMonthly: {
      method: 'POST',
      path: '/api/reports/training-night/monthly',
      body: TrainingNightMonthlyReportConfigSchema,
      responses: {
        200: c.type<TrainingNightMonthlyReportResponse>(),
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        403: ReportErrorResponseSchema,
        404: ReportErrorResponseSchema,
        409: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate monthly training night report',
      description:
        'Generate a department training night matrix for a selected month, including all active department members and each Training Night.',
    },

    generateVisitorActivity: {
      method: 'POST',
      path: '/api/reports/visitors/activity',
      body: VisitorActivityReportConfigSchema,
      responses: {
        200: c.type<VisitorActivityReportResponse>(),
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        403: ReportErrorResponseSchema,
        404: ReportErrorResponseSchema,
        409: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate visitor activity report',
      description:
        'Generate an operational visitor report using existing visitor visit type, purpose/reason, event association, host, organization, and date range data.',
    },

    generateOperationalExceptions: {
      method: 'POST',
      path: '/api/reports/operations/exceptions',
      body: OperationalExceptionsReportConfigSchema,
      responses: {
        200: c.type<OperationalExceptionsReportResponse>(),
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        403: ReportErrorResponseSchema,
        404: ReportErrorResponseSchema,
        409: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate operational exceptions report',
      description:
        'Generate a report of forced member checkouts and lockup days where the building was not properly secured before daily reset.',
    },

    /**
     * POST /api/reports/daily-checkin
     * Generate daily check-in summary with present/absent FT staff and reserve members
     */
    generateDailyCheckin: {
      method: 'POST',
      path: '/api/reports/daily-checkin',
      body: DailyCheckinConfigSchema,
      responses: {
        200: DailyCheckinReportSchema,
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate daily check-in report',
      description:
        'Generate a summary of current day check-ins including present FT staff, absent FT staff, and present reserve members, with optional filtering by division and member type',
    },

    /**
     * POST /api/reports/training-night-attendance
     * Generate training night attendance report with percentage calculations and trends
     */
    generateTrainingNightAttendance: {
      method: 'POST',
      path: '/api/reports/training-night-attendance',
      body: TrainingNightReportConfigSchema,
      responses: {
        200: TrainingNightAttendanceReportSchema,
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        404: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate training night attendance report',
      description:
        'Generate attendance report for training nights over a specified period, with attendance percentages, trends, threshold flags, and BMQ badges',
    },

    /**
     * POST /api/reports/bmq-attendance
     * Generate BMQ course attendance report
     */
    generateBMQAttendance: {
      method: 'POST',
      path: '/api/reports/bmq-attendance',
      body: BMQReportConfigSchema,
      responses: {
        200: BMQAttendanceReportSchema,
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        404: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate BMQ attendance report',
      description:
        'Generate attendance report for a specific BMQ course, showing enrollment status and attendance percentages for all enrolled members',
    },

    /**
     * POST /api/reports/personnel-roster
     * Generate personnel roster report
     */
    generatePersonnelRoster: {
      method: 'POST',
      path: '/api/reports/personnel-roster',
      body: PersonnelRosterConfigSchema,
      responses: {
        200: PersonnelRosterReportSchema,
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate personnel roster',
      description:
        'Generate complete personnel roster with member details, optionally filtered by division and sorted by division/rank or alphabetically',
    },

    /**
     * POST /api/reports/visitor-summary
     * Generate visitor summary report
     */
    generateVisitorSummary: {
      method: 'POST',
      path: '/api/reports/visitor-summary',
      body: VisitorSummaryConfigSchema,
      responses: {
        200: VisitorSummaryReportSchema,
        400: ReportErrorResponseSchema,
        401: ReportErrorResponseSchema,
        500: ReportErrorResponseSchema,
      },
      summary: 'Generate visitor summary',
      description:
        'Generate summary of all visitors over a date range, with optional filtering by visit type and organization, including visit duration statistics',
    },
  },
  {
    pathPrefix: '',
  }
)
