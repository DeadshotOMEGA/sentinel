import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { MemberRepository } from '../../../src/repositories/member-repository.js'
import { DivisionRepository } from '../../../src/repositories/division-repository.js'
import { AdminUserRepository } from '../../../src/repositories/admin-user-repository.js'

describe('DDS Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let memberRepo: MemberRepository
  let divisionRepo: DivisionRepository
  let adminUserRepo: AdminUserRepository
  let testDivisionId: string
  let testMember1Id: string
  let testMember2Id: string
  let testAdminId: string
  let testDdsId: string

  beforeAll(async () => {
    await testDb.start()

    // Clear module cache to force fresh imports with new DATABASE_URL
    const modulesToClear = Object.keys(require.cache).filter(
      (key) => key.includes('@sentinel/database') || key.includes('src/app') || key.includes('src/routes')
    )
    modulesToClear.forEach((key) => delete require.cache[key])

    // Dynamically import app AFTER setting DATABASE_URL and clearing cache
    const { createApp } = await import('../../../src/app.js?t=' + Date.now())
    app = createApp()

    memberRepo = new MemberRepository(testDb.prisma!)
    divisionRepo = new DivisionRepository(testDb.prisma!)
    adminUserRepo = new AdminUserRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()

    // Create test division
    const division = await divisionRepo.create({
      name: 'Test Division',
      code: 'TESTDIV',
      description: 'Division for testing',
    })
    testDivisionId = division.id

    // Create test members
    const member1 = await memberRepo.create({
      serviceNumber: 'SN0001',
      rank: 'AB',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: testDivisionId,
      memberType: 'reserve',
    })
    testMember1Id = member1.id

    const member2 = await memberRepo.create({
      serviceNumber: 'SN0002',
      rank: 'LS',
      firstName: 'Jane',
      lastName: 'Smith',
      divisionId: testDivisionId,
      memberType: 'reserve',
    })
    testMember2Id = member2.id

    // Create test admin user
    const admin = await adminUserRepo.create({
      username: 'testadmin',
      displayName: 'Test Admin',
      role: 'admin',
      passwordHash: 'testhash123',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
    })
    testAdminId = admin.id
  })

  describe('GET /api/dds/current', () => {
    it('should return 200 with null when no DDS assigned for today', async () => {
      const response = await request(app)
        .get('/api/dds/current')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        assignment: null,
      })
    })

    it('should return 200 with DDS data when assigned for today', async () => {
      // Create DDS assignment for today
      const dds = await testDb.prisma!.ddsAssignment.create({
        data: {
          memberId: testMember1Id,
          assignedDate: new Date(),
          status: 'active',
          assignedBy: testAdminId,
        },
      })
      testDdsId = dds.id

      const response = await request(app)
        .get('/api/dds/current')
        .expect(200)

      expect(response.body.assignment).toBeDefined()
      expect(response.body.assignment.id).toBe(testDdsId)
      expect(response.body.assignment.memberId).toBe(testMember1Id)
      expect(response.body.assignment.status).toBe('active')
    })
  })

  describe('GET /api/dds/exists', () => {
    it('should return 200 with exists: false when no DDS for today', async () => {
      const response = await request(app)
        .get('/api/dds/exists')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        exists: false,
      })
    })

    it('should return 200 with exists: true when DDS exists for today', async () => {
      // Create DDS assignment for today
      await testDb.prisma!.ddsAssignment.create({
        data: {
          memberId: testMember1Id,
          assignedDate: new Date(),
          status: 'active',
          assignedBy: testAdminId,
        },
      })

      const response = await request(app)
        .get('/api/dds/exists')
        .expect(200)

      expect(response.body).toMatchObject({
        exists: true,
      })
    })
  })

  describe('GET /api/dds/audit-log', () => {
    it('should return 200 with empty array when no audit entries', async () => {
      const response = await request(app)
        .get('/api/dds/audit-log')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        logs: [],
        count: 0,
      })
    })

    it('should return 200 with audit log entries', async () => {
      // Create audit entries via ResponsibilityAuditLog table
      await testDb.prisma!.responsibilityAuditLog.create({
        data: {
          memberId: testMember1Id,
          tagName: 'DDS',
          action: 'assigned',
          performedBy: testAdminId,
          performedByType: 'admin',
          notes: 'Initial assignment',
        },
      })

      await testDb.prisma!.responsibilityAuditLog.create({
        data: {
          memberId: testMember1Id,
          tagName: 'DDS',
          action: 'accepted',
          performedBy: testMember1Id,
          performedByType: 'member',
        },
      })

      const response = await request(app)
        .get('/api/dds/audit-log')
        .expect(200)

      expect(response.body.logs).toHaveLength(2)
      expect(response.body.count).toBe(2)
      expect(response.body.logs[0]).toHaveProperty('action')
      expect(response.body.logs[0]).toHaveProperty('performedBy')
      expect(response.body.logs[0]).toHaveProperty('performedByType')
    })

    it('should support limit query parameter', async () => {
      // Create 5 audit entries
      for (let i = 1; i <= 5; i++) {
        await testDb.prisma!.responsibilityAuditLog.create({
          data: {
            memberId: testMember1Id,
            tagName: 'DDS',
            action: 'assigned',
            performedBy: testAdminId,
            performedByType: 'admin',
            notes: `Entry ${i}`,
          },
        })
      }

      const response = await request(app)
        .get('/api/dds/audit-log?limit=2')
        .expect(200)

      expect(response.body.logs).toHaveLength(2)
      expect(response.body.count).toBe(2)
    })
  })

  describe('POST /api/dds/assign', () => {
    it('should return 200 and create DDS assignment', async () => {
      const assignData = {
        memberId: testMember1Id,
        notes: 'Test DDS assignment',
      }

      const response = await request(app)
        .post('/api/dds/assign')
        .send(assignData)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'DDS assigned successfully',
      })
      expect(response.body.assignment).toBeDefined()
      expect(response.body.assignment.memberId).toBe(testMember1Id)
      expect(response.body.assignment.status).toBe('active')

      // Verify DDS was created in database
      const created = await testDb.prisma!.ddsAssignment.findUnique({
        where: { id: response.body.assignment.id },
      })

      expect(created).toBeDefined()
      expect(created?.memberId).toBe(testMember1Id)
    })

    it('should return 409 when DDS already exists for today', async () => {
      // Create existing DDS for today
      await testDb.prisma!.ddsAssignment.create({
        data: {
          memberId: testMember1Id,
          assignedDate: new Date(),
          status: 'active',
          assignedBy: testAdminId,
        },
      })

      const assignData = {
        memberId: testMember2Id,
        notes: 'Duplicate assignment',
      }

      const response = await request(app)
        .post('/api/dds/assign')
        .send(assignData)
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'CONFLICT',
        message: expect.stringContaining('already'),
      })
    })

    it('should return 404 when member does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const assignData = {
        memberId: nonExistentId,
      }

      const response = await request(app)
        .post('/api/dds/assign')
        .send(assignData)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })
  })

  describe('POST /api/dds/accept/:id', () => {
    it('should return 200 and create DDS when member accepts', async () => {
      // No DDS exists yet - member is self-accepting at kiosk
      const response = await request(app)
        .post(`/api/dds/accept/${testMember1Id}`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'DDS accepted successfully',
      })
      expect(response.body.assignment).toBeDefined()
      expect(response.body.assignment.memberId).toBe(testMember1Id)
      expect(response.body.assignment.status).toBe('active')
      expect(response.body.assignment.acceptedAt).toBeTruthy()

      // Verify DDS was created in database
      const created = await testDb.prisma!.ddsAssignment.findUnique({
        where: { id: response.body.assignment.id },
      })

      expect(created).toBeDefined()
      expect(created?.memberId).toBe(testMember1Id)
      expect(created?.status).toBe('active')
    })

    it('should return 409 when DDS already exists for today', async () => {
      // Create existing DDS for today
      await testDb.prisma!.ddsAssignment.create({
        data: {
          memberId: testMember1Id,
          assignedDate: new Date(),
          status: 'active',
          assignedBy: testAdminId,
        },
      })

      const response = await request(app)
        .post(`/api/dds/accept/${testMember1Id}`)
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'CONFLICT',
        message: expect.stringContaining('already'),
      })
    })

    it('should return 404 when member does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .post(`/api/dds/accept/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .post('/api/dds/accept/invalid-id')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/dds/transfer', () => {
    beforeEach(async () => {
      // Create active DDS assignment
      const dds = await testDb.prisma!.ddsAssignment.create({
        data: {
          memberId: testMember1Id,
          assignedDate: new Date(),
          status: 'active',
          assignedBy: testAdminId,
        },
      })
      testDdsId = dds.id
    })

    it('should return 200 and transfer DDS to new member', async () => {
      const transferData = {
        toMemberId: testMember2Id,
        notes: 'Member unavailable',
      }

      const response = await request(app)
        .post('/api/dds/transfer')
        .send(transferData)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('transferred'),
      })
      expect(response.body.assignment).toBeDefined()
      expect(response.body.assignment.memberId).toBe(testMember2Id)
      expect(response.body.assignment.status).toBe('active')
    })

    it('should return 404 when no active DDS exists for today', async () => {
      // Delete the DDS created in beforeEach
      await testDb.prisma!.ddsAssignment.delete({
        where: { id: testDdsId },
      })

      const transferData = {
        toMemberId: testMember2Id,
        notes: 'Test transfer',
      }

      const response = await request(app)
        .post('/api/dds/transfer')
        .send(transferData)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })

    it('should return 404 when target member does not exist', async () => {
      const nonExistentMemberId = '00000000-0000-0000-0000-000000000000'

      const transferData = {
        toMemberId: nonExistentMemberId,
        notes: 'Test transfer',
      }

      const response = await request(app)
        .post('/api/dds/transfer')
        .send(transferData)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentMemberId),
      })
    })
  })

  describe('POST /api/dds/release', () => {
    beforeEach(async () => {
      // Create active DDS assignment
      const dds = await testDb.prisma!.ddsAssignment.create({
        data: {
          memberId: testMember1Id,
          assignedDate: new Date(),
          status: 'active',
          assignedBy: testAdminId,
        },
      })
      testDdsId = dds.id
    })

    it('should return 200 and release DDS', async () => {
      const releaseData = {
        notes: 'DDS no longer needed',
      }

      const response = await request(app)
        .post('/api/dds/release')
        .send(releaseData)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        assignment: null,
      })

      // Verify DDS status was updated in database
      const updated = await testDb.prisma!.ddsAssignment.findUnique({
        where: { id: testDdsId },
      })

      expect(updated?.status).toBe('released')
    })

    it('should return 404 when no active DDS exists for today', async () => {
      // Delete the DDS created in beforeEach
      await testDb.prisma!.ddsAssignment.delete({
        where: { id: testDdsId },
      })

      const releaseData = {
        notes: 'Test release',
      }

      const response = await request(app)
        .post('/api/dds/release')
        .send(releaseData)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })
})
