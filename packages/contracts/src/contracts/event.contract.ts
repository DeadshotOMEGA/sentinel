import { initContract } from '@ts-rest/core'
import {
  CreateEventSchema,
  UpdateEventSchema,
  EventResponseSchema,
  CreateAttendeeSchema,
  UpdateAttendeeSchema,
  AttendeeResponseSchema,
  AssignBadgeToAttendeeSchema,
  EventPresenceStatsResponseSchema,
  CloseEventResponseSchema,
  EventListResponseSchema,
  AttendeeListResponseSchema,
  AvailableBadgesResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
  SuccessResponseSchema,
} from '../schemas/index.js'
import * as v from 'valibot'

const c = initContract()

/**
 * Attendee ID parameter schema
 */
const AttendeeIdParamSchema = v.object({
  id: v.pipe(v.string('Event ID is required'), v.uuid('Invalid event ID')),
  attendeeId: v.pipe(v.string('Attendee ID is required'), v.uuid('Invalid attendee ID')),
})

/**
 * Event API contract
 *
 * Defines all event-related endpoints with request/response schemas
 */
export const eventContract = c.router({
  /**
   * Get available badges for assignment
   * MUST be before /:id route
   */
  getAvailableBadges: {
    method: 'GET',
    path: '/api/events/badges/available',
    responses: {
      200: AvailableBadgesResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get available badges',
    description: 'Get list of available badges for assignment to event attendees',
  },

  /**
   * Get all events
   */
  getEvents: {
    method: 'GET',
    path: '/api/events',
    responses: {
      200: EventListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all events',
    description: 'Get list of all events',
  },

  /**
   * Create new event
   */
  createEvent: {
    method: 'POST',
    path: '/api/events',
    body: CreateEventSchema,
    responses: {
      201: EventResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create new event',
    description: 'Create a new event with the provided information',
  },

  /**
   * Close an event (specific path before /:id)
   */
  closeEvent: {
    method: 'POST',
    path: '/api/events/:id/close',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: CloseEventResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Close event',
    description: 'Close an event and optionally expire all attendee badges',
  },

  /**
   * Get event presence statistics
   */
  getEventStats: {
    method: 'GET',
    path: '/api/events/:id/stats',
    pathParams: IdParamSchema,
    responses: {
      200: EventPresenceStatsResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get event presence stats',
    description: 'Get presence statistics for an event (total, active, checked out, expired)',
  },

  /**
   * Get event attendees
   */
  getEventAttendees: {
    method: 'GET',
    path: '/api/events/:id/attendees',
    pathParams: IdParamSchema,
    responses: {
      200: AttendeeListResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get event attendees',
    description: 'Get list of all attendees for an event',
  },

  /**
   * Add attendee to event
   */
  addAttendee: {
    method: 'POST',
    path: '/api/events/:id/attendees',
    pathParams: IdParamSchema,
    body: CreateAttendeeSchema,
    responses: {
      201: AttendeeResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Add attendee to event',
    description: 'Add a new attendee to an event',
  },

  /**
   * Assign badge to attendee
   */
  assignBadgeToAttendee: {
    method: 'POST',
    path: '/api/events/:id/attendees/:attendeeId/assign-badge',
    pathParams: AttendeeIdParamSchema,
    body: AssignBadgeToAttendeeSchema,
    responses: {
      200: AttendeeResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Assign badge to attendee',
    description: 'Assign a badge to an event attendee',
  },

  /**
   * Unassign badge from attendee
   */
  unassignBadgeFromAttendee: {
    method: 'DELETE',
    path: '/api/events/:id/attendees/:attendeeId/badge',
    pathParams: AttendeeIdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: AttendeeResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Unassign badge from attendee',
    description: 'Unassign the badge from an event attendee',
  },

  /**
   * Update attendee
   */
  updateAttendee: {
    method: 'PATCH',
    path: '/api/events/:id/attendees/:attendeeId',
    pathParams: AttendeeIdParamSchema,
    body: UpdateAttendeeSchema,
    responses: {
      200: AttendeeResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update attendee',
    description: 'Update an event attendee',
  },

  /**
   * Remove attendee from event
   */
  removeAttendee: {
    method: 'DELETE',
    path: '/api/events/:id/attendees/:attendeeId',
    pathParams: AttendeeIdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Remove attendee',
    description: 'Remove an attendee from an event',
  },

  /**
   * Get event by ID
   */
  getEventById: {
    method: 'GET',
    path: '/api/events/:id',
    pathParams: IdParamSchema,
    responses: {
      200: EventResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get event by ID',
    description: 'Retrieve a single event by its unique ID',
  },

  /**
   * Update event
   */
  updateEvent: {
    method: 'PATCH',
    path: '/api/events/:id',
    pathParams: IdParamSchema,
    body: UpdateEventSchema,
    responses: {
      200: EventResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update event',
    description: 'Update an existing event with the provided information',
  },

  /**
   * Delete event
   */
  deleteEvent: {
    method: 'DELETE',
    path: '/api/events/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete event',
    description: 'Delete an event',
  },
})
