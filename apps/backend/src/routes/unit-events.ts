import { initServer } from '@ts-rest/express'
import { unitEventContract } from '@sentinel/contracts'
import type {
  UnitEventListQuery,
  UnitEventIdParam,
  UnitEventPositionParams,
  UnitEventAssignmentParams,
  CreateUnitEventInput,
  UpdateUnitEventInput,
  UpdateUnitEventStatusInput,
  CreateUnitEventPositionInput,
  UpdateUnitEventPositionInput,
  CreateUnitEventAssignmentInput,
} from '@sentinel/contracts'
import { UnitEventService } from '../services/unit-event-service.js'
import { getPrismaClient } from '../lib/database.js'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js'

const s = initServer()

const unitEventService = new UnitEventService(getPrismaClient())

// ============================================================================
// Helper Functions
// ============================================================================

function eventTypeToApiFormat(et: {
  id: string
  name: string
  category: string
  defaultDurationMinutes: number
  requiresDutyWatch: boolean
  defaultMetadata: unknown
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: et.id,
    name: et.name,
    category: et.category as 'mess_dinner' | 'ceremonial' | 'training' | 'social' | 'exercise' | 'vip_visit' | 'remembrance' | 'administrative' | 'other',
    defaultDurationMinutes: et.defaultDurationMinutes,
    requiresDutyWatch: et.requiresDutyWatch,
    defaultMetadata: (et.defaultMetadata as Record<string, unknown>) ?? null,
    displayOrder: et.displayOrder,
    createdAt: et.createdAt.toISOString(),
    updatedAt: et.updatedAt.toISOString(),
  }
}

function eventToApiFormat(event: {
  id: string
  title: string
  eventTypeId: string | null
  eventDate: Date
  startTime: Date | null
  endTime: Date | null
  location: string | null
  description: string | null
  organizer: string | null
  requiresDutyWatch: boolean
  status: string
  metadata: unknown
  notes: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  eventType: { id: string; name: string; category: string } | null
}) {
  return {
    id: event.id,
    title: event.title,
    eventTypeId: event.eventTypeId,
    eventDate: event.eventDate.toISOString().substring(0, 10),
    startTime: event.startTime ? event.startTime.toISOString().substring(11, 16) : null,
    endTime: event.endTime ? event.endTime.toISOString().substring(11, 16) : null,
    location: event.location,
    description: event.description,
    organizer: event.organizer,
    requiresDutyWatch: event.requiresDutyWatch,
    status: event.status as 'draft' | 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'postponed',
    metadata: (event.metadata as Record<string, unknown>) ?? null,
    notes: event.notes,
    createdBy: event.createdBy,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    eventType: event.eventType,
  }
}

function positionToApiFormat(pos: {
  id: string
  eventId: string
  code: string
  name: string
  description: string | null
  maxSlots: number
  isStandard: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: pos.id,
    eventId: pos.eventId,
    code: pos.code,
    name: pos.name,
    description: pos.description,
    maxSlots: pos.maxSlots,
    isStandard: pos.isStandard,
    displayOrder: pos.displayOrder,
    createdAt: pos.createdAt.toISOString(),
    updatedAt: pos.updatedAt.toISOString(),
  }
}

function assignmentToApiFormat(a: {
  id: string
  eventId: string
  eventDutyPositionId: string | null
  memberId: string
  status: string
  isVolunteer: boolean
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
  eventDutyPosition: { id: string; code: string; name: string } | null
}) {
  return {
    id: a.id,
    eventId: a.eventId,
    eventDutyPositionId: a.eventDutyPositionId,
    memberId: a.memberId,
    status: a.status as 'assigned' | 'confirmed' | 'declined' | 'released',
    isVolunteer: a.isVolunteer,
    confirmedAt: a.confirmedAt?.toISOString() ?? null,
    releasedAt: a.releasedAt?.toISOString() ?? null,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    member: a.member,
    eventDutyPosition: a.eventDutyPosition,
  }
}

function eventWithDetailsToApiFormat(event: {
  id: string
  title: string
  eventTypeId: string | null
  eventDate: Date
  startTime: Date | null
  endTime: Date | null
  location: string | null
  description: string | null
  organizer: string | null
  requiresDutyWatch: boolean
  status: string
  metadata: unknown
  notes: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  eventType: { id: string; name: string; category: string } | null
  dutyPositions: Array<{
    id: string
    eventId: string
    code: string
    name: string
    description: string | null
    maxSlots: number
    isStandard: boolean
    displayOrder: number
    createdAt: Date
    updatedAt: Date
  }>
  dutyAssignments: Array<{
    id: string
    eventId: string
    eventDutyPositionId: string | null
    memberId: string
    status: string
    isVolunteer: boolean
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
    eventDutyPosition: { id: string; code: string; name: string } | null
  }>
}) {
  return {
    ...eventToApiFormat(event),
    dutyPositions: event.dutyPositions.map(positionToApiFormat),
    dutyAssignments: event.dutyAssignments.map(assignmentToApiFormat),
  }
}

function handleError(error: unknown) {
  if (error instanceof NotFoundError) {
    return {
      status: 404 as const,
      body: { error: 'NOT_FOUND', message: error.message },
    }
  }
  if (error instanceof ValidationError) {
    return {
      status: 400 as const,
      body: { error: 'VALIDATION_ERROR', message: error.message },
    }
  }
  if (error instanceof ConflictError) {
    return {
      status: 409 as const,
      body: { error: 'CONFLICT', message: error.message },
    }
  }
  return {
    status: 500 as const,
    body: {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    },
  }
}

// ============================================================================
// Router
// ============================================================================

