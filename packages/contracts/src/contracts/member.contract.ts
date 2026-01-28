import { initContract } from '@ts-rest/core'
import {
  CreateMemberSchema,
  UpdateMemberSchema,
  MemberResponseSchema,
  MemberListQuerySchema,
  MemberListResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
  SuccessResponseSchema,
  PreviewImportRequestSchema,
  PreviewImportResponseSchema,
  ExecuteImportRequestSchema,
  ExecuteImportResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Member API contract
 *
 * Defines all member-related endpoints with request/response schemas
 */
export const memberContract = c.router({
  /**
   * Get all members with pagination and filtering
   */
  getMembers: {
    method: 'GET',
    path: '/api/members',
    query: MemberListQuerySchema,
    responses: {
      200: MemberListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all members',
    description:
      'Get paginated list of members with optional filtering by division, rank, and status',
  },

  /**
   * Get single member by ID
   */
  getMemberById: {
    method: 'GET',
    path: '/api/members/:id',
    pathParams: IdParamSchema,
    responses: {
      200: MemberResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get member by ID',
    description: 'Retrieve a single member by their unique ID',
  },

  /**
   * Create new member
   */
  createMember: {
    method: 'POST',
    path: '/api/members',
    body: CreateMemberSchema,
    responses: {
      201: MemberResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create new member',
    description: 'Create a new member with the provided information',
  },

  /**
   * Update existing member
   */
  updateMember: {
    method: 'PATCH',
    path: '/api/members/:id',
    pathParams: IdParamSchema,
    body: UpdateMemberSchema,
    responses: {
      200: MemberResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update member',
    description: 'Update an existing member with the provided information',
  },

  /**
   * Delete member
   */
  deleteMember: {
    method: 'DELETE',
    path: '/api/members/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete member',
    description: 'Delete a member by their unique ID',
  },

  /**
   * Search members by service number
   */
  searchByServiceNumber: {
    method: 'GET',
    path: '/api/members/search/:serviceNumber',
    pathParams: c.type<{ serviceNumber: string }>(),
    responses: {
      200: MemberResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Search member by service number',
    description: 'Find a member by their service number',
  },

  /**
   * Preview Nominal Roll import
   */
  previewImport: {
    method: 'POST',
    path: '/api/members/import/preview',
    body: PreviewImportRequestSchema,
    responses: {
      200: PreviewImportResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Preview member import',
    description: 'Parse CSV and preview what will be added, updated, or deactivated',
  },

  /**
   * Execute Nominal Roll import
   */
  executeImport: {
    method: 'POST',
    path: '/api/members/import/execute',
    body: ExecuteImportRequestSchema,
    responses: {
      200: ExecuteImportResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Execute member import',
    description: 'Execute the member import and create/update members in the database',
  },
})
