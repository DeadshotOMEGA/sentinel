import { initContract } from '@ts-rest/core'
import * as v from 'valibot'

const c = initContract()

// Validation schemas
const RankBranchSchema = v.picklist(['navy', 'army', 'air_force'])
const RankCodeSchema = v.pipe(
  v.string('Rank code is required'),
  v.minLength(1, 'Rank code must not be empty'),
  v.maxLength(10, 'Rank code must be at most 10 characters')
)

export const RankSchema = v.object({
  id: v.string(),
  code: v.string(),
  name: v.string(),
  branch: RankBranchSchema,
  category: v.string(),
  displayOrder: v.number(),
  isActive: v.boolean(),
  replacedBy: v.optional(v.nullable(v.string())),
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
})

export const RankComparisonSchema = v.object({
  rank1: v.string(),
  rank2: v.string(),
  result: v.union([v.literal(-1), v.literal(0), v.literal(1)]),
  message: v.string(),
})

export const RankStatisticsSchema = v.object({
  totalRanks: v.number(),
  activeRanks: v.number(),
  deprecatedRanks: v.number(),
  byBranch: v.record(v.string(), v.number()),
  byCategory: v.record(v.string(), v.number()),
})

export const rankContract = c.router(
  {
    list: {
      method: 'GET',
      path: '/ranks',
      query: v.object({
        branch: v.optional(RankBranchSchema),
        active: v.optional(
          v.pipe(
            v.string(),
            v.transform((val) => val === 'true')
          )
        ),
        category: v.optional(v.string()),
      }),
      responses: {
        200: v.array(RankSchema),
        500: v.object({
          error: v.string(),
        }),
      },
      summary: 'List all ranks with optional filters',
    },

    compare: {
      method: 'GET',
      path: '/ranks-compare',
      query: v.object({
        rank1: RankCodeSchema,
        rank2: RankCodeSchema,
      }),
      responses: {
        200: RankComparisonSchema,
        400: v.object({
          error: v.string(),
        }),
        404: v.object({
          error: v.string(),
        }),
        500: v.object({
          error: v.string(),
        }),
      },
      summary: 'Compare two ranks by seniority',
    },

    statistics: {
      method: 'GET',
      path: '/ranks-statistics',
      responses: {
        200: RankStatisticsSchema,
        500: v.object({
          error: v.string(),
        }),
      },
      summary: 'Get rank statistics',
    },

    getByCode: {
      method: 'GET',
      path: '/ranks/:code',
      pathParams: v.object({
        code: RankCodeSchema,
      }),
      responses: {
        200: RankSchema,
        404: v.object({
          error: v.string(),
        }),
        500: v.object({
          error: v.string(),
        }),
      },
      summary: 'Get rank by code',
    },
  },
  {
    pathPrefix: '/api',
  }
)

export type RankContract = typeof rankContract
