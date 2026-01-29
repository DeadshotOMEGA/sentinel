import { initContract } from '@ts-rest/core'
import {
  UnitEventTypeListResponseSchema,
  UnitEventWithDetailsResponseSchema,
  UnitEventListResponseSchema,
  UnitEventDutyPositionResponseSchema,
  UnitEventDutyAssignmentResponseSchema,
  CreateUnitEventInputSchema,
  UpdateUnitEventInputSchema,
  UpdateUnitEventStatusInputSchema,
  CreateUnitEventPositionInputSchema,
  UpdateUnitEventPositionInputSchema,
  CreateUnitEventAssignmentInputSchema,
  UnitEventListQuerySchema,
  UnitEventIdParamSchema,
  UnitEventPositionParamsSchema,
  UnitEventAssignmentParamsSchema,
  ErrorResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Unit Event API contract
 *
 * Endpoints for managing unit events (mess dinners, ceremonies, exercises, etc.)
 * and their duty watch assignments.
 */
export const unitEventContract = c.router({
  // ==========================================================================
  // Event Types
  // ==========================================================================

  /**
   * List event type templates
   */
  listEventTypes: {
    method: 'GET',
    path: '/api/unit-events/types',
    responses: {
      200: UnitEventTypeListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List event types',
    description: 'Get all event type templates (mess dinner, ceremonial, etc.)',
  },

  // ==========================================================================
  // Unit Events CRUD
  // ==========================================================================

  /**
   * List unit events
   */
  listUnitEvents: {
    method: 'GET',
    path: '/api/unit-events',
    query: UnitEventListQuerySchema,
    responses: {
      200: UnitEventListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List unit events',
    description: 'Get unit events with optional filters (date range, category, status)',
  },

  /**
   * Create unit event
   */
  createUnitEvent: {
    method: 'POST',
    path: '/api/unit-events',
    body: CreateUnitEventInputSchema,
    responses: {
      201: UnitEventWithDetailsResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create unit event',
    description: 'Create a new unit event. Auto-populates duty positions from template if requiresDutyWatch is true.',
  },

  /**
   * Get unit event with details
   */
  getUnitEvent: {
    method: 'GET',
    path: '/api/unit-events/:id',
    pathParams: UnitEventIdParamSchema,
    responses: {
      200: UnitEventWithDetailsResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get unit event',
    description: 'Get a unit event with duty positions and assignments',
  },

  /**
   * Update unit event
   */
  updateUnitEvent: {
    method: 'PATCH',
    path: '/api/unit-events/:id',
    pathParams: UnitEventIdParamSchema,
    body: UpdateUnitEventInputSchema,
    responses: {
      200: UnitEventWithDetailsResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update unit event',
    description: 'Update unit event details',
  },

  /**
   * Delete unit event
   */
  deleteUnitEvent: {
    method: 'DELETE',
    path: '/api/unit-events/:id',
    pathParams: UnitEventIdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: c.type<{ success: boolean; message: string }>(),
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete unit event',
    description: 'Delete a unit event and all its positions/assignments (cascade)',
  },

  /**
   * Update unit event status
   */
  updateUnitEventStatus: {
    method: 'PUT',
    path: '/api/unit-events/:id/status',
    pathParams: UnitEventIdParamSchema,
    body: UpdateUnitEventStatusInputSchema,
    responses: {
      200: UnitEventWithDetailsResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update event status',
    description: 'Transition event status (validates state machine: draft → planned → confirmed → in_progress → completed)',
  },

  // ==========================================================================
  // Event Duty Positions
  // ==========================================================================

  /**
   * Add duty position to event
   */
  createEventPosition: {
    method: 'POST',
    path: '/api/unit-events/:id/positions',
    pathParams: UnitEventIdParamSchema,
    body: CreateUnitEventPositionInputSchema,
    responses: {
      201: UnitEventDutyPositionResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Add event duty position',
    description: 'Add a custom duty position to an event',
  },

  /**
   * Update duty position
   */
  updateEventPosition: {
    method: 'PUT',
    path: '/api/unit-events/:id/positions/:positionId',
    pathParams: UnitEventPositionParamsSchema,
    body: UpdateUnitEventPositionInputSchema,
    responses: {
      200: UnitEventDutyPositionResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update event duty position',
    description: 'Update a duty position on an event',
  },

  /**
   * Delete duty position
   */
  deleteEventPosition: {
    method: 'DELETE',
    path: '/api/unit-events/:id/positions/:positionId',
    pathParams: UnitEventPositionParamsSchema,
    body: c.type<undefined>(),
    responses: {
      200: c.type<{ success: boolean; message: string }>(),
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete event duty position',
    description: 'Remove a duty position from an event (cascades assignments)',
  },

  // ==========================================================================
  // Event Duty Assignments
  // ==========================================================================

  /**
   * Assign member to event duty position
   */
  createEventAssignment: {
    method: 'POST',
    path: '/api/unit-events/:id/assignments',
    pathParams: UnitEventIdParamSchema,
    body: CreateUnitEventAssignmentInputSchema,
    responses: {
      201: UnitEventDutyAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Assign member to event',
    description: 'Assign a member to a duty position on an event (checks for conflicts)',
  },

  /**
   * Remove assignment from event
   */
  deleteEventAssignment: {
    method: 'DELETE',
    path: '/api/unit-events/:id/assignments/:assignmentId',
    pathParams: UnitEventAssignmentParamsSchema,
    body: c.type<undefined>(),
    responses: {
      200: c.type<{ success: boolean; message: string }>(),
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Remove event assignment',
    description: 'Remove a member assignment from an event',
  },
})
