import { initContract } from '@ts-rest/core'
import {
  QualificationTypeListResponseSchema,
  MemberQualificationListResponseSchema,
  MemberQualificationResponseSchema,
  GrantQualificationInputSchema,
  RevokeQualificationInputSchema,
  LockupEligibleMembersResponseSchema,
  LockupEligibilityQuerySchema,
  MemberIdParamSchema,
  QualificationIdParamSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Qualification API Contract
 *
 * Endpoints for managing member qualifications that determine eligibility
 * for duty roles and lockup responsibility.
 */
export const qualificationContract = c.router({
  // ============================================================================
  // Qualification Types (Reference Data)
  // ============================================================================

  /**
   * Get all qualification types
   */
  getQualificationTypes: {
    method: 'GET',
    path: '/api/qualifications/types',
    responses: {
      200: QualificationTypeListResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all qualification types',
    description:
      'Get all available qualification types (DDS, SWK, Building Authorized, etc.) with their lockup eligibility status',
  },

  // ============================================================================
  // Member Qualifications
  // ============================================================================

  /**
   * Get qualifications for a specific member
   */
  getMemberQualifications: {
    method: 'GET',
    path: '/api/members/:memberId/qualifications',
    pathParams: MemberIdParamSchema,
    responses: {
      200: MemberQualificationListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get member qualifications',
    description:
      'Get all qualifications assigned to a specific member, including status and audit information',
  },

  /**
   * Grant a qualification to a member
   */
  grantQualification: {
    method: 'POST',
    path: '/api/members/:memberId/qualifications',
    pathParams: MemberIdParamSchema,
    body: GrantQualificationInputSchema,
    responses: {
      201: MemberQualificationResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema, // Already has this qualification
      500: ErrorResponseSchema,
    },
    summary: 'Grant qualification to member',
    description:
      'Grant a new qualification to a member. Optional expiration date for time-limited qualifications.',
  },

  /**
   * Revoke a qualification from a member
   */
  revokeQualification: {
    method: 'DELETE',
    path: '/api/members/:memberId/qualifications/:qualificationId',
    pathParams: QualificationIdParamSchema,
    body: RevokeQualificationInputSchema,
    responses: {
      200: SuccessResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Revoke qualification from member',
    description: 'Revoke an existing qualification from a member with an optional reason',
  },

  // ============================================================================
  // Lockup Eligibility
  // ============================================================================

  /**
   * Get all members eligible to receive lockup responsibility
   */
  getLockupEligibleMembers: {
    method: 'GET',
    path: '/api/qualifications/lockup-eligible',
    query: LockupEligibilityQuerySchema,
    responses: {
      200: LockupEligibleMembersResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get lockup-eligible members',
    description:
      'Get all members who have at least one qualification that allows them to receive lockup responsibility. Optionally filter to only show members currently checked in.',
  },
})
