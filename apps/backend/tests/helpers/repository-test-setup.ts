import { beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from './testcontainers'
import type { PrismaClient } from '@sentinel/database'

/**
 * SetupRepositoryTestOptions - Configuration for repository test setup
 */
interface SetupRepositoryTestOptions<T> {
  /**
   * Factory function to create repository instance
   * Receives the test PrismaClient and should return repository instance
   */
  createRepository: (prisma: PrismaClient) => T

  /**
   * Optional: Skip database seeding in beforeEach
   * Default: false (seeding enabled)
   */
  skipSeed?: boolean

  /**
   * Optional: Custom seed function
   * If provided, this will be called instead of testDb.seed()
   */
  customSeed?: (prisma: PrismaClient) => Promise<void>

  /**
   * Optional: Timeout for beforeAll hook (container startup)
   * Default: 60000ms (60 seconds)
   */
  beforeAllTimeout?: number
}

/**
 * SetupRepositoryTestResult - Returned from setupRepositoryTest
 */
interface SetupRepositoryTestResult<T> {
  /**
   * TestDatabase instance for advanced usage
   * Use if you need direct database access in tests
   */
  testDb: TestDatabase

  /**
   * Getter for repository instance
   * Returns the repository created with test database
   */
  getRepo: () => T

  /**
   * Getter for Prisma client
   * Use if you need to create test data directly
   */
  getPrisma: () => PrismaClient
}

/**
 * setupRepositoryTest - Reduces boilerplate for repository integration tests
 *
 * Sets up test database, handles lifecycle (start/stop/reset), and creates repository instance.
 *
 * @example
 * ```typescript
 * describe('MemberRepository Integration Tests', () => {
 *   const { getRepo, getPrisma } = setupRepositoryTest({
 *     createRepository: (prisma) => new MemberRepository(prisma),
 *   })
 *
 *   it('should create member', async () => {
 *     const repo = getRepo()
 *     const member = await repo.create({ ... })
 *     expect(member).toBeDefined()
 *   })
 * })
 * ```
 *
 * @example Custom seeding
 * ```typescript
 * const { getRepo } = setupRepositoryTest({
 *   createRepository: (prisma) => new BadgeRepository(prisma),
 *   customSeed: async (prisma) => {
 *     // Create custom baseline data
 *     await prisma.division.create({ ... })
 *     await prisma.member.create({ ... })
 *   },
 * })
 * ```
 *
 * @example Skip seeding
 * ```typescript
 * const { getRepo } = setupRepositoryTest({
 *   createRepository: (prisma) => new MyRepository(prisma),
 *   skipSeed: true,  // No seed between tests
 * })
 * ```
 *
 * @param options - Configuration options
 * @returns Object with testDb, getRepo(), and getPrisma() functions
 */
export function setupRepositoryTest<T>(
  options: SetupRepositoryTestOptions<T>
): SetupRepositoryTestResult<T> {
  const {
    createRepository,
    skipSeed = false,
    customSeed,
    beforeAllTimeout = 60000,
  } = options

  const testDb = new TestDatabase()
  let repo: T | null = null

  // Start container and create repository instance
  beforeAll(async () => {
    await testDb.start()

    if (!testDb.prisma) {
      throw new Error('TestDatabase prisma client not initialized')
    }

    repo = createRepository(testDb.prisma)
  }, beforeAllTimeout)

  // Stop container and cleanup
  afterAll(async () => {
    await testDb.stop()
    repo = null
  })

  // Reset database between tests
  beforeEach(async () => {
    await testDb.reset()

    if (!skipSeed) {
      if (customSeed && testDb.prisma) {
        await customSeed(testDb.prisma)
      } else {
        await testDb.seed()
      }
    }
  })

  return {
    testDb,
    getRepo: () => {
      if (!repo) {
        throw new Error('Repository not initialized. Ensure tests run after beforeAll hook.')
      }
      return repo
    },
    getPrisma: () => {
      if (!testDb.prisma) {
        throw new Error('Prisma client not initialized. Ensure tests run after beforeAll hook.')
      }
      return testDb.prisma
    },
  }
}

/**
 * createTestData - Helper to create common test data
 *
 * Use this in tests to create baseline entities with optional overrides.
 *
 * @example
 * ```typescript
 * const prisma = getPrisma()
 *
 * const division = await createTestData.division(prisma, {
 *   code: 'CUSTOM',
 *   name: 'Custom Division',
 * })
 *
 * const member = await createTestData.member(prisma, {
 *   divisionId: division.id,
 *   rank: 'CPO1',
 * })
 * ```
 */
export const createTestData = {
  /**
   * Create test division
   */
  division: async (prisma: PrismaClient, overrides: Partial<any> = {}) => {
    return await prisma.division.create({
      data: {
        code: overrides.code || `DIV${Date.now()}`,
        name: overrides.name || 'Test Division',
        description: overrides.description || 'Test Division Description',
        ...overrides,
      },
    })
  },

  /**
   * Create test member
   */
  member: async (prisma: PrismaClient, overrides: Partial<any> = {}) => {
    // Ensure division exists
    let divisionId = overrides.divisionId
    if (!divisionId) {
      const divisions = await prisma.division.findMany({ take: 1 })
      if (divisions.length === 0) {
        const division = await createTestData.division(prisma)
        divisionId = division.id
      } else {
        divisionId = divisions[0]!.id
      }
    }

    return await prisma.member.create({
      data: {
        serviceNumber: overrides.serviceNumber || `SN${Date.now()}`,
        rank: overrides.rank || 'AB',
        firstName: overrides.firstName || 'Test',
        lastName: overrides.lastName || 'Member',
        divisionId,
        memberType: overrides.memberType || 'class_a',
        status: overrides.status || 'ACTIVE',
        ...overrides,
      },
    })
  },

  /**
   * Create test badge
   */
  badge: async (prisma: PrismaClient, overrides: Partial<any> = {}) => {
    return await prisma.badge.create({
      data: {
        serialNumber: overrides.serialNumber || `B${Date.now()}`,
        status: overrides.status || 'ACTIVE',
        assignmentType: overrides.assignmentType || 'unassigned',
        assignedToId: overrides.assignedToId || null,
        ...overrides,
      },
    })
  },

  /**
   * Create test checkin
   */
  checkin: async (prisma: PrismaClient, overrides: Partial<any> = {}) => {
    // Ensure badge exists
    let badgeId = overrides.badgeId
    if (!badgeId) {
      const badge = await createTestData.badge(prisma)
      badgeId = badge.id
    }

    return await prisma.checkin.create({
      data: {
        badgeId,
        timestamp: overrides.timestamp || new Date(),
        direction: overrides.direction || 'in',
        kioskId: overrides.kioskId || 'KIOSK_TEST',
        ...overrides,
      },
    })
  },

  /**
   * Create test visitor
   */
  visitor: async (prisma: PrismaClient, overrides: Partial<any> = {}) => {
    return await prisma.visitor.create({
      data: {
        name: overrides.name || 'Test Visitor',
        organization: overrides.organization || 'Test Org',
        visitType: overrides.visitType || 'guest',
        visitReason: overrides.visitReason || 'Testing',
        kioskId: overrides.kioskId || 'KIOSK_TEST',
        checkInTime: overrides.checkInTime || new Date(),
        ...overrides,
      },
    })
  },

  /**
   * Create test event
   */
  event: async (prisma: PrismaClient, overrides: Partial<any> = {}) => {
    return await prisma.event.create({
      data: {
        code: overrides.code || `EVT${Date.now()}`,
        name: overrides.name || 'Test Event',
        description: overrides.description || 'Test Event Description',
        startDate: overrides.startDate || new Date(),
        endDate: overrides.endDate || new Date(),
        ...overrides,
      },
    })
  },

  /**
   * Create test tag
   */
  tag: async (prisma: PrismaClient, overrides: Partial<any> = {}) => {
    return await prisma.tag.create({
      data: {
        name: overrides.name || `Tag${Date.now()}`,
        description: overrides.description || 'Test Tag',
        color: overrides.color || '#000000',
        ...overrides,
      },
    })
  },
}
