import { initContract } from '@ts-rest/core'
import {
  CreateVisitorSchema,
  UpdateVisitorSchema,
  VisitorResponseSchema,
  VisitorListQuerySchema,
  VisitorListResponseSchema,
  ActiveVisitorsResponseSchema,
  CheckoutResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Visitor API contract
 *
 * Defines all visitor-related endpoints with request/response schemas
 */
export const visitorContract = c.router({
  /**
   * Get active visitors (currently signed in)
   */
  getActiveVisitors: {
    method: 'GET',
    path: '/api/visitors/active',
    body: c.type<undefined>(),
    responses: {
      200: ActiveVisitorsResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get active visitors',
    description: 'Get list of all currently signed in visitors',
  },

  /**
   * Get all visitors with pagination and filtering
   */
  getVisitors: {
    method: 'GET',
    path: '/api/visitors',
    query: VisitorListQuerySchema,
    responses: {
      200: VisitorListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all visitors',
    description: 'Get paginated list of visitors with optional filtering',
  },

  /**
   * Create new visitor (sign in)
   */
  createVisitor: {
    method: 'POST',
    path: '/api/visitors',
    body: CreateVisitorSchema,
    responses: {
      201: VisitorResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create new visitor',
    description: 'Sign in a new visitor',
  },

  /**
   * Checkout visitor
   */
  checkoutVisitor: {
    method: 'POST',
    path: '/api/visitors/:id/checkout',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: CheckoutResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Checkout visitor',
    description: 'Sign out a visitor',
  },

  /**
   * Get visitor by ID
   */
  getVisitorById: {
    method: 'GET',
    path: '/api/visitors/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: VisitorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get visitor by ID',
    description: 'Retrieve a single visitor by their unique ID',
  },

  /**
   * Update visitor
   */
  updateVisitor: {
    method: 'PATCH',
    path: '/api/visitors/:id',
    pathParams: IdParamSchema,
    body: UpdateVisitorSchema,
    responses: {
      200: VisitorResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update visitor',
    description: 'Update visitor details (event, host, purpose)',
  },
})
