import { initContract } from '@ts-rest/core'
import {
  AssignDdsSchema,
  SetTodayDdsSchema,
  TransferDdsSchema,
  ReleaseDdsSchema,
  GetCurrentDdsResponseSchema,
  DdsOperationResponseSchema,
  CheckDdsExistsResponseSchema,
  DdsAuditLogResponseSchema,
  DdsAuditLogQuerySchema,
  KioskResponsibilityStateResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * DDS (Duty Day Staff) API contract
 *
 * Defines all DDS-related endpoints with request/response schemas
 */
export const ddsContract = c.router({
  /**
   * Get today's DDS assignment
   */
  getCurrentDds: {
    method: 'GET',
    path: '/api/dds/current',
    responses: {
      200: GetCurrentDdsResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get current DDS',
    description: "Get today's active DDS assignment",
  },

  /**
   * Check if DDS exists for today
   */
  checkDdsExists: {
    method: 'GET',
    path: '/api/dds/exists',
    responses: {
      200: CheckDdsExistsResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Check if DDS exists',
    description: 'Check if a DDS has been assigned for today',
  },

  /**
   * Get DDS audit log
   */
  getAuditLog: {
    method: 'GET',
    path: '/api/dds/audit-log',
    query: DdsAuditLogQuerySchema,
    responses: {
      200: DdsAuditLogResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get DDS audit log',
    description:
      'Get audit log entries for DDS responsibility (accepts, assignments, transfers, releases)',
  },

  /**
   * Get kiosk responsibility state for a checked-in member
   */
  getKioskResponsibilityState: {
    method: 'GET',
    path: '/api/dds/kiosk-state/:id',
    pathParams: IdParamSchema,
    responses: {
      200: KioskResponsibilityStateResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get kiosk DDS responsibility state',
    description:
      'Get kiosk responsibility context including expected DDS, open-building status, who is already inside, and same-day opening history',
  },

  /**
   * Member self-accepts DDS at kiosk
   */
  acceptDds: {
    method: 'POST',
    path: '/api/dds/accept/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: DdsOperationResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Accept DDS',
    description: 'Member explicitly accepts or takes DDS responsibility for the current day',
  },

  /**
   * Admin assigns or replaces today's live DDS
   */
  setTodayDds: {
    method: 'POST',
    path: '/api/dds/set-today',
    body: SetTodayDdsSchema,
    responses: {
      200: DdsOperationResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: "Set today's DDS",
    description:
      "Admin assigns or replaces today's live DDS without modifying the weekly duty schedule",
  },

  /**
   * Admin assigns DDS to a member
   */
  assignDds: {
    method: 'POST',
    path: '/api/dds/assign',
    body: AssignDdsSchema,
    responses: {
      200: DdsOperationResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Assign DDS',
    description: 'Admin assigns DDS role to a member',
  },

  /**
   * Transfer DDS to another member
   */
  transferDds: {
    method: 'POST',
    path: '/api/dds/transfer',
    body: TransferDdsSchema,
    responses: {
      200: DdsOperationResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Transfer DDS',
    description: 'Admin transfers DDS role from current holder to another member',
  },

  /**
   * Release DDS role
   */
  releaseDds: {
    method: 'POST',
    path: '/api/dds/release',
    body: ReleaseDdsSchema,
    responses: {
      200: GetCurrentDdsResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Release DDS',
    description: 'Release DDS role (during checkout or by admin)',
  },
})