export const unitEventsRouter = s.router(unitEventContract, {
  // ==========================================================================
  // Event Types
  // ==========================================================================

  listEventTypes: async () => {
    try {
      const types = await unitEventService.getAllEventTypes()
      return {
        status: 200 as const,
        body: { data: types.map(eventTypeToApiFormat) },
      }
    } catch (error) {
      return handleError(error)
    }
  },

  // ==========================================================================
  // Unit Events CRUD
  // ==========================================================================

  listUnitEvents: async ({ query }: { query: UnitEventListQuery }) => {
    try {
      const result = await unitEventService.listEvents({
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        category: query.category,
        status: query.status,
        requiresDutyWatch: query.requiresDutyWatch,
        limit: query.limit,
        offset: query.offset,
      })
      return {
        status: 200 as const,
        body: {
          data: result.data.map(eventToApiFormat),
          total: result.total,
        },
      }
    } catch (error) {
      return handleError(error)
    }
  },

  createUnitEvent: async ({ body }: { body: CreateUnitEventInput }) => {
    try {
      const event = await unitEventService.createEvent({
        title: body.title,
        eventTypeId: body.eventTypeId ?? null,
        eventDate: new Date(body.eventDate),
        startTime: body.startTime ? new Date(`1970-01-01T${body.startTime}:00`) : null,
        endTime: body.endTime ? new Date(`1970-01-01T${body.endTime}:00`) : null,
        location: body.location ?? null,
        description: body.description ?? null,
        organizer: body.organizer ?? null,
        requiresDutyWatch: body.requiresDutyWatch,
        status: body.status,
        metadata: body.metadata ?? null,
        notes: body.notes ?? null,
      })
      return {
        status: 201 as const,
        body: eventWithDetailsToApiFormat(event),
      }
    } catch (error) {
      return handleError(error)
    }
  },

  getUnitEvent: async ({ params }: { params: UnitEventIdParam }) => {
    try {
      const event = await unitEventService.getEvent(params.id)
      return {
        status: 200 as const,
        body: eventWithDetailsToApiFormat(event),
      }
    } catch (error) {
      return handleError(error)
    }
  },

  updateUnitEvent: async ({ params, body }: { params: UnitEventIdParam; body: UpdateUnitEventInput }) => {
    try {
      const event = await unitEventService.updateEvent(params.id, {
        title: body.title,
        eventTypeId: body.eventTypeId,
        eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
        startTime: body.startTime !== undefined ? (body.startTime ? new Date(`1970-01-01T${body.startTime}:00`) : null) : undefined,
        endTime: body.endTime !== undefined ? (body.endTime ? new Date(`1970-01-01T${body.endTime}:00`) : null) : undefined,
        location: body.location,
        description: body.description,
        organizer: body.organizer,
        requiresDutyWatch: body.requiresDutyWatch,
        metadata: body.metadata,
        notes: body.notes,
      })
      return {
        status: 200 as const,
        body: eventWithDetailsToApiFormat(event),
      }
    } catch (error) {
      return handleError(error)
    }
  },

  deleteUnitEvent: async ({ params }: { params: UnitEventIdParam }) => {
    try {
      await unitEventService.deleteEvent(params.id)
      return {
        status: 200 as const,
        body: { success: true, message: 'Event deleted successfully' },
      }
    } catch (error) {
      return handleError(error)
    }
  },

  updateUnitEventStatus: async ({ params, body }: { params: UnitEventIdParam; body: UpdateUnitEventStatusInput }) => {
    try {
      const event = await unitEventService.updateEventStatus(params.id, body.status)
      return {
        status: 200 as const,
        body: eventWithDetailsToApiFormat(event),
      }
    } catch (error) {
      return handleError(error)
    }
  },

  // ==========================================================================
  // Event Duty Positions
  // ==========================================================================

  createEventPosition: async ({ params, body }: { params: UnitEventIdParam; body: CreateUnitEventPositionInput }) => {
    try {
      const position = await unitEventService.createPosition(params.id, {
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        maxSlots: body.maxSlots,
      })
      return {
        status: 201 as const,
        body: positionToApiFormat(position),
      }
    } catch (error) {
      return handleError(error)
    }
  },

  updateEventPosition: async ({ params, body }: { params: UnitEventPositionParams; body: UpdateUnitEventPositionInput }) => {
    try {
      const position = await unitEventService.updatePosition(params.id, params.positionId, {
        name: body.name,
        description: body.description,
        maxSlots: body.maxSlots,
      })
      return {
        status: 200 as const,
        body: positionToApiFormat(position),
      }
    } catch (error) {
      return handleError(error)
    }
  },

  deleteEventPosition: async ({ params }: { params: UnitEventPositionParams }) => {
    try {
      await unitEventService.deletePosition(params.id, params.positionId)
      return {
        status: 200 as const,
        body: { success: true, message: 'Position deleted successfully' },
      }
    } catch (error) {
      return handleError(error)
    }
  },

  // ==========================================================================
  // Event Duty Assignments
  // ==========================================================================

  createEventAssignment: async ({ params, body }: { params: UnitEventIdParam; body: CreateUnitEventAssignmentInput }) => {
    try {
      const assignment = await unitEventService.createAssignment(params.id, {
        eventDutyPositionId: body.eventDutyPositionId ?? null,
        memberId: body.memberId,
        isVolunteer: body.isVolunteer,
        notes: body.notes ?? null,
      })
      return {
        status: 201 as const,
        body: assignmentToApiFormat(assignment),
      }
    } catch (error) {
      return handleError(error)
    }
  },

  deleteEventAssignment: async ({ params }: { params: UnitEventAssignmentParams }) => {
    try {
      await unitEventService.deleteAssignment(params.id, params.assignmentId)
      return {
        status: 200 as const,
        body: { success: true, message: 'Assignment removed successfully' },
      }
    } catch (error) {
      return handleError(error)
    }
  },
})
