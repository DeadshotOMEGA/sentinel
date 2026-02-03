import { initContract } from '@ts-rest/core'
import {
  TagListResponseSchema,
  MemberTagListResponseSchema,
  MemberTagResponseSchema,
  AssignTagInputSchema,
  TagMemberIdParamSchema,
  MemberTagIdParamSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Tag API Contract
 *
 * Endpoints for managing tags and member tag assignments.
 */
export const tagContract = c.router({
  // ============================================================================
  // Tags (Reference Data)
  // ============================================================================

  /**
   * Get all tags
   */
  getTags: {
    method: 'GET',
    path: '/api/tags',
    responses: {
      200: TagListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all tags',
    description: 'Get all available tags ordered by display order',
  },

  // ============================================================================
  // Member Tags
  // ============================================================================

  /**
   * Get tags for a specific member
   */
  getMemberTags: {
    method: 'GET',
    path: '/api/members/:memberId/tags',
    pathParams: TagMemberIdParamSchema,
    responses: {
      200: MemberTagListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get member tags',
    description: 'Get all tags assigned to a specific member',
  },

  /**
   * Assign a tag to a member
   */
  assignTag: {
    method: 'POST',
    path: '/api/members/:memberId/tags',
    pathParams: TagMemberIdParamSchema,
    body: AssignTagInputSchema,
    responses: {
      201: MemberTagResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema, // Already has this tag
      500: ErrorResponseSchema,
    },
    summary: 'Assign tag to member',
    description: 'Assign a tag to a member',
  },

  /**
   * Remove a tag from a member
   */
  removeTag: {
    method: 'DELETE',
    path: '/api/members/:memberId/tags/:tagId',
    pathParams: MemberTagIdParamSchema,
    body: null,
    responses: {
      200: SuccessResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Remove tag from member',
    description: 'Remove an assigned tag from a member',
  },
})
