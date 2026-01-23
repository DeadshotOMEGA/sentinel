import { initServer } from '@ts-rest/express'
import { listContract } from '@sentinel/contracts'
import type { ListItem } from '@sentinel/types'
import { ListItemRepository } from '../repositories/list-item-repository.js'
import { getPrismaClient } from '../lib/database.js'
import type { ListItemResponse } from '@sentinel/contracts'

const s = initServer()

/**
 * Valid list types (from API schema)
 */
const VALID_LIST_TYPES = ['event_role', 'rank', 'mess', 'moc'] as const

/**
 * Convert repository ListItem to API response format
 */
function toApiFormat(item: ListItem, usageCount: number): ListItemResponse {
  // Ensure listType is one of the valid API list types
  const listType = item.listType
  if (!VALID_LIST_TYPES.includes(listType as (typeof VALID_LIST_TYPES)[number])) {
    throw new Error(`Invalid list type: ${listType}`)
  }

  return {
    id: item.id,
    listType: listType as (typeof VALID_LIST_TYPES)[number],
    code: item.code,
    name: item.name,
    displayOrder: item.displayOrder,
    description: item.description ?? null,
    isSystem: item.isSystem,
    usageCount,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

/**
 * Lists router implementation
 *
 * Manages dynamic lists for event_role, rank, mess, moc
 */
export const listsRouter = s.router(listContract, {
  /**
   * GET /api/lists/:listType
   * List all items for a list type with usage counts
   */
  getListItems: async ({ params }) => {
    try {
      const listItemRepo = new ListItemRepository(getPrismaClient())
      const items = await listItemRepo.findByType(params.listType)

      // Add usage count to each item
      const itemsWithUsage = await Promise.all(
        items.map(async (item) => {
          const usageCount = await listItemRepo.getUsageCount(item.id)
          return toApiFormat(item, usageCount)
        })
      )

      return {
        status: 200 as const,
        body: {
          items: itemsWithUsage,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch list items',
        },
      }
    }
  },

  /**
   * POST /api/lists/:listType
   * Create a new list item
   */
  createListItem: async ({ params, body }) => {
    try {
      const listItemRepo = new ListItemRepository(getPrismaClient())

      // Check for duplicate code (unique within list type)
      const existing = await listItemRepo.findByTypeAndCode(params.listType, body.code)
      if (existing) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `A list item with code "${body.code}" already exists in ${params.listType}`,
          },
        }
      }

      // Create the item
      // Note: Repository takes listType separately, not in the data object
      const item = await listItemRepo.create(params.listType, {
        code: body.code,
        name: body.name,
        displayOrder: body.displayOrder,
        description: body.description,
        isSystem: body.isSystem,
      })

      // Get usage count (will be 0 for new item)
      const usageCount = 0

      return {
        status: 201 as const,
        body: {
          item: toApiFormat(item, usageCount),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create list item',
        },
      }
    }
  },

  /**
   * PUT /api/lists/:listType/reorder
   * Reorder list items (update displayOrder)
   */
  reorderListItems: async ({ params, body }) => {
    try {
      const listItemRepo = new ListItemRepository(getPrismaClient())

      // Reorder the items
      await listItemRepo.reorder(params.listType, body.itemIds)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'List items reordered successfully',
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to reorder list items',
        },
      }
    }
  },

  /**
   * GET /api/lists/:listType/:id/usage
   * Get usage count for a list item
   */
  getListItemUsage: async ({ params }) => {
    try {
      const listItemRepo = new ListItemRepository(getPrismaClient())

      // Check if item exists
      const item = await listItemRepo.findById(params.id)
      if (!item) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `List item with ID '${params.id}' not found`,
          },
        }
      }

      // Get usage count
      const usageCount = await listItemRepo.getUsageCount(params.id)

      return {
        status: 200 as const,
        body: {
          usageCount,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get usage count',
        },
      }
    }
  },

  /**
   * PUT /api/lists/:listType/:id
   * Update an existing list item
   */
  updateListItem: async ({ params, body }) => {
    try {
      const listItemRepo = new ListItemRepository(getPrismaClient())

      // Check if item exists
      const existing = await listItemRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `List item with ID '${params.id}' not found`,
          },
        }
      }

      // If updating code, check for duplicates
      if (body.code && body.code !== existing.code) {
        const conflict = await listItemRepo.findByTypeAndCode(params.listType, body.code)
        if (conflict) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: `A list item with code "${body.code}" already exists in ${params.listType}`,
            },
          }
        }
      }

      // Update the item
      const updated = await listItemRepo.update(params.id, {
        code: body.code,
        name: body.name,
        displayOrder: body.displayOrder,
        description: body.description,
      })

      // Get usage count
      const usageCount = await listItemRepo.getUsageCount(params.id)

      return {
        status: 200 as const,
        body: {
          item: toApiFormat(updated, usageCount),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update list item',
        },
      }
    }
  },

  /**
   * DELETE /api/lists/:listType/:id
   * Delete a list item
   */
  deleteListItem: async ({ params }) => {
    try {
      const listItemRepo = new ListItemRepository(getPrismaClient())

      // Check if item exists
      const existing = await listItemRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `List item with ID '${params.id}' not found`,
          },
        }
      }

      // Cannot delete system items
      if (existing.isSystem) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message:
              'Cannot delete system items. System items are protected and cannot be deleted.',
          },
        }
      }

      // Check usage count
      const usageCount = await listItemRepo.getUsageCount(params.id)
      if (usageCount > 0) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Cannot delete this item. It is currently in use by ${usageCount} records. You must first reassign or delete the records using this item.`,
          },
        }
      }

      // Delete the item
      await listItemRepo.delete(params.id)

      return {
        status: 204 as const,
        body: undefined,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete list item',
        },
      }
    }
  },
})
