import { initServer } from '@ts-rest/express'
import { scheduleContract } from '@sentinel/contracts'
import type {
  ScheduleListQuery,
  DateParam,
  ScheduleIdParam,
  ScheduleAssignmentParams,
  DutyRoleIdParam,
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from '@sentinel/contracts'
import { ScheduleService } from '../services/schedule-service.js'
import { getPrismaClient } from '../lib/database.js'
import { parseOperationalDate } from '../utils/operational-date.js'

const s = initServer()

const scheduleService = new ScheduleService(getPrismaClient())

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert duty role entity to API format
 */
function dutyRoleToApiFormat(role: {
  id: string
  code: string
  name: string
  description: string | null
  roleType: string
  scheduleType: string
  activeDays: number[]
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    roleType: role.roleType as 'single' | 'team',
    scheduleType: role.scheduleType as 'weekly',
    activeDays: role.activeDays,
    displayOrder: role.displayOrder,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  }
}

/**
 * Convert duty position entity to API format
 */
function dutyPositionToApiFormat(position: {
  id: string
  dutyRoleId: string
  code: string
  name: string
  description: string | null
  maxSlots: number
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: position.id,
    dutyRoleId: position.dutyRoleId,
    code: position.code,
    name: position.name,
    description: position.description,
    maxSlots: position.maxSlots,
    displayOrder: position.displayOrder,
    createdAt: position.createdAt.toISOString(),
    updatedAt: position.updatedAt.toISOString(),
  }
}

/**
 * Convert schedule entity to API format
 */
function scheduleToApiFormat(schedule: {
  id: string
  dutyRoleId: string
  weekStartDate: Date
  status: string
  createdBy: string | null
  publishedAt: Date | null
  publishedBy: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  dutyRole: { id: string; code: string; name: string }
}) {
  // Extract date part from ISO string (YYYY-MM-DD)
  const isoString = schedule.weekStartDate.toISOString()
  const weekStartDate = isoString.substring(0, 10)

  return {
    id: schedule.id,
    dutyRoleId: schedule.dutyRoleId,
    weekStartDate,
    status: schedule.status as 'draft' | 'published' | 'active' | 'archived',
    createdBy: schedule.createdBy,
    publishedAt: schedule.publishedAt?.toISOString() ?? null,
    publishedBy: schedule.publishedBy,
    notes: schedule.notes,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    dutyRole: schedule.dutyRole,
  }
}

/**
 * Convert schedule assignment entity to API format
 */
function assignmentToApiFormat(assignment: {
  id: string
  scheduleId: string
  dutyPositionId: string | null
  memberId: string
  status: string
  confirmedAt: Date | null
  releasedAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }
  dutyPosition: { id: string; code: string; name: string } | null
}) {
  return {
    id: assignment.id,
    scheduleId: assignment.scheduleId,
    dutyPositionId: assignment.dutyPositionId,
    memberId: assignment.memberId,
    status: assignment.status as 'assigned' | 'confirmed' | 'released',
    confirmedAt: assignment.confirmedAt?.toISOString() ?? null,
    releasedAt: assignment.releasedAt?.toISOString() ?? null,
    notes: assignment.notes,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
    member: assignment.member,
    dutyPosition: assignment.dutyPosition,
  }
}

/**
 * Convert schedule with details to API format
 */
function scheduleWithDetailsToApiFormat(schedule: {
  id: string
  dutyRoleId: string
  weekStartDate: Date
  status: string
  createdBy: string | null
  publishedAt: Date | null
  publishedBy: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  dutyRole: { id: string; code: string; name: string }
  assignments: Array<{
    id: string
    scheduleId: string
    dutyPositionId: string | null
    memberId: string
    status: string
    confirmedAt: Date | null
    releasedAt: Date | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
    member: {
      id: string
      firstName: string
      lastName: string
      rank: string
      serviceNumber: string
    }
    dutyPosition: { id: string; code: string; name: string } | null
  }>
  createdByAdmin: { id: string; displayName: string } | null
  publishedByAdmin: { id: string; displayName: string } | null
}) {
  return {
    ...scheduleToApiFormat(schedule),
    assignments: schedule.assignments.map(assignmentToApiFormat),
    createdByAdmin: schedule.createdByAdmin,
    publishedByAdmin: schedule.publishedByAdmin,
  }
}

// ============================================================================
// Route Implementation
// ============================================================================

