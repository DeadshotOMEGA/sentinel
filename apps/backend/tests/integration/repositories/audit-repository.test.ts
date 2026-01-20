import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { createAdminUser } from '../../helpers/factories'
import { AuditRepository } from '@/repositories/audit-repository'

describe('AuditRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: AuditRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new AuditRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed()
  })

  describe('log', () => {
    it('should create audit log with all fields', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      await repo.log({
        adminUserId: admin.id,
        action: 'member_create',
        entityType: 'member',
        entityId: 'member-123',
        details: { firstName: 'John', lastName: 'Doe' },
        ipAddress: '192.168.1.1',
      })

      const logs = await repo.findAll({ pagination: { page: 1, limit: 10 } })

      expect(logs.length).toBeGreaterThanOrEqual(1)
      const log = logs.find((l) => l.action === 'member_create')

      expect(log).toBeDefined()
      expect(log?.adminUserId).toBe(admin.id)
      expect(log?.entityType).toBe('member')
      expect(log?.entityId).toBe('member-123')
      expect(log?.ipAddress).toBe('192.168.1.1')
    })

    it('should log system action without admin user', async () => {
      await repo.log({
        adminUserId: null,
        action: 'user_created',
        entityType: 'user',
        entityId: 'user-456',
        details: { email: 'test@example.com' },
        ipAddress: '127.0.0.1',
      })

      const logs = await repo.findAll({ pagination: { page: 1, limit: 10 } })

      const log = logs.find((l) => l.action === 'user_created')

      expect(log).toBeDefined()
      expect(log?.adminUserId).toBeNull()
    })

    it('should log different audit actions', async () => {
      const actions: Array<Parameters<typeof repo.log>[0]['action']> = [
        'login',
        'logout',
        'badge_assign',
        'tag_create',
        'event_update',
      ]

      for (const action of actions) {
        await repo.log({
          adminUserId: null,
          action,
          entityType: 'test',
          entityId: null,
          details: {},
          ipAddress: '127.0.0.1',
        })
      }

      const logs = await repo.findAll({ pagination: { page: 1, limit: 10 } })

      expect(logs.length).toBeGreaterThanOrEqual(actions.length)
    })

    it('should handle empty details object', async () => {
      await repo.log({
        adminUserId: null,
        action: 'dev_tools_access',
        entityType: 'dev_tools',
        entityId: null,
        details: {},
        ipAddress: '10.0.0.1',
      })

      const logs = await repo.findAll({ pagination: { page: 1, limit: 10 } })

      const log = logs.find((l) => l.action === 'dev_tools_access')
      expect(log).toBeDefined()
    })

    it('should handle complex details object', async () => {
      await repo.log({
        adminUserId: null,
        action: 'import_execute',
        entityType: 'import',
        entityId: null,
        details: {
          rowCount: 100,
          errors: ['error1', 'error2'],
          summary: {
            created: 95,
            updated: 5,
            failed: 0,
          },
        },
        ipAddress: '192.168.1.100',
      })

      const logs = await repo.findAll({ pagination: { page: 1, limit: 10 } })

      const log = logs.find((l) => l.action === 'import_execute')
      expect(log).toBeDefined()
      expect(log?.details).toBeDefined()
    })
  })

  describe('findAll', () => {
    it('should find all audit logs with pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.log({
          adminUserId: null,
          action: 'login',
          entityType: 'auth',
          entityId: null,
          details: {},
          ipAddress: '127.0.0.1',
        })
      }

      const logs = await repo.findAll({ pagination: { page: 1, limit: 2 } })

      expect(logs).toHaveLength(2)
    })

    it('should filter by action', async () => {
      await repo.log({
        adminUserId: null,
        action: 'login',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      await repo.log({
        adminUserId: null,
        action: 'logout',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      const logs = await repo.findAll({
        filters: { action: 'login' },
        pagination: { page: 1, limit: 10 },
      })

      expect(logs.every((log) => log.action === 'login')).toBe(true)
    })

    it('should filter by multiple actions', async () => {
      await repo.log({
        adminUserId: null,
        action: 'login',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      await repo.log({
        adminUserId: null,
        action: 'logout',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      await repo.log({
        adminUserId: null,
        action: 'badge_assign',
        entityType: 'badge',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      const logs = await repo.findAll({
        filters: { action: ['login', 'logout'] },
        pagination: { page: 1, limit: 10 },
      })

      expect(logs.every((log) => log.action === 'login' || log.action === 'logout')).toBe(true)
      expect(logs.find((log) => log.action === 'badge_assign')).toBeUndefined()
    })

    it('should filter by actor (admin user)', async () => {
      const admin1 = await createAdminUser(testDb.prisma!, { username: 'admin1' })
      const admin2 = await createAdminUser(testDb.prisma!, { username: 'admin2' })

      await repo.log({
        adminUserId: admin1.id,
        action: 'member_create',
        entityType: 'member',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      await repo.log({
        adminUserId: admin2.id,
        action: 'member_create',
        entityType: 'member',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      const logs = await repo.findAll({
        filters: { actorId: admin1.id },
        pagination: { page: 1, limit: 10 },
      })

      expect(logs.every((log) => log.adminUserId === admin1.id)).toBe(true)
    })

    it('should filter by entity ID', async () => {
      await repo.log({
        adminUserId: null,
        action: 'member_update',
        entityType: 'member',
        entityId: 'member-123',
        details: {},
        ipAddress: '127.0.0.1',
      })

      await repo.log({
        adminUserId: null,
        action: 'member_update',
        entityType: 'member',
        entityId: 'member-456',
        details: {},
        ipAddress: '127.0.0.1',
      })

      const logs = await repo.findAll({
        filters: { entityId: 'member-123' },
        pagination: { page: 1, limit: 10 },
      })

      expect(logs.every((log) => log.entityId === 'member-123')).toBe(true)
    })

    it('should filter by date range', async () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      await repo.log({
        adminUserId: null,
        action: 'login',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      // Add small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 100))

      const logs = await repo.findAll({
        filters: {
          startDate: yesterday,
          endDate: tomorrow,
        },
        pagination: { page: 1, limit: 10 },
      })

      expect(logs.length).toBeGreaterThanOrEqual(1)
    })

    it('should return empty array when no matches', async () => {
      const logs = await repo.findAll({
        filters: { action: 'login' },
        pagination: { page: 1, limit: 10 },
      })

      expect(logs).toEqual([])
    })

    it('should order by createdAt descending', async () => {
      await repo.log({
        adminUserId: null,
        action: 'login',
        entityType: 'auth',
        entityId: null,
        details: { order: 1 },
        ipAddress: '127.0.0.1',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      await repo.log({
        adminUserId: null,
        action: 'login',
        entityType: 'auth',
        entityId: null,
        details: { order: 2 },
        ipAddress: '127.0.0.1',
      })

      const logs = await repo.findAll({
        filters: { action: 'login' },
        pagination: { page: 1, limit: 10 },
      })

      if (logs.length >= 2) {
        const timestamps = logs.map((l) => new Date(l.createdAt).getTime())
        expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1])
      }
    })
  })

  describe('count', () => {
    it('should count all audit logs', async () => {
      for (let i = 0; i < 3; i++) {
        await repo.log({
          adminUserId: null,
          action: 'login',
          entityType: 'auth',
          entityId: null,
          details: {},
          ipAddress: '127.0.0.1',
        })
      }

      const count = await repo.count()

      expect(count).toBeGreaterThanOrEqual(3)
    })

    it('should count with filters', async () => {
      await repo.log({
        adminUserId: null,
        action: 'login',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      await repo.log({
        adminUserId: null,
        action: 'logout',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      const count = await repo.count({ action: 'login' })

      expect(count).toBeGreaterThanOrEqual(1)
    })

    it('should return 0 when no matches', async () => {
      const count = await repo.count({ action: 'login' })

      expect(count).toBe(0)
    })

    it('should count with date range filter', async () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      await repo.log({
        adminUserId: null,
        action: 'login',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      const count = await repo.count({
        startDate: yesterday,
        endDate: new Date(now.getTime() + 1000),
      })

      expect(count).toBeGreaterThanOrEqual(1)
    })
  })

  describe('edge cases', () => {
    it('should handle pagination beyond available records', async () => {
      await repo.log({
        adminUserId: null,
        action: 'login',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '127.0.0.1',
      })

      const logs = await repo.findAll({ pagination: { page: 100, limit: 10 } })

      expect(logs).toEqual([])
    })

    it('should combine multiple filters', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      await repo.log({
        adminUserId: admin.id,
        action: 'member_create',
        entityType: 'member',
        entityId: 'member-123',
        details: {},
        ipAddress: '127.0.0.1',
      })

      await repo.log({
        adminUserId: admin.id,
        action: 'badge_assign',
        entityType: 'badge',
        entityId: 'badge-456',
        details: {},
        ipAddress: '127.0.0.1',
      })

      const logs = await repo.findAll({
        filters: {
          actorId: admin.id,
          action: 'member_create',
          entityId: 'member-123',
        },
        pagination: { page: 1, limit: 10 },
      })

      expect(logs).toHaveLength(1)
      expect(logs[0].action).toBe('member_create')
    })

    it('should handle different IP addresses', async () => {
      await repo.log({
        adminUserId: null,
        action: 'login',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '192.168.1.1',
      })

      await repo.log({
        adminUserId: null,
        action: 'login',
        entityType: 'auth',
        entityId: null,
        details: {},
        ipAddress: '10.0.0.1',
      })

      const logs = await repo.findAll({ pagination: { page: 1, limit: 10 } })

      expect(logs.length).toBeGreaterThanOrEqual(2)
    })
  })
})
