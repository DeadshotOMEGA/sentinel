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
  ReportErrorResponseSchema,
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
