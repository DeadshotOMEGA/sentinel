import { initContract } from '@ts-rest/core'
import {
  DevMembersResponseSchema,
  ClearCheckinsResponseSchema,
  MockScanRequestSchema,
  MockScanResponseSchema,
  DevErrorResponseSchema,
} from '../schemas/dev.schema.js'

const c = initContract()

/**
 * Dev Mode Contract
 *
 * Development endpoints for testing and debugging:
 * - Get all members with badge and presence info
 * - Clear all current check-ins
 * - Mock RFID badge scans
 *
 * These routes are disabled in production (NODE_ENV=production)
 */
export const devContract = c.router(
  {
    /**
     * GET /api/dev/members
     * Get all active members with badge info and current presence status
     */
    getMembers: {
      method: 'GET',
      path: '/api/dev/members',
      responses: {
        200: DevMembersResponseSchema,
        401: DevErrorResponseSchema,
        403: DevErrorResponseSchema,
        500: DevErrorResponseSchema,
      },
      summary: 'Get all members with presence',
      description:
        'Get all active members with badge serial numbers and current presence status. Disabled in production.',
    },

    /**
     * DELETE /api/dev/checkins/clear-all
     * Check out all currently present members
     */
    clearAllCheckins: {
      method: 'DELETE',
      path: '/api/dev/checkins/clear-all',
      body: c.type<undefined>(),
      responses: {
        200: ClearCheckinsResponseSchema,
        401: DevErrorResponseSchema,
        403: DevErrorResponseSchema,
        500: DevErrorResponseSchema,
      },
      summary: 'Clear all current check-ins',
      description:
        'Create check-out records for all currently present members. Broadcasts presence update via WebSocket. Disabled in production.',
    },

    /**
     * POST /api/dev/mock-scan
     * Simulate RFID badge scan for testing
     */
    mockScan: {
      method: 'POST',
      path: '/api/dev/mock-scan',
      body: MockScanRequestSchema,
      responses: {
        200: MockScanResponseSchema,
        400: DevErrorResponseSchema,
        401: DevErrorResponseSchema,
        403: DevErrorResponseSchema,
        404: DevErrorResponseSchema,
        500: DevErrorResponseSchema,
      },
      summary: 'Mock RFID badge scan',
      description:
        'Simulate an RFID badge scan with the same behavior as real hardware scans (creates checkin records, broadcasts WebSocket updates). Disabled in production.',
    },
  },
  {
    pathPrefix: '',
  }
)
