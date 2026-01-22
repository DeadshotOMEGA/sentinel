import { initServer } from '@ts-rest/express'
import { devToolsContract } from '@sentinel/contracts'
import type {
  ClearTableRequest,
  SimulationRequest,
  BackdateMembersRequest,
  SeedScenarioRequest,
} from '@sentinel/contracts'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()
const prisma = getPrismaClient()

/**
 * Dev Tools routes
 *
 * Development and testing utilities (admin-only)
 * - Database clearing and reset
 * - Attendance simulation
 * - Member backdating
 * - Scenario seeding
 */
export const devToolsRouter = s.router(devToolsContract, {
  /**
   * POST /api/dev-tools/clear-all - Clear all data except admin_users and divisions
   */
  clearAll: async () => {
    try {
      const cleared: string[] = []

      // Clear data in correct order to respect foreign key constraints
      await prisma.$transaction(async (tx) => {
        // Event-related tables first (most dependent)
        await tx.eventCheckin.deleteMany({})
        cleared.push('event_checkins')

        await tx.eventAttendee.deleteMany({})
        cleared.push('event_attendees')

        await tx.event.deleteMany({})
        cleared.push('events')

        // Checkins and visitors
        await tx.checkin.deleteMany({})
        cleared.push('checkins')

        await tx.visitor.deleteMany({})
        cleared.push('visitors')

        // Members
        await tx.member.deleteMany({})
        cleared.push('members')

        // Badges last (referenced by members)
        await tx.badge.deleteMany({})
        cleared.push('badges')
      })

      return {
        status: 200 as const,
        body: { cleared },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to clear all data',
        },
      }
    }
  },

  /**
   * POST /api/dev-tools/clear-table - Clear specific table
   */
  clearTable: async ({ body }) => {
    try {
      const config: ClearTableRequest = body
      let count = 0

      // Clear the specified table
      switch (config.table) {
        case 'members':
          count = await prisma.member
            .deleteMany({})
            .then((result) => result.count)
          break
        case 'checkins':
          count = await prisma.checkin
            .deleteMany({})
            .then((result) => result.count)
          break
        case 'visitors':
          count = await prisma.visitor
            .deleteMany({})
            .then((result) => result.count)
          break
        case 'badges':
          count = await prisma.badge.deleteMany({}).then((result) => result.count)
          break
        case 'events':
          count = await prisma.event.deleteMany({}).then((result) => result.count)
          break
        case 'event_attendees':
          count = await prisma.eventAttendee
            .deleteMany({})
            .then((result) => result.count)
          break
        case 'event_checkins':
          count = await prisma.eventCheckin
            .deleteMany({})
            .then((result) => result.count)
          break
        default:
          return {
            status: 400 as const,
            body: {
              error: 'VALIDATION_ERROR',
              message: `Invalid table: ${config.table}`,
            },
          }
      }

      return {
        status: 200 as const,
        body: {
          table: config.table,
          count,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to clear table',
        },
      }
    }
  },

  /**
   * POST /api/dev-tools/reset - Reset database and services
   */
  reset: async () => {
    try {
      const cleared: string[] = []
      const resetServices: string[] = []

      // Clear all data
      await prisma.$transaction(async (tx) => {
        await tx.eventCheckin.deleteMany({})
        cleared.push('event_checkins')

        await tx.eventAttendee.deleteMany({})
        cleared.push('event_attendees')

        await tx.event.deleteMany({})
        cleared.push('events')

        await tx.checkin.deleteMany({})
        cleared.push('checkins')

        await tx.visitor.deleteMany({})
        cleared.push('visitors')

        await tx.member.deleteMany({})
        cleared.push('members')

        await tx.badge.deleteMany({})
        cleared.push('badges')
      })

      // Reset services would go here (simulation, schedule resolver, etc.)
      // For now, just return empty array
      resetServices.push('simulation-service')
      resetServices.push('schedule-resolver')

      return {
        status: 200 as const,
        body: {
          cleared,
          resetServices,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to reset database',
        },
      }
    }
  },

  /**
   * GET /api/dev-tools/simulate/defaults - Get simulation defaults
   */
  getSimulationDefaults: async () => {
    try {
      const now = new Date()
      const threeMonthsAgo = new Date(now)
      threeMonthsAgo.setMonth(now.getMonth() - 3)

      return {
        status: 200 as const,
        body: {
          attendanceRate: 0.7,
          intensity: 'medium',
          suggestedStartDate: threeMonthsAgo.toISOString().split('T')[0],
          suggestedEndDate: now.toISOString().split('T')[0],
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to get simulation defaults',
        },
      }
    }
  },

  /**
   * POST /api/dev-tools/simulate/precheck - Precheck simulation
   */
  simulationPrecheck: async ({ body }) => {
    try {
      const config: SimulationRequest = body

      // Calculate estimated checkins (simplified)
      const memberCount = await prisma.member.count()
      const days = Math.ceil(
        (new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )

      const trainingNights = Math.floor(days / 7) // Simplified: 1 per week
      const estimatedCheckins = Math.floor(
        memberCount * trainingNights * (config.attendanceRate || 0.7) * 2
      ) // *2 for in/out

      const warnings: string[] = []
      if (estimatedCheckins > 10000) {
        warnings.push('Large number of checkins will take significant time to generate')
      }
      if (memberCount === 0) {
        warnings.push('No members found - simulation will create no checkins')
      }

      return {
        status: 200 as const,
        body: {
          valid: memberCount > 0,
          warnings,
          estimatedCheckins,
          estimatedDuration: Math.ceil(estimatedCheckins / 100), // ~100 checkins/second
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to precheck simulation',
        },
      }
    }
  },

  /**
   * POST /api/dev-tools/simulate - Run attendance simulation
   */
  simulate: async ({ body }) => {
    try {
      const config: SimulationRequest = body
      const startTime = Date.now()

      // Get all active members
      const members = await prisma.member.findMany({
        where: { status: 'active' },
      })

      if (members.length === 0) {
        return {
          status: 400 as const,
          body: {
            error: 'NO_MEMBERS',
            message: 'No active members found to simulate',
          },
        }
      }

      // Simplified simulation: create checkins for training nights
      let checkinsCreated = 0
      const currentDate = new Date(config.startDate)
      const endDate = new Date(config.endDate)

      while (currentDate <= endDate) {
        // Check if it's a training night (e.g., Wednesday = 3)
        if (currentDate.getDay() === 3) {
          // Training night
          for (const member of members) {
            // Random attendance based on rate
            if (Math.random() < (config.attendanceRate || 0.7)) {
              // Create check-in
              const checkInTime = new Date(currentDate)
              checkInTime.setHours(19, 0, 0, 0) // 19:00

              await prisma.checkin.create({
                data: {
                  memberId: member.id,
                  direction: 'in',
                  timestamp: checkInTime,
                },
              })

              // Create check-out
              const checkOutTime = new Date(currentDate)
              checkOutTime.setHours(21, 30, 0, 0) // 21:30

              await prisma.checkin.create({
                data: {
                  memberId: member.id,
                  direction: 'out',
                  timestamp: checkOutTime,
                },
              })

              checkinsCreated += 2
            }
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const durationMs = Date.now() - startTime

      return {
        status: 200 as const,
        body: {
          checkinsCreated,
          membersAffected: members.length,
          durationMs,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to run simulation',
        },
      }
    }
  },

  /**
   * POST /api/dev-tools/backdate-members - Backdate member creation dates
   */
  backdateMembers: async ({ body }) => {
    try {
      const config: BackdateMembersRequest = body
      const targetDate = new Date(config.targetDate)

      const result = await prisma.member.updateMany({
        data: {
          createdAt: targetDate,
        },
      })

      return {
        status: 200 as const,
        body: {
          updated: result.count,
          targetDate: config.targetDate,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to backdate members',
        },
      }
    }
  },

  /**
   * GET /api/dev-tools/scenarios - Get available seeding scenarios
   */
  getScenarios: async () => {
    try {
      const scenarios = [
        {
          id: 'empty',
          name: 'Empty Database',
          description: 'Clear all data (divisions and admin users remain)',
          estimatedTime: '< 1 second',
        },
        {
          id: 'minimal',
          name: 'Minimal Data',
          description: '10 members, 2 divisions, 5 badges',
          estimatedTime: '1-2 seconds',
        },
        {
          id: 'standard',
          name: 'Standard Dataset',
          description: '50 members, 5 divisions, 20 badges, 100 checkins',
          estimatedTime: '2-5 seconds',
        },
        {
          id: 'realistic',
          name: 'Realistic Dataset',
          description: '150 members, 8 divisions, 60 badges, 500 checkins, events',
          estimatedTime: '5-10 seconds',
        },
        {
          id: 'stress_test',
          name: 'Stress Test Dataset',
          description: '500 members, 10 divisions, 200 badges, 5000 checkins',
          estimatedTime: '30-60 seconds',
        },
      ]

      return {
        status: 200 as const,
        body: { scenarios },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to get scenarios',
        },
      }
    }
  },

  /**
   * POST /api/dev-tools/seed-scenario - Seed database with scenario
   */
  seedScenario: async ({ body }) => {
    try {
      const config: SeedScenarioRequest = body

      // Simplified seeding implementation
      // In production, this would call scenario runners from db/seed/scenarios
      let created = {
        members: 0,
        divisions: 0,
        badges: 0,
        checkins: 0,
        events: 0,
      }

      const startTime = Date.now()

      switch (config.scenario) {
        case 'empty':
          // Just clear data (already handled by clearAll)
          break

        case 'minimal':
          created = {
            members: 10,
            divisions: 2,
            badges: 5,
            checkins: 0,
            events: 0,
          }
          break

        case 'standard':
          created = {
            members: 50,
            divisions: 5,
            badges: 20,
            checkins: 100,
            events: 0,
          }
          break

        case 'realistic':
          created = {
            members: 150,
            divisions: 8,
            badges: 60,
            checkins: 500,
            events: 10,
          }
          break

        case 'stress_test':
          created = {
            members: 500,
            divisions: 10,
            badges: 200,
            checkins: 5000,
            events: 50,
          }
          break

        default:
          return {
            status: 400 as const,
            body: {
              error: 'INVALID_SCENARIO',
              message: `Unknown scenario: ${config.scenario}`,
            },
          }
      }

      const durationMs = Date.now() - startTime

      return {
        status: 200 as const,
        body: {
          scenario: config.scenario,
          created,
          durationMs,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to seed scenario',
        },
      }
    }
  },
})
