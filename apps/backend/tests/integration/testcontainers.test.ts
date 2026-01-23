import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../helpers/testcontainers'
import { createMember, createDivision } from '../helpers/factories'

describe('Testcontainers Setup', () => {
  const testDb = new TestDatabase()

  beforeAll(async () => {
    await testDb.start()
  }, 60000) // Increase timeout for container startup

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
  })

  it('should connect to PostgreSQL container', async () => {
    const prisma = testDb.getClient()
    const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`

    expect(result).toHaveLength(1)
    expect(result[0]!).toHaveProperty('now')
    expect(result[0]!.now).toBeInstanceOf(Date)
  })

  it('should run migrations successfully', async () => {
    const prisma = testDb.getClient()

    // Check that tables exist
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    )

    const tableNames = tables.map((t) => t.tablename)

    expect(tableNames).toContain('members')
    expect(tableNames).toContain('badges')
    expect(tableNames).toContain('checkins')
    expect(tableNames).toContain('divisions')
  })

  it('should create and retrieve a division', async () => {
    const prisma = testDb.getClient()

    const division = await createDivision(prisma, {
      code: 'TEST',
      name: 'Test Division',
    })

    expect(division).toHaveProperty('id')
    expect(division.code).toBe('TEST')
    expect(division.name).toBe('Test Division')

    const found = await prisma.division.findUnique({
      where: { id: division.id },
    })

    expect(found).not.toBeNull()
    expect(found?.code).toBe('TEST')
  })

  it('should create and retrieve a member', async () => {
    const prisma = testDb.getClient()

    const member = await createMember(prisma, {
      serviceNumber: 'A123456',
      firstName: 'John',
      lastName: 'Doe',
    })

    expect(member).toHaveProperty('id')
    expect(member.serviceNumber).toBe('A123456')
    expect(member.firstName).toBe('John')
    expect(member.lastName).toBe('Doe')

    const found = await prisma.member.findUnique({
      where: { id: member.id },
      include: { division: true },
    })

    expect(found).not.toBeNull()
    expect(found?.division).toBeDefined()
  })

  it('should reset database between tests', async () => {
    const prisma = testDb.getClient()

    // Create a member
    await createMember(prisma)

    const countBefore = await prisma.member.count()
    expect(countBefore).toBe(1)

    // Reset should clear all data
    await testDb.reset()

    const countAfter = await prisma.member.count()
    expect(countAfter).toBe(0)
  })

  it('should seed database with default data', async () => {
    const prisma = testDb.getClient()

    await testDb.seed()

    const divisions = await prisma.division.findMany()
    expect(divisions.length).toBeGreaterThanOrEqual(3)

    const divisionCodes = divisions.map((d) => d.code)
    expect(divisionCodes).toContain('OPS')
    expect(divisionCodes).toContain('LOG')
    expect(divisionCodes).toContain('ADMIN')
  })
})
