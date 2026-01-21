import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaClient } from '@sentinel/database'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { execSync } from 'child_process'
import path from 'path'
import { setPrismaClient, resetPrismaClient } from '../../src/lib/database.js'

/**
 * TestDatabase - Manages PostgreSQL container for integration tests
 *
 * Features:
 * - Container reuse for faster test execution
 * - Automatic migration application
 * - Easy reset between tests
 */
export class TestDatabase {
  private container: StartedPostgreSqlContainer | null = null
  public prisma: PrismaClient | null = null
  private pool: Pool | null = null
  private originalDatabaseUrl: string | undefined

  /**
   * Start PostgreSQL container and run migrations
   */
  async start(): Promise<void> {
    // Save original DATABASE_URL
    this.originalDatabaseUrl = process.env.DATABASE_URL

    // Start PostgreSQL container
    console.log('Starting PostgreSQL test container...')
    this.container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('sentineltest')
      .withUsername('testuser')
      .withPassword('testpass')
      .withReuse() // Reuse container across test runs for speed
      .start()

    // Set DATABASE_URL for tests
    const connectionString = this.container.getConnectionUri()
    process.env.DATABASE_URL = connectionString

    // Create pg Pool and Prisma adapter for Prisma 7
    this.pool = new Pool({ connectionString })
    const adapter = new PrismaPg(this.pool)

    // Initialize Prisma Client with adapter (required for Prisma 7)
    this.prisma = new PrismaClient({
      adapter,
      log: ['error'], // Only log errors in tests
    })

    // Inject test client into database service for routes
    setPrismaClient(this.prisma)
    console.log('✅ Injected test Prisma client into database service')

    // Apply schema to test database using db push with --url flag
    console.log('Applying database schema...')
    const schemaPath = path.resolve(__dirname, '../../../../packages/database/prisma/schema.prisma')

    try {
      execSync(`npx prisma db push --schema=${schemaPath} --url="${connectionString}" --accept-data-loss`, {
        stdio: 'pipe',
      })
      console.log('Schema applied successfully')
    } catch (error) {
      console.error('Schema application failed:', error)
      throw error
    }
  }

  /**
   * Stop container and cleanup
   */
  async stop(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect()
      this.prisma = null
    }

    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }

    if (this.container) {
      await this.container.stop()
      this.container = null
    }

    // Reset database service to default client
    resetPrismaClient()
    console.log('✅ Reset database service to default client')

    // Restore original DATABASE_URL
    if (this.originalDatabaseUrl) {
      process.env.DATABASE_URL = this.originalDatabaseUrl
    } else {
      delete process.env.DATABASE_URL
    }
  }

  /**
   * Reset database by truncating all tables
   * Use this in beforeEach to ensure test isolation
   */
  async reset(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized. Call start() first.')
    }

    // Disable foreign key checks temporarily
    await this.prisma.$executeRawUnsafe('SET session_replication_role = replica;')

    // Get all table names
    const tables = await this.prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations';`
    )

    // Truncate all tables
    for (const { tablename } of tables) {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`)
    }

    // Re-enable foreign key checks
    await this.prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;')
  }

  /**
   * Seed database with test data
   * Call this after reset() if you need baseline data
   */
  async seed(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized. Call start() first.')
    }

    // Create enum tables (in dependency order)
    await this.prisma.badgeStatus.createMany({
      data: [
        { code: 'active', name: 'Active', description: 'Badge is active and in use' },
        { code: 'inactive', name: 'Inactive', description: 'Badge is inactive' },
        { code: 'lost', name: 'Lost', description: 'Badge has been reported lost' },
        { code: 'damaged', name: 'Damaged', description: 'Badge is damaged' },
      ],
      skipDuplicates: true,
    })

    await this.prisma.memberStatus.createMany({
      data: [
        { code: 'active', name: 'Active', description: 'Member is active' },
        { code: 'inactive', name: 'Inactive', description: 'Member is inactive' },
        { code: 'transferred', name: 'Transferred', description: 'Member has transferred' },
        { code: 'retired', name: 'Retired', description: 'Member has retired' },
        { code: 'pending_review', name: 'Pending Review', description: 'Member pending review' },
      ],
      skipDuplicates: true,
    })

    await this.prisma.memberType.createMany({
      data: [
        { code: 'reserve', name: 'Reserve', description: 'Reserve member' },
        { code: 'regular', name: 'Regular', description: 'Regular force member' },
        { code: 'civilian', name: 'Civilian', description: 'Civilian member' },
        { code: 'cadet', name: 'Cadet', description: 'Cadet member' },
      ],
      skipDuplicates: true,
    })

    await this.prisma.visitType.createMany({
      data: [
        { code: 'regular', name: 'Regular', description: 'Regular visit' },
        { code: 'training', name: 'Training', description: 'Training event' },
        { code: 'meeting', name: 'Meeting', description: 'Meeting attendance' },
        { code: 'exercise', name: 'Exercise', description: 'Military exercise' },
      ],
      skipDuplicates: true,
    })

    await this.prisma.listItem.createMany({
      data: [
        { code: 'general', name: 'General', description: 'General list item' },
      ],
      skipDuplicates: true,
    })

    // Create default divisions
    await this.prisma.division.createMany({
      data: [
        { code: 'OPS', name: 'Operations', description: 'Operations Division' },
        { code: 'LOG', name: 'Logistics', description: 'Logistics Division' },
        { code: 'ADMIN', name: 'Administration', description: 'Administration Division' },
      ],
      skipDuplicates: true,
    })
  }

  /**
   * Get Prisma client instance
   * Throws if not initialized
   */
  getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized. Call start() first.')
    }
    return this.prisma
  }
}
