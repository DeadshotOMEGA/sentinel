import { initContract } from '@ts-rest/core'
import {
  DutyRoleListResponseSchema,
  DutyRoleWithPositionsResponseSchema,
  DutyPositionListResponseSchema,
  WeeklyScheduleWithAssignmentsResponseSchema,
  WeeklyScheduleListResponseSchema,
  WeeklyScheduleWithAssignmentsListResponseSchema,
  ScheduleAssignmentResponseSchema,
  CreateScheduleInputSchema,
  UpdateScheduleInputSchema,
  CreateAssignmentInputSchema,
  UpdateAssignmentInputSchema,
  ScheduleListQuerySchema,
  DateParamSchema, // from lockup.schema.ts
  ScheduleIdParamSchema,
  ScheduleAssignmentParamsSchema,
  DutyRoleIdParamSchema,
  CurrentDdsResponseSchema,
  DutyWatchTeamResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Schedule API contract
 *
 * Endpoints for managing weekly duty schedules (DDS, Duty Watch)
 */
export const scheduleContract = c.router({
  // ==========================================================================
  // Duty Roles
  // ==========================================================================

  /**
   * List all duty roles
   */
  listDutyRoles: {
    method: 'GET',
    path: '/api/duty-roles',
    responses: {
      200: DutyRoleListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List duty roles',
    description: 'Get all duty roles (DDS, DUTY_WATCH, etc.)',
  },

  /**
   * Get duty role with positions
   */
  getDutyRole: {
    method: 'GET',
    path: '/api/duty-roles/:id',
    pathParams: DutyRoleIdParamSchema,
    responses: {
      200: DutyRoleWithPositionsResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get duty role',
    description: 'Get a specific duty role with its positions',
  },

  /**
   * Get positions for a duty role
   */
  getDutyRolePositions: {
    method: 'GET',
    path: '/api/duty-roles/:id/positions',
    pathParams: DutyRoleIdParamSchema,
    responses: {
      200: DutyPositionListResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get duty role positions',
    description: 'Get positions for a specific duty role',
  },

  // ==========================================================================
  // Weekly Schedules
  // ==========================================================================

  /**
   * List schedules
   */
  listSchedules: {
    method: 'GET',
    path: '/api/schedules',
    query: ScheduleListQuerySchema,
    responses: {
      200: WeeklyScheduleListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List schedules',
    description: 'Get weekly schedules with optional filters',
  },

  /**
   * Get current week's schedules
   */
  getCurrentSchedules: {
    method: 'GET',
    path: '/api/schedules/current',
    responses: {
      200: WeeklyScheduleListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get current schedules',
    description: 'Get all schedules for the current week (based on operational date)',
  },

  /**
   * Get schedules for a specific week
   */
  getSchedulesByWeek: {
    method: 'GET',
    path: '/api/schedules/week/:date',
    pathParams: DateParamSchema,
    responses: {
      200: WeeklyScheduleWithAssignmentsListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get schedules by week',
    description: 'Get all schedules for the week containing the specified date, including assignments',
  },

  /**
   * Create a new schedule
   */
  createSchedule: {
    method: 'POST',
    path: '/api/schedules',
    body: CreateScheduleInputSchema,
    responses: {
      201: WeeklyScheduleWithAssignmentsResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create schedule',
    description: 'Create a new weekly schedule (admin only)',
  },

  /**
   * Get schedule with assignments
   */
  getSchedule: {
    method: 'GET',
    path: '/api/schedules/:id',
    pathParams: ScheduleIdParamSchema,
    responses: {
      200: WeeklyScheduleWithAssignmentsResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get schedule',
    description: 'Get a specific schedule with all assignments',
  },

  /**
   * Update schedule metadata
   */
  updateSchedule: {
    method: 'PATCH',
    path: '/api/schedules/:id',
    pathParams: ScheduleIdParamSchema,
    body: UpdateScheduleInputSchema,
    responses: {
      200: WeeklyScheduleWithAssignmentsResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update schedule',
    description: 'Update schedule metadata (admin only)',
  },

  /**
   * Publish a draft schedule
   */
  publishSchedule: {
    method: 'POST',
    path: '/api/schedules/:id/publish',
    pathParams: ScheduleIdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: WeeklyScheduleWithAssignmentsResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Publish schedule',
    description: 'Publish a draft schedule (admin only)',
  },

  /**
   * Revert a published schedule back to draft
   */
  revertToDraft: {
    method: 'POST',
    path: '/api/schedules/:id/revert-to-draft',
    pathParams: ScheduleIdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: WeeklyScheduleWithAssignmentsResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Revert schedule to draft',
    description: 'Revert a published schedule back to draft status for editing (admin only)',
  },

  /**
   * Delete a draft schedule
   */
  deleteSchedule: {
    method: 'DELETE',
    path: '/api/schedules/:id',
    pathParams: ScheduleIdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: c.type<{ success: boolean; message: string }>(),
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete schedule',
    description: 'Delete a draft schedule (admin only)',
  },

  // ==========================================================================
  // Schedule Assignments
  // ==========================================================================

  /**
   * Add assignment to schedule
   */
  createAssignment: {
    method: 'POST',
    path: '/api/schedules/:id/assignments',
    pathParams: ScheduleIdParamSchema,
    body: CreateAssignmentInputSchema,
    responses: {
      201: ScheduleAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create assignment',
    description: 'Assign a member to a schedule (admin only)',
  },

  /**
   * Update assignment
   */
  updateAssignment: {
    method: 'PATCH',
    path: '/api/schedules/:id/assignments/:assignmentId',
    pathParams: ScheduleAssignmentParamsSchema,
    body: UpdateAssignmentInputSchema,
    responses: {
      200: ScheduleAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update assignment',
    description: 'Update schedule assignment (admin only)',
  },

  /**
   * Remove assignment
   */
  deleteAssignment: {
    method: 'DELETE',
    path: '/api/schedules/:id/assignments/:assignmentId',
    pathParams: ScheduleAssignmentParamsSchema,
    body: c.type<undefined>(),
    responses: {
      200: c.type<{ success: boolean; message: string }>(),
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete assignment',
    description: 'Remove assignment from schedule (admin only)',
  },

  // ==========================================================================
  // DDS Convenience Endpoints
  // ==========================================================================

  /**
   * Get current DDS from schedule
   */
  getCurrentDdsFromSchedule: {
    method: 'GET',
    path: '/api/schedules/dds/current',
    responses: {
      200: CurrentDdsResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get current DDS',
    description: 'Get current DDS from the weekly schedule (based on operational date)',
  },

  /**
   * Get DDS for specific week
   */
  getDdsByWeek: {
    method: 'GET',
    path: '/api/schedules/dds/week/:date',
    pathParams: DateParamSchema,
    responses: {
      200: CurrentDdsResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get DDS by week',
    description: 'Get DDS for the week containing the specified date',
  },

  // ==========================================================================
  // Duty Watch Convenience Endpoints
  // ==========================================================================

  /**
   * Get current Duty Watch team
   */
  getCurrentDutyWatch: {
    method: 'GET',
    path: '/api/schedules/duty-watch/current',
    responses: {
      200: DutyWatchTeamResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get current Duty Watch',
    description: "Get this week's Duty Watch team from the schedule",
  },

  /**
   * Get tonight's Duty Watch team (if Tue/Thu)
   */
  getTonightDutyWatch: {
    method: 'GET',
    path: '/api/schedules/duty-watch/tonight',
    responses: {
      200: DutyWatchTeamResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get tonight Duty Watch',
    description: "Get tonight's Duty Watch team (only active on Tuesday/Thursday)",
  },
})
