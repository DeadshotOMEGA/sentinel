import { initContract } from '@ts-rest/core'
import {
  CreateListItemSchema,
  UpdateListItemSchema,
  ReorderListItemsSchema,
  ListItemResponseSchema,
  ListItemsResponseSchema,
  UsageCountResponseSchema,
  ListTypeParamSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
  IdParamSchema,
} from '../schemas/index.js'
import * as v from 'valibot'

const c = initContract()

/**
 * List API contract
 *
 * Defines endpoints for managing dynamic lists (event_role, rank, mess, moc)
 *
 * Business Rules (enforced in route implementation):
 * - List types: event_role, rank, mess, moc
 * - Code is auto-normalized (lowercase, underscores, no spaces)
 * - System items cannot be deleted
 * - Items in use cannot be deleted
 * - Reorder updates displayOrder sequentially
 */
export const listContract = c.router({
  /**
   * Get all list items for a specific list type
   * Includes usage count for each item
   */
  getListItems: {
    method: 'GET',
    path: '/api/lists/:listType',
    pathParams: ListTypeParamSchema,
    responses: {
      200: ListItemsResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all items for a list type',
    description:
      'Get all items for a given list type (event_role, rank, mess, moc) with usage counts. Items are ordered by displayOrder and name.',
  },

  /**
   * Create a new list item
   * NOTE: Must be before :id routes to avoid path conflicts
   */
  createListItem: {
    method: 'POST',
    path: '/api/lists/:listType',
    pathParams: ListTypeParamSchema,
    body: CreateListItemSchema,
    responses: {
      201: v.object({ item: ListItemResponseSchema }),
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      409: ErrorResponseSchema, // Duplicate code
      500: ErrorResponseSchema,
    },
    summary: 'Create a new list item',
    description:
      'Create a new list item with a unique code. Code is automatically normalized to lowercase with underscores. If displayOrder is not provided, item is appended to the end.',
  },

  /**
   * Reorder list items
   * NOTE: Must be before :id routes to avoid 'reorder' being treated as an ID
   */
  reorderListItems: {
    method: 'PUT',
    path: '/api/lists/:listType/reorder',
    pathParams: ListTypeParamSchema,
    body: ReorderListItemsSchema,
    responses: {
      200: SuccessResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Reorder list items',
    description:
      'Update the display order of list items. Provide an array of item IDs in the desired order. displayOrder will be set sequentially (1, 2, 3, ...).',
  },

  /**
   * Get usage count for a specific list item
   * NOTE: Specific path before generic :id
   */
  getListItemUsage: {
    method: 'GET',
    path: '/api/lists/:listType/:id/usage',
    pathParams: v.object({
      listType: v.pipe(v.string(), v.picklist(['visit-types', 'member-statuses', 'member-types', 'badge-statuses'] as const)),
      id: v.pipe(v.string('ID is required'), v.uuid('Invalid ID format')),
    }),
    responses: {
      200: UsageCountResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get usage count for a list item',
    description:
      'Get the number of records currently using this list item. Used to prevent deletion of items in use.',
  },

  /**
   * Update an existing list item
   */
  updateListItem: {
    method: 'PUT',
    path: '/api/lists/:listType/:id',
    pathParams: v.object({
      listType: v.pipe(v.string(), v.picklist(['visit-types', 'member-statuses', 'member-types', 'badge-statuses'] as const)),
      id: v.pipe(v.string('ID is required'), v.uuid('Invalid ID format')),
    }),
    body: UpdateListItemSchema,
    responses: {
      200: v.object({ item: ListItemResponseSchema }),
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema, // Duplicate code
      500: ErrorResponseSchema,
    },
    summary: 'Update a list item',
    description:
      'Update an existing list item. All fields are optional. If updating code, uniqueness is checked within the list type.',
  },

  /**
   * Delete a list item
   */
  deleteListItem: {
    method: 'DELETE',
    path: '/api/lists/:listType/:id',
    pathParams: v.object({
      listType: v.pipe(v.string(), v.picklist(['visit-types', 'member-statuses', 'member-types', 'badge-statuses'] as const)),
      id: v.pipe(v.string('ID is required'), v.uuid('Invalid ID format')),
    }),
    body: c.type<undefined>(),
    responses: {
      204: c.type<void>(),
      400: ErrorResponseSchema, // System item or validation error
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema, // Item in use
      500: ErrorResponseSchema,
    },
    summary: 'Delete a list item',
    description:
      'Delete a list item. System items cannot be deleted. Items currently in use cannot be deleted - reassign or delete the records using this item first.',
  },
})
