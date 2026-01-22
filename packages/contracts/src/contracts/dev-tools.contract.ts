import { initContract } from '@ts-rest/core'
import {
  ClearTableRequestSchema,
  ClearAllResponseSchema,
  ClearTableResponseSchema,
  ResetResponseSchema,
  SimulationDefaultsResponseSchema,
  SimulationRequestSchema,
  SimulationPrecheckResponseSchema,
  SimulationResponseSchema,
  BackdateMembersRequestSchema,
  BackdateMembersResponseSchema,
  ScenariosListResponseSchema,
  SeedScenarioRequestSchema,
  SeedScenarioResponseSchema,
  DevToolsErrorResponseSchema,
} from '../schemas/dev-tools.schema.js'

const c = initContract()

/**
 * Dev Tools Contract
 *
 * Development and testing utility endpoints:
 * - Database clearing (all or specific tables)
 * - Database reset
 * - Attendance simulation
 * - Member backdating
 * - Scenario seeding
 *
 * All endpoints require admin authentication
 */
export const devToolsContract = c.router(
  {
    /**
     * POST /api/dev-tools/clear-all
     * Clear all data except admin_users, divisions, and migrations
     */
    clearAll: {
      method: 'POST',
      path: '/api/dev-tools/clear-all',
      body: c.type<undefined>(),
      responses: {
        200: ClearAllResponseSchema,
        401: DevToolsErrorResponseSchema,
        403: DevToolsErrorResponseSchema,
        500: DevToolsErrorResponseSchema,
      },
      summary: 'Clear all data',
      description:
        'Clear all data from members, checkins, visitors, badges, events, event_attendees, and event_checkins tables. Requires admin role.',
    },

    /**
     * POST /api/dev-tools/clear-table
     * Clear data from a specific table
     */
    clearTable: {
      method: 'POST',
      path: '/api/dev-tools/clear-table',
      body: ClearTableRequestSchema,
      responses: {
        200: ClearTableResponseSchema,
        400: DevToolsErrorResponseSchema,
        401: DevToolsErrorResponseSchema,
        403: DevToolsErrorResponseSchema,
        500: DevToolsErrorResponseSchema,
      },
      summary: 'Clear specific table',
      description:
        'Clear all data from a specific table. Requires admin role.',
    },

    /**
     * POST /api/dev-tools/reset
     * Reset database and services to initial state
     */
    reset: {
      method: 'POST',
      path: '/api/dev-tools/reset',
      body: c.type<undefined>(),
      responses: {
        200: ResetResponseSchema,
        401: DevToolsErrorResponseSchema,
        403: DevToolsErrorResponseSchema,
        500: DevToolsErrorResponseSchema,
      },
      summary: 'Reset database and services',
      description:
        'Clear all data and reset cached services to initial state. Requires admin role.',
    },

    /**
     * GET /api/dev-tools/simulate/defaults
     * Get default simulation parameters
     */
    getSimulationDefaults: {
      method: 'GET',
      path: '/api/dev-tools/simulate/defaults',
      responses: {
        200: SimulationDefaultsResponseSchema,
        401: DevToolsErrorResponseSchema,
        403: DevToolsErrorResponseSchema,
      },
      summary: 'Get simulation defaults',
      description:
        'Get default parameters for attendance simulation. Requires admin role.',
    },

    /**
     * POST /api/dev-tools/simulate/precheck
     * Precheck simulation parameters before running
     */
    simulationPrecheck: {
      method: 'POST',
      path: '/api/dev-tools/simulate/precheck',
      body: SimulationRequestSchema,
      responses: {
        200: SimulationPrecheckResponseSchema,
        400: DevToolsErrorResponseSchema,
        401: DevToolsErrorResponseSchema,
        403: DevToolsErrorResponseSchema,
        500: DevToolsErrorResponseSchema,
      },
      summary: 'Precheck simulation',
      description:
        'Validate simulation parameters and estimate impact. Requires admin role.',
    },

    /**
     * POST /api/dev-tools/simulate
     * Run attendance simulation to generate test data
     */
    simulate: {
      method: 'POST',
      path: '/api/dev-tools/simulate',
      body: SimulationRequestSchema,
      responses: {
        200: SimulationResponseSchema,
        400: DevToolsErrorResponseSchema,
        401: DevToolsErrorResponseSchema,
        403: DevToolsErrorResponseSchema,
        500: DevToolsErrorResponseSchema,
      },
      summary: 'Run attendance simulation',
      description:
        'Generate realistic check-in data over a date range. Requires admin role.',
    },

    /**
     * POST /api/dev-tools/backdate-members
     * Backdate member creation dates for testing
     */
    backdateMembers: {
      method: 'POST',
      path: '/api/dev-tools/backdate-members',
      body: BackdateMembersRequestSchema,
      responses: {
        200: BackdateMembersResponseSchema,
        400: DevToolsErrorResponseSchema,
        401: DevToolsErrorResponseSchema,
        403: DevToolsErrorResponseSchema,
        500: DevToolsErrorResponseSchema,
      },
      summary: 'Backdate member creation',
      description:
        'Set all member creation dates to a target date for testing. Requires admin role.',
    },

    /**
     * GET /api/dev-tools/scenarios
     * List available seeding scenarios
     */
    getScenarios: {
      method: 'GET',
      path: '/api/dev-tools/scenarios',
      responses: {
        200: ScenariosListResponseSchema,
        401: DevToolsErrorResponseSchema,
        403: DevToolsErrorResponseSchema,
      },
      summary: 'List seeding scenarios',
      description:
        'Get list of available database seeding scenarios. Requires admin role.',
    },

    /**
     * POST /api/dev-tools/seed-scenario
     * Seed database with a specific scenario
     */
    seedScenario: {
      method: 'POST',
      path: '/api/dev-tools/seed-scenario',
      body: SeedScenarioRequestSchema,
      responses: {
        200: SeedScenarioResponseSchema,
        400: DevToolsErrorResponseSchema,
        401: DevToolsErrorResponseSchema,
        403: DevToolsErrorResponseSchema,
        500: DevToolsErrorResponseSchema,
      },
      summary: 'Seed database scenario',
      description:
        'Populate database with a predefined scenario (empty, minimal, standard, realistic, stress_test). Requires admin role.',
    },
  },
  {
    pathPrefix: '',
  }
)
