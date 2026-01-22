import { initServer } from '@ts-rest/express'
import { eventContract } from '@sentinel/contracts'
import type {
  CreateEventInput,
  UpdateEventInput,
  CreateAttendeeInput,
  UpdateAttendeeInput,
  AssignBadgeToAttendeeInput,
  IdParam,
} from '@sentinel/contracts'
import { EventService } from '../services/event-service.js'
import { EventRepository } from '../repositories/event-repository.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()

const eventService = new EventService(getPrismaClient())
const eventRepo = new EventRepository(getPrismaClient())

/**
 * Events route implementation using ts-rest
 */
export const eventsRouter = s.router(eventContract, {
  /**
   * Get available badges for assignment (specific route before /:id)
   */
  getAvailableBadges: async () => {
    try {
      const badges = await eventService.getAvailableBadges(100)

      return {
        status: 200 as const,
        body: {
          badges,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch available badges',
        },
      }
    }
  },

  /**
   * Get all events
   */
  getEvents: async () => {
    try {
      const events = await eventRepo.findAll()

      return {
        status: 200 as const,
        body: {
          events: events.map((e) => ({
            id: e.id,
            name: e.name,
            code: e.code,
            description: e.description ?? null,
            startDate: e.startDate.toISOString(),
            endDate: e.endDate.toISOString(),
            status: e.status,
            autoExpireBadges: e.autoExpireBadges ?? true,
            customRoles: e.customRoles ?? null,
            createdBy: e.createdBy ?? null,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
          })),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch events',
        },
      }
    }
  },

  /**
   * Create new event
   */
  createEvent: async ({ body }: { body: CreateEventInput }) => {
    try {
      eventService.validateEventDates(new Date(body.startDate), new Date(body.endDate))

      const event = await eventRepo.create({
        name: body.name,
        code: body.code,
        description: body.description,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        status: body.status || 'draft',
        autoExpireBadges: body.autoExpireBadges ?? true,
        customRoles: body.customRoles,
        createdBy: body.createdBy,
      })

      return {
        status: 201 as const,
        body: {
          id: event.id,
          name: event.name,
          code: event.code,
          description: event.description ?? null,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          status: event.status,
          autoExpireBadges: event.autoExpireBadges ?? true,
          customRoles: event.customRoles ?? null,
          createdBy: event.createdBy ?? null,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Event with code '${body.code}' already exists`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create event',
        },
      }
    }
  },

  /**
   * Close event
   */
  closeEvent: async ({ params }: { params: IdParam }) => {
    try {
      const result = await eventService.closeEvent(params.id)

      return {
        status: 200 as const,
        body: {
          event: {
            id: result.event.id,
            name: result.event.name,
            code: result.event.code,
            description: result.event.description ?? null,
            startDate: result.event.startDate.toISOString(),
            endDate: result.event.endDate.toISOString(),
            status: result.event.status,
            autoExpireBadges: result.event.autoExpireBadges ?? true,
            customRoles: result.event.customRoles ?? null,
            createdBy: result.event.createdBy ?? null,
            createdAt: result.event.createdAt.toISOString(),
            updatedAt: result.event.updatedAt.toISOString(),
          },
          expiredCount: result.expiredCount,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Event with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to close event',
        },
      }
    }
  },

  /**
   * Get event presence statistics
   */
  getEventStats: async ({ params }: { params: IdParam }) => {
    try {
      const stats = await eventService.getEventPresenceStats(params.id)

      return {
        status: 200 as const,
        body: stats,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Event with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch event stats',
        },
      }
    }
  },

  /**
   * Get event attendees
   */
  getEventAttendees: async ({ params }: { params: IdParam }) => {
    try {
      const attendees = await eventRepo.findByEventId(params.id)

      return {
        status: 200 as const,
        body: {
          attendees: attendees.map((a) => ({
            id: a.id,
            eventId: a.eventId,
            name: a.name,
            rank: a.rank ?? null,
            organization: a.organization,
            role: a.role,
            badgeId: a.badgeId ?? null,
            badgeAssignedAt: a.badgeAssignedAt?.toISOString() ?? null,
            accessStart: a.accessStart?.toISOString() ?? null,
            accessEnd: a.accessEnd?.toISOString() ?? null,
            status: a.status,
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
          })),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch attendees',
        },
      }
    }
  },

  /**
   * Add attendee to event
   */
  addAttendee: async ({ body }: { body: CreateAttendeeInput }) => {
    try {
      const attendee = await eventRepo.addAttendee({
        eventId: body.eventId,
        name: body.name,
        rank: body.rank,
        organization: body.organization,
        role: body.role,
        badgeId: body.badgeId,
        badgeAssignedAt: body.badgeAssignedAt ? new Date(body.badgeAssignedAt) : undefined,
        accessStart: body.accessStart ? new Date(body.accessStart) : undefined,
        accessEnd: body.accessEnd ? new Date(body.accessEnd) : undefined,
        status: body.status || 'pending',
      })

      return {
        status: 201 as const,
        body: {
          id: attendee.id,
          eventId: attendee.eventId,
          name: attendee.name,
          rank: attendee.rank ?? null,
          organization: attendee.organization,
          role: attendee.role,
          badgeId: attendee.badgeId ?? null,
          badgeAssignedAt: attendee.badgeAssignedAt?.toISOString() ?? null,
          accessStart: attendee.accessStart?.toISOString() ?? null,
          accessEnd: attendee.accessEnd?.toISOString() ?? null,
          status: attendee.status,
          createdAt: attendee.createdAt.toISOString(),
          updatedAt: attendee.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to add attendee',
        },
      }
    }
  },

  /**
   * Assign badge to attendee
   */
  assignBadgeToAttendee: async ({
    params,
    body,
  }: {
    params: { id: string; attendeeId: string }
    body: AssignBadgeToAttendeeInput
  }) => {
    try {
      const attendee = await eventService.assignBadgeToAttendee(
        params.id,
        params.attendeeId,
        body.badgeId
      )

      return {
        status: 200 as const,
        body: {
          id: attendee.id,
          eventId: attendee.eventId,
          name: attendee.name,
          rank: attendee.rank ?? null,
          organization: attendee.organization,
          role: attendee.role,
          badgeId: attendee.badgeId ?? null,
          badgeAssignedAt: attendee.badgeAssignedAt?.toISOString() ?? null,
          accessStart: attendee.accessStart?.toISOString() ?? null,
          accessEnd: attendee.accessEnd?.toISOString() ?? null,
          status: attendee.status,
          createdAt: attendee.createdAt.toISOString(),
          updatedAt: attendee.updatedAt.toISOString(),
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

      if (error instanceof Error && error.message.includes('already assigned')) {
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
          message: error instanceof Error ? error.message : 'Failed to assign badge',
        },
      }
    }
  },

  /**
   * Unassign badge from attendee
   */
  unassignBadgeFromAttendee: async ({ params }: { params: { id: string; attendeeId: string } }) => {
    try {
      const attendee = await eventService.unassignBadgeFromAttendee(params.id, params.attendeeId)

      return {
        status: 200 as const,
        body: {
          id: attendee.id,
          eventId: attendee.eventId,
          name: attendee.name,
          rank: attendee.rank ?? null,
          organization: attendee.organization,
          role: attendee.role,
          badgeId: attendee.badgeId ?? null,
          badgeAssignedAt: attendee.badgeAssignedAt?.toISOString() ?? null,
          accessStart: attendee.accessStart?.toISOString() ?? null,
          accessEnd: attendee.accessEnd?.toISOString() ?? null,
          status: attendee.status,
          createdAt: attendee.createdAt.toISOString(),
          updatedAt: attendee.updatedAt.toISOString(),
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
          message: error instanceof Error ? error.message : 'Failed to unassign badge',
        },
      }
    }
  },

  /**
   * Update attendee
   */
  updateAttendee: async ({
    params,
    body,
  }: {
    params: { id: string; attendeeId: string }
    body: UpdateAttendeeInput
  }) => {
    try {
      const attendee = await eventRepo.updateAttendee(params.attendeeId, {
        name: body.name,
        rank: body.rank,
        organization: body.organization,
        role: body.role,
        badgeId: body.badgeId,
        badgeAssignedAt: body.badgeAssignedAt ? new Date(body.badgeAssignedAt) : undefined,
        accessStart: body.accessStart ? new Date(body.accessStart) : undefined,
        accessEnd: body.accessEnd ? new Date(body.accessEnd) : undefined,
        status: body.status,
      })

      return {
        status: 200 as const,
        body: {
          id: attendee.id,
          eventId: attendee.eventId,
          name: attendee.name,
          rank: attendee.rank ?? null,
          organization: attendee.organization,
          role: attendee.role,
          badgeId: attendee.badgeId ?? null,
          badgeAssignedAt: attendee.badgeAssignedAt?.toISOString() ?? null,
          accessStart: attendee.accessStart?.toISOString() ?? null,
          accessEnd: attendee.accessEnd?.toISOString() ?? null,
          status: attendee.status,
          createdAt: attendee.createdAt.toISOString(),
          updatedAt: attendee.updatedAt.toISOString(),
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
          message: error instanceof Error ? error.message : 'Failed to update attendee',
        },
      }
    }
  },

  /**
   * Remove attendee from event
   */
  removeAttendee: async ({ params }: { params: { id: string; attendeeId: string } }) => {
    try {
      await eventRepo.removeAttendee(params.attendeeId)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Attendee removed successfully',
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
          message: error instanceof Error ? error.message : 'Failed to remove attendee',
        },
      }
    }
  },

  /**
   * Get event by ID
   */
  getEventById: async ({ params }: { params: IdParam }) => {
    try {
      const event = await eventRepo.findById(params.id)

      if (!event) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Event with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          id: event.id,
          name: event.name,
          code: event.code,
          description: event.description ?? null,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          status: event.status,
          autoExpireBadges: event.autoExpireBadges ?? true,
          customRoles: event.customRoles ?? null,
          createdBy: event.createdBy ?? null,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch event',
        },
      }
    }
  },

  /**
   * Update event
   */
  updateEvent: async ({ params, body }: { params: IdParam; body: UpdateEventInput }) => {
    try {
      if (body.startDate && body.endDate) {
        eventService.validateEventDates(new Date(body.startDate), new Date(body.endDate))
      }

      const event = await eventRepo.update(params.id, {
        name: body.name,
        code: body.code,
        description: body.description,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        status: body.status,
        autoExpireBadges: body.autoExpireBadges,
        customRoles: body.customRoles,
      })

      return {
        status: 200 as const,
        body: {
          id: event.id,
          name: event.name,
          code: event.code,
          description: event.description ?? null,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          status: event.status,
          autoExpireBadges: event.autoExpireBadges ?? true,
          customRoles: event.customRoles ?? null,
          createdBy: event.createdBy ?? null,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
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
          message: error instanceof Error ? error.message : 'Failed to update event',
        },
      }
    }
  },

  /**
   * Delete event
   */
  deleteEvent: async ({ params }: { params: IdParam }) => {
    try {
      await eventRepo.delete(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Event deleted successfully',
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
          message: error instanceof Error ? error.message : 'Failed to delete event',
        },
      }
    }
  },
})