export const schedulesRouter = s.router(scheduleContract, {
  // ==========================================================================
  // Duty Roles
  // ==========================================================================

  listDutyRoles: async () => {
    try {
      const roles = await scheduleService.getAllDutyRoles()
      return {
        status: 200 as const,
        body: {
          data: roles.map(dutyRoleToApiFormat),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch duty roles',
        },
      }
    }
  },

  getDutyRole: async ({ params }: { params: DutyRoleIdParam }) => {
    try {
      const role = await scheduleService.getDutyRole(params.id)
      return {
        status: 200 as const,
        body: {
          ...dutyRoleToApiFormat(role),
          positions: role.positions.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            description: p.description,
            maxSlots: p.maxSlots,
            displayOrder: p.displayOrder,
          })),
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch duty role',
        },
      }
    }
  },

  getDutyRolePositions: async ({ params }: { params: DutyRoleIdParam }) => {
    try {
      const positions = await scheduleService.getDutyRolePositions(params.id)
      return {
        status: 200 as const,
        body: {
          data: positions.map(dutyPositionToApiFormat),
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch positions',
        },
      }
    }
  },

  // ==========================================================================
  // Weekly Schedules
  // ==========================================================================

  listSchedules: async ({ query }: { query: ScheduleListQuery }) => {
    try {
      const schedules = await scheduleService.listSchedules({
        dutyRoleId: query.dutyRoleId,
        status: query.status,
        weekStartDate: query.weekStartDate ? parseOperationalDate(query.weekStartDate) : undefined,
        limit: query.limit,
        offset: query.offset,
      })
      return {
        status: 200 as const,
        body: {
          data: schedules.map(scheduleToApiFormat),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch schedules',
        },
      }
    }
  },

  getCurrentSchedules: async () => {
    try {
      const schedules = await scheduleService.getCurrentSchedules()
      return {
        status: 200 as const,
        body: {
          data: schedules.map(scheduleToApiFormat),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch current schedules',
        },
      }
    }
  },

  getSchedulesByWeek: async ({ params }: { params: DateParam }) => {
    try {
      const date = parseOperationalDate(params.date)
      const schedules = await scheduleService.getSchedulesByWeek(date)
      return {
        status: 200 as const,
        body: {
          data: schedules.map(scheduleToApiFormat),
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid')) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch schedules',
        },
      }
    }
  },

  createSchedule: async ({ body }: { body: CreateScheduleInput }) => {
    try {
      const weekStartDate = parseOperationalDate(body.weekStartDate)
      // TODO: Get admin ID from auth context when authentication is implemented
      const schedule = await scheduleService.createSchedule(
        body.dutyRoleId,
        weekStartDate,
        undefined, // No admin ID until auth is implemented
        body.notes ?? undefined
      )
      return {
        status: 201 as const,
        body: scheduleWithDetailsToApiFormat(schedule),
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      if (error instanceof Error && error.message.includes('already exists')) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create schedule',
        },
      }
    }
  },

  getSchedule: async ({ params }: { params: ScheduleIdParam }) => {
    try {
      const schedule = await scheduleService.getSchedule(params.id)
      return {
        status: 200 as const,
        body: scheduleWithDetailsToApiFormat(schedule),
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch schedule',
        },
      }
    }
  },

  updateSchedule: async ({
    params,
    body,
  }: {
    params: ScheduleIdParam
    body: UpdateScheduleInput
  }) => {
    try {
      const schedule = await scheduleService.updateSchedule(params.id, body.notes)
      return {
        status: 200 as const,
        body: scheduleWithDetailsToApiFormat(schedule),
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update schedule',
        },
      }
    }
  },

  publishSchedule: async ({ params }: { params: ScheduleIdParam }) => {
    try {
      // TODO: Get admin ID from auth context when authentication is implemented
      const schedule = await scheduleService.publishSchedule(params.id, undefined)
      return {
        status: 200 as const,
        body: scheduleWithDetailsToApiFormat(schedule),
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      if (error instanceof Error && error.message.includes('Cannot publish')) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to publish schedule',
        },
      }
    }
  },

  deleteSchedule: async ({ params }: { params: ScheduleIdParam }) => {
    try {
      await scheduleService.deleteSchedule(params.id)
      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Schedule deleted successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      if (error instanceof Error && error.message.includes('Cannot delete')) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete schedule',
        },
      }
    }
  },

  // ==========================================================================
  // Schedule Assignments
  // ==========================================================================

  createAssignment: async ({
    params,
    body,
  }: {
    params: ScheduleIdParam
    body: CreateAssignmentInput
  }) => {
    try {
      const assignment = await scheduleService.createAssignment(
        params.id,
        body.memberId,
        body.dutyPositionId,
        body.notes
      )
      return {
        status: 201 as const,
        body: assignmentToApiFormat(assignment),
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      if (error instanceof Error && error.message.includes('already assigned')) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: error.message,
          },
        }
      }
      if (
        error instanceof Error &&
        (error.message.includes('Cannot add') || error.message.includes('is full'))
      ) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create assignment',
        },
      }
    }
  },

  updateAssignment: async ({
    params,
    body,
  }: {
    params: ScheduleAssignmentParams
    body: UpdateAssignmentInput
  }) => {
    try {
      const assignment = await scheduleService.updateAssignment(params.id, params.assignmentId, {
        dutyPositionId: body.dutyPositionId,
        status: body.status,
        notes: body.notes,
      })
      return {
        status: 200 as const,
        body: assignmentToApiFormat(assignment),
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update assignment',
        },
      }
    }
  },

  deleteAssignment: async ({ params }: { params: ScheduleAssignmentParams }) => {
    try {
      await scheduleService.deleteAssignment(params.id, params.assignmentId)
      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Assignment deleted successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      if (error instanceof Error && error.message.includes('Cannot delete')) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete assignment',
        },
      }
    }
  },

  // ==========================================================================
  // DDS Convenience Endpoints
  // ==========================================================================

  getCurrentDdsFromSchedule: async () => {
    try {
      const result = await scheduleService.getCurrentDdsFromSchedule()
      return {
        status: 200 as const,
        body: {
          dds: result.dds,
          operationalDate: result.operationalDate,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch current DDS',
        },
      }
    }
  },

  getDdsByWeek: async ({ params }: { params: DateParam }) => {
    try {
      const date = parseOperationalDate(params.date)
      const result = await scheduleService.getDdsByWeek(date)
      return {
        status: 200 as const,
        body: {
          dds: result.dds,
          operationalDate: result.operationalDate,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid')) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch DDS',
        },
      }
    }
  },

  // ==========================================================================
  // Duty Watch Convenience Endpoints
  // ==========================================================================

  getCurrentDutyWatch: async () => {
    try {
      const result = await scheduleService.getCurrentDutyWatch()
      return {
        status: 200 as const,
        body: result,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch current Duty Watch',
        },
      }
    }
  },

  getTonightDutyWatch: async () => {
    try {
      const result = await scheduleService.getTonightDutyWatch()
      return {
        status: 200 as const,
        body: result,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch tonight Duty Watch',
        },
      }
    }
  },
})
