import { initContract } from '@ts-rest/core'
import {
  CreateEnumSchema,
  UpdateEnumSchema,
  VisitTypeListResponseSchema,
  MemberStatusListResponseSchema,
  MemberTypeListResponseSchema,
  BadgeStatusListResponseSchema,
  VisitTypeResponseSchema,
  MemberStatusResponseSchema,
  MemberTypeResponseSchema,
  BadgeStatusResponseSchema,
} from '../schemas/enum.schema.js'
import {
  ErrorResponseSchema,
  IdParamSchema,
  SuccessResponseSchema,
} from '../schemas/common.schema.js'

const c = initContract()

/**
 * Visit Types routes
 */
export const visitTypesContract = c.router({
  getVisitTypes: {
    method: 'GET',
    path: '/api/enums/visit-types',
    responses: {
      200: VisitTypeListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all visit types',
    description: 'Returns all visit types with usage counts',
  },

  createVisitType: {
    method: 'POST',
    path: '/api/enums/visit-types',
    body: CreateEnumSchema,
    responses: {
      201: VisitTypeResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create visit type',
    description: 'Create a new visit type (admin only)',
  },

  updateVisitType: {
    method: 'PUT',
    path: '/api/enums/visit-types/:id',
    pathParams: IdParamSchema,
    body: UpdateEnumSchema,
    responses: {
      200: VisitTypeResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update visit type',
    description: 'Update an existing visit type (admin only)',
  },

  deleteVisitType: {
    method: 'DELETE',
    path: '/api/enums/visit-types/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete visit type',
    description: 'Delete a visit type if not in use (admin only)',
  },
})

/**
 * Member Statuses routes
 */
export const memberStatusesContract = c.router({
  getMemberStatuses: {
    method: 'GET',
    path: '/api/enums/member-statuses',
    responses: {
      200: MemberStatusListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all member statuses',
    description: 'Returns all member statuses with usage counts',
  },

  createMemberStatus: {
    method: 'POST',
    path: '/api/enums/member-statuses',
    body: CreateEnumSchema,
    responses: {
      201: MemberStatusResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create member status',
    description: 'Create a new member status (admin only)',
  },

  updateMemberStatus: {
    method: 'PUT',
    path: '/api/enums/member-statuses/:id',
    pathParams: IdParamSchema,
    body: UpdateEnumSchema,
    responses: {
      200: MemberStatusResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update member status',
    description: 'Update an existing member status (admin only)',
  },

  deleteMemberStatus: {
    method: 'DELETE',
    path: '/api/enums/member-statuses/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete member status',
    description: 'Delete a member status if not in use (admin only)',
  },
})

/**
 * Member Types routes
 */
export const memberTypesContract = c.router({
  getMemberTypes: {
    method: 'GET',
    path: '/api/enums/member-types',
    responses: {
      200: MemberTypeListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all member types',
    description: 'Returns all member types with usage counts',
  },

  createMemberType: {
    method: 'POST',
    path: '/api/enums/member-types',
    body: CreateEnumSchema,
    responses: {
      201: MemberTypeResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create member type',
    description: 'Create a new member type (admin only)',
  },

  updateMemberType: {
    method: 'PUT',
    path: '/api/enums/member-types/:id',
    pathParams: IdParamSchema,
    body: UpdateEnumSchema,
    responses: {
      200: MemberTypeResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update member type',
    description: 'Update an existing member type (admin only)',
  },

  deleteMemberType: {
    method: 'DELETE',
    path: '/api/enums/member-types/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete member type',
    description: 'Delete a member type if not in use (admin only)',
  },
})

/**
 * Badge Statuses routes
 */
export const badgeStatusesContract = c.router({
  getBadgeStatuses: {
    method: 'GET',
    path: '/api/enums/badge-statuses',
    responses: {
      200: BadgeStatusListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all badge statuses',
    description: 'Returns all badge statuses with usage counts',
  },

  createBadgeStatus: {
    method: 'POST',
    path: '/api/enums/badge-statuses',
    body: CreateEnumSchema,
    responses: {
      201: BadgeStatusResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create badge status',
    description: 'Create a new badge status (admin only)',
  },

  updateBadgeStatus: {
    method: 'PUT',
    path: '/api/enums/badge-statuses/:id',
    pathParams: IdParamSchema,
    body: UpdateEnumSchema,
    responses: {
      200: BadgeStatusResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update badge status',
    description: 'Update an existing badge status (admin only)',
  },

  deleteBadgeStatus: {
    method: 'DELETE',
    path: '/api/enums/badge-statuses/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete badge status',
    description: 'Delete a badge status if not in use (admin only)',
  },
})

/**
 * Combined enum contract
 */
export const enumContract = c.router({
  visitTypes: visitTypesContract,
  memberStatuses: memberStatusesContract,
  memberTypes: memberTypesContract,
  badgeStatuses: badgeStatusesContract,
})
