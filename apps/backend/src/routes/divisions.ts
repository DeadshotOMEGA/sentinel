import { initServer } from '@ts-rest/express'
import { divisionContract } from '@sentinel/contracts'
import type { CreateDivisionInput, UpdateDivisionInput, IdParam } from '@sentinel/contracts'
import { DivisionRepository } from '../repositories/division-repository.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()

const divisionRepo = new DivisionRepository(getPrismaClient())

/**
 * Divisions route implementation using ts-rest
 */
export const divisionsRouter = s.router(divisionContract, {
  /**
   * Get all divisions
   */
  getDivisions: async ({ query }) => {
    try {
      const page = query.page || 1
      const limit = query.limit || 50
      const divisions = await divisionRepo.findAll()

      // Get divisions with proper formatting
      const divisionsWithCounts = divisions.map((division) => ({
        id: division.id,
        code: division.code,
        name: division.name,
        description: division.description || null,
        color: null,
        createdAt: division.createdAt?.toISOString() || null,
        updatedAt: division.updatedAt?.toISOString() || null,
      }))

      const total = divisionsWithCounts.length
      const totalPages = Math.ceil(total / limit)

      return {
        status: 200 as const,
        body: {
          divisions: divisionsWithCounts,
          total,
          page,
          limit,
          totalPages,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch divisions',
        },
      }
    }
  },

  /**
   * Get single division by ID
   */
  getDivisionById: async ({ params }: { params: IdParam }) => {
    try {
      const division = await divisionRepo.findById(params.id)

      if (!division) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Division with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          id: division.id,
          code: division.code,
          name: division.name,
          description: division.description || null,
          color: null,
          createdAt: division.createdAt?.toISOString() || null,
          updatedAt: division.updatedAt?.toISOString() || null,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch division',
        },
      }
    }
  },

  /**
   * Create new division
   */
  createDivision: async ({ body }: { body: CreateDivisionInput }) => {
    try {
      const division = await divisionRepo.create({
        name: body.name,
        code: body.code,
        description: body.description,
      })

      return {
        status: 201 as const,
        body: {
          id: division.id,
          code: division.code,
          name: division.name,
          description: division.description || null,
          color: null,
          createdAt: division.createdAt?.toISOString() || null,
          updatedAt: division.updatedAt?.toISOString() || null,
        },
      }
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Division with code '${body.code}' already exists`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create division',
        },
      }
    }
  },

  /**
   * Update existing division
   */
  updateDivision: async ({ params, body }: { params: IdParam; body: UpdateDivisionInput }) => {
    try {
      const division = await divisionRepo.update(params.id, {
        name: body.name,
        code: body.code,
        description: body.description,
      })

      return {
        status: 200 as const,
        body: {
          id: division.id,
          code: division.code,
          name: division.name,
          description: division.description || null,
          color: null,
          createdAt: division.createdAt?.toISOString() || null,
          updatedAt: division.updatedAt?.toISOString() || null,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Division with ID '${params.id}' not found`,
          },
        }
      }

      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Division with code '${body.code}' already exists`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update division',
        },
      }
    }
  },

  /**
   * Delete division
   */
  deleteDivision: async ({ params }: { params: IdParam }) => {
    try {
      await divisionRepo.delete(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Division deleted successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Division with ID '${params.id}' not found`,
          },
        }
      }

      if (error instanceof Error && error.message.includes('Cannot delete division')) {
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
          message: error instanceof Error ? error.message : 'Failed to delete division',
        },
      }
    }
  },
})
