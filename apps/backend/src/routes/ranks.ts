import { initServer } from '@ts-rest/express'
import { rankContract } from '@sentinel/contracts'
import { RankRepository } from '../repositories/rank-repository.js'
import { getPrismaClient } from '../lib/database.js'
import { apiLogger } from '../lib/logger.js'

const s = initServer()

const rankRepository = new RankRepository(getPrismaClient())

export const ranksRouter = s.router(rankContract, {
    list: async ({ query }) => {
      try {
        const filters: {
          branch?: string
          active?: boolean
          category?: string
        } = {}

        if (query.branch) {
          filters.branch = query.branch
        }

        if (query.active !== undefined) {
          filters.active = query.active
        }

        if (query.category) {
          filters.category = query.category
        }

        const ranks = await rankRepository.findAll(filters)

        // Convert dates to ISO strings for API response
        const serializedRanks = ranks.map((rank) => ({
          ...rank,
          branch: rank.branch as 'navy' | 'army' | 'air_force',
          replacedBy: rank.replacedBy ?? null,
          createdAt: rank.createdAt?.toISOString() ?? new Date().toISOString(),
          updatedAt: rank.updatedAt?.toISOString() ?? new Date().toISOString(),
        }))

        return {
          status: 200 as const,
          body: serializedRanks,
        }
      } catch (error) {
        apiLogger.error('Error fetching ranks', { error: error instanceof Error ? error.message : String(error) })
        return {
          status: 500 as const,
          body: {
            error: error instanceof Error ? error.message : 'Failed to fetch ranks',
          },
        }
      }
    },

    getByCode: async ({ params }) => {
      try {
        const rank = await rankRepository.findByCode(params.code)

        if (!rank) {
          return {
            status: 404 as const,
            body: {
              error: `Rank with code "${params.code}" not found`,
            },
          }
        }

        return {
          status: 200 as const,
          body: {
            ...rank,
            branch: rank.branch as 'navy' | 'army' | 'air_force',
            replacedBy: rank.replacedBy ?? null,
            createdAt: rank.createdAt?.toISOString() ?? new Date().toISOString(),
            updatedAt: rank.updatedAt?.toISOString() ?? new Date().toISOString(),
          },
        }
      } catch (error) {
        apiLogger.error('Error fetching rank', { error: error instanceof Error ? error.message : String(error) })
        return {
          status: 500 as const,
          body: {
            error: error instanceof Error ? error.message : 'Failed to fetch rank',
          },
        }
      }
    },

    compare: async ({ query }) => {
      try {
        const comparison = await rankRepository.compareRanks(query.rank1, query.rank2)

        return {
          status: 200 as const,
          body: comparison,
        }
      } catch (error) {
        apiLogger.error('Error comparing ranks', { error: error instanceof Error ? error.message : String(error) })

        const errorMessage = error instanceof Error ? error.message : 'Failed to compare ranks'

        // Check if it's a "not found" error
        if (errorMessage.includes('not found')) {
          return {
            status: 404 as const,
            body: {
              error: errorMessage,
            },
          }
        }

        // Check if it's a "different branches" error
        if (errorMessage.includes('different branches')) {
          return {
            status: 400 as const,
            body: {
              error: errorMessage,
            },
          }
        }

        return {
          status: 500 as const,
          body: {
            error: errorMessage,
          },
        }
      }
    },

    statistics: async () => {
      try {
        const stats = await rankRepository.getStatistics()

        return {
          status: 200 as const,
          body: stats,
        }
      } catch (error) {
        apiLogger.error('Error fetching rank statistics', { error: error instanceof Error ? error.message : String(error) })
        return {
          status: 500 as const,
          body: {
            error: error instanceof Error ? error.message : 'Failed to fetch rank statistics',
          },
        }
      }
    },
  })
