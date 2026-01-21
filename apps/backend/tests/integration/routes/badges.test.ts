import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { BadgeRepository } from '../../../src/repositories/badge-repository.js'
import { MemberRepository } from '../../../src/repositories/member-repository.js'
import { DivisionRepository } from '../../../src/repositories/division-repository.js'

describe('Badges Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let badgeRepo: BadgeRepository
  let memberRepo: MemberRepository
  let divisionRepo: DivisionRepository
  let testBadgeId: string
  let testMemberId: string
  let testDivisionId: string

  beforeAll(async () => {
    await testDb.start()

    // Dynamically import app AFTER setting DATABASE_URL
    const { createApp } = await import('../../../src/app.js')
    app = createApp()

    badgeRepo = new BadgeRepository(testDb.prisma!)
    memberRepo = new MemberRepository(testDb.prisma!)
    divisionRepo = new DivisionRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()

    // Create test division
    const division = await divisionRepo.create({
      name: 'Test Division',
      code: 'TD',
    })
    testDivisionId = division.id

    // Create test member
    const member = await memberRepo.create({
      serviceNumber: 'SN0001',
      rank: 'AB',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: testDivisionId,
    })
    testMemberId = member.id
  })

  describe('GET /api/badges', () => {
    it('should return 200 with empty array when no badges exist', async () => {
      const response = await request(app)
        .get('/api/badges')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        badges: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      })
    })

    it('should return 200 with paginated badges list', async () => {
      // Create test badges
      await badgeRepo.create({
        serialNumber: 'BADGE001',
        assignmentType: 'unassigned',
        status: 'active',
      })
      await badgeRepo.create({
        serialNumber: 'BADGE002',
        assignmentType: 'unassigned',
        status: 'active',
      })

      const response = await request(app)
        .get('/api/badges')
        .expect(200)

      expect(response.body.badges).toHaveLength(2)
      expect(response.body.total).toBe(2)
      expect(response.body.badges[0]).toHaveProperty('id')
      expect(response.body.badges[0]).toHaveProperty('serialNumber')
      expect(response.body.badges[0]).toHaveProperty('assignmentType')
      expect(response.body.badges[0]).toHaveProperty('status')
    })

    it('should support pagination query parameters', async () => {
      // Create 5 test badges
      for (let i = 1; i <= 5; i++) {
        await badgeRepo.create({
          serialNumber: `BADGE00${i}`,
          assignmentType: 'unassigned',
          status: 'active',
        })
      }

      const response = await request(app)
        .get('/api/badges?page=1&limit=2')
        .expect(200)

      expect(response.body.badges).toHaveLength(2)
      expect(response.body.total).toBe(5)
      expect(response.body.totalPages).toBe(3)
    })

    it('should filter by status', async () => {
      await badgeRepo.create({
        serialNumber: 'BADGE001',
        assignmentType: 'unassigned',
        status: 'active',
      })
      await badgeRepo.create({
        serialNumber: 'BADGE002',
        assignmentType: 'unassigned',
        status: 'lost',
      })

      const response = await request(app)
        .get('/api/badges?status=active')
        .expect(200)

      expect(response.body.badges).toHaveLength(1)
      expect(response.body.badges[0].status).toBe('active')
    })

    it('should filter assigned badges only', async () => {
      const badge1 = await badgeRepo.create({
        serialNumber: 'BADGE001',
        assignmentType: 'member',
        assignedToId: testMemberId,
        status: 'active',
      })
      await badgeRepo.create({
        serialNumber: 'BADGE002',
        assignmentType: 'unassigned',
        status: 'active',
      })

      const response = await request(app)
        .get('/api/badges?assignedOnly=true')
        .expect(200)

      expect(response.body.badges).toHaveLength(1)
      expect(response.body.badges[0].assignmentType).not.toBe('unassigned')
    })

    it('should filter unassigned badges only', async () => {
      await badgeRepo.create({
        serialNumber: 'BADGE001',
        assignmentType: 'member',
        assignedToId: testMemberId,
        status: 'active',
      })
      await badgeRepo.create({
        serialNumber: 'BADGE002',
        assignmentType: 'unassigned',
        status: 'active',
      })

      const response = await request(app)
        .get('/api/badges?unassignedOnly=true')
        .expect(200)

      expect(response.body.badges).toHaveLength(1)
      expect(response.body.badges[0].assignmentType).toBe('unassigned')
    })

    it('should include assigned member details', async () => {
      await badgeRepo.create({
        serialNumber: 'BADGE001',
        assignmentType: 'member',
        assignedToId: testMemberId,
        status: 'active',
      })

      const response = await request(app)
        .get('/api/badges')
        .expect(200)

      expect(response.body.badges[0].assignedTo).toBeDefined()
      expect(response.body.badges[0].assignedTo.name).toContain('John')
      expect(response.body.badges[0].assignedTo.type).toBe('member')
    })
  })

  describe('GET /api/badges/:id', () => {
    beforeEach(async () => {
      const badge = await badgeRepo.create({
        serialNumber: 'BADGE001',
        assignmentType: 'unassigned',
        status: 'active',
      })
      testBadgeId = badge.id
    })

    it('should return 200 with badge data when badge exists', async () => {
      const response = await request(app)
        .get(`/api/badges/${testBadgeId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testBadgeId,
        serialNumber: 'BADGE001',
        assignmentType: 'unassigned',
        status: 'active',
        assignedToId: null,
        assignedTo: null,
      })
    })

    it('should return 404 when badge does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .get(`/api/badges/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('GET /api/badges/serial/:serialNumber', () => {
    beforeEach(async () => {
      await badgeRepo.create({
        serialNumber: 'BADGE12345',
        assignmentType: 'unassigned',
        status: 'active',
      })
    })

    it('should return 200 with badge data when serial number exists', async () => {
      const response = await request(app)
        .get('/api/badges/serial/BADGE12345')
        .expect(200)

      expect(response.body).toMatchObject({
        serialNumber: 'BADGE12345',
        assignmentType: 'unassigned',
        status: 'active',
      })
    })

    it('should return 404 when serial number does not exist', async () => {
      const response = await request(app)
        .get('/api/badges/serial/NOTFOUND')
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining('NOTFOUND'),
      })
    })
  })

  describe('POST /api/badges', () => {
    it('should return 201 and create badge with valid data', async () => {
      const newBadge = {
        serialNumber: 'NEWBADGE001',
        assignmentType: 'unassigned',
        status: 'active',
      }

      const response = await request(app)
        .post('/api/badges')
        .send(newBadge)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toMatchObject({
        serialNumber: 'NEWBADGE001',
        assignmentType: 'unassigned',
        status: 'active',
        assignedToId: null,
      })
      expect(response.body).toHaveProperty('id')

      // Verify badge was created
      const created = await badgeRepo.findById(response.body.id)
      expect(created).toBeDefined()
    })

    it('should create assigned badge', async () => {
      const newBadge = {
        serialNumber: 'ASSIGNED001',
        assignmentType: 'member',
        assignedToId: testMemberId,
        status: 'active',
      }

      const response = await request(app)
        .post('/api/badges')
        .send(newBadge)
        .expect(201)

      expect(response.body).toMatchObject({
        serialNumber: 'ASSIGNED001',
        assignmentType: 'member',
        assignedToId: testMemberId,
      })
      expect(response.body.assignedTo).toBeDefined()
    })

    it('should return 409 when serial number already exists', async () => {
      // Create initial badge
      await badgeRepo.create({
        serialNumber: 'DUP001',
        assignmentType: 'unassigned',
        status: 'active',
      })

      const duplicate = {
        serialNumber: 'DUP001',
        assignmentType: 'unassigned',
        status: 'active',
      }

      const response = await request(app)
        .post('/api/badges')
        .send(duplicate)
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'CONFLICT',
        message: expect.stringContaining('DUP001'),
      })
    })

    it('should return 400 for missing required fields', async () => {
      const invalidBadge = {
        assignmentType: 'unassigned',
        // Missing serialNumber
      }

      const response = await request(app)
        .post('/api/badges')
        .send(invalidBadge)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PATCH /api/badges/:id', () => {
    beforeEach(async () => {
      const badge = await badgeRepo.create({
        serialNumber: 'UPDATE001',
        assignmentType: 'unassigned',
        status: 'active',
      })
      testBadgeId = badge.id
    })

    it('should return 200 and update badge status', async () => {
      const response = await request(app)
        .patch(`/api/badges/${testBadgeId}`)
        .send({ status: 'lost' })
        .expect(200)

      expect(response.body.status).toBe('lost')

      // Verify update in database
      const updated = await badgeRepo.findById(testBadgeId)
      expect(updated?.status).toBe('lost')
    })

    it('should return 404 when badge does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .patch(`/api/badges/${nonExistentId}`)
        .send({ status: 'lost' })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('POST /api/badges/:id/assign', () => {
    beforeEach(async () => {
      const badge = await badgeRepo.create({
        serialNumber: 'ASSIGN001',
        assignmentType: 'unassigned',
        status: 'active',
      })
      testBadgeId = badge.id
    })

    it('should return 200 and assign badge to member', async () => {
      const response = await request(app)
        .post(`/api/badges/${testBadgeId}/assign`)
        .send({
          assignedToId: testMemberId,
          assignmentType: 'member',
        })
        .expect(200)

      expect(response.body).toMatchObject({
        assignmentType: 'member',
        assignedToId: testMemberId,
      })
      expect(response.body.assignedTo).toBeDefined()
      expect(response.body.assignedTo.name).toContain('John')

      // Verify assignment in database
      const updated = await badgeRepo.findById(testBadgeId)
      expect(updated?.assignmentType).toBe('member')
      expect(updated?.assignedToId).toBe(testMemberId)
    })

    it('should return 404 when badge does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .post(`/api/badges/${nonExistentId}/assign`)
        .send({
          assignedToId: testMemberId,
          assignmentType: 'member',
        })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })

    it('should return 404 when assigned member does not exist', async () => {
      const nonExistentMemberId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .post(`/api/badges/${testBadgeId}/assign`)
        .send({
          assignedToId: nonExistentMemberId,
          assignmentType: 'member',
        })

      if (response.status !== 404) {
        console.log('Expected 404 but got:', response.status)
        console.log('Response body:', JSON.stringify(response.body, null, 2))
      }

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/badges/:id/unassign', () => {
    beforeEach(async () => {
      const badge = await badgeRepo.create({
        serialNumber: 'UNASSIGN001',
        assignmentType: 'member',
        assignedToId: testMemberId,
        status: 'active',
      })
      testBadgeId = badge.id
    })

    it('should return 200 and unassign badge', async () => {
      const response = await request(app)
        .post(`/api/badges/${testBadgeId}/unassign`)
        .expect(200)

      expect(response.body).toMatchObject({
        assignmentType: 'unassigned',
        assignedToId: null,
        assignedTo: null,
      })

      // Verify unassignment in database
      const updated = await badgeRepo.findById(testBadgeId)
      expect(updated?.assignmentType).toBe('unassigned')
      expect(updated?.assignedToId).toBeNull()
    })

    it('should return 404 when badge does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .post(`/api/badges/${nonExistentId}/unassign`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('DELETE /api/badges/:id', () => {
    beforeEach(async () => {
      const badge = await badgeRepo.create({
        serialNumber: 'DELETE001',
        assignmentType: 'unassigned',
        status: 'active',
      })
      testBadgeId = badge.id
    })

    it('should return 200 and delete badge', async () => {
      const response = await request(app)
        .delete(`/api/badges/${testBadgeId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted'),
      })

      // Verify deletion
      const deleted = await badgeRepo.findById(testBadgeId)
      expect(deleted).toBeNull()
    })

    it('should return 404 when badge does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .delete(`/api/badges/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('GET /api/badges/stats', () => {
    beforeEach(async () => {
      // Create various badges
      await badgeRepo.create({
        serialNumber: 'STATS001',
        assignmentType: 'member',
        assignedToId: testMemberId,
        status: 'active',
      })
      await badgeRepo.create({
        serialNumber: 'STATS002',
        assignmentType: 'unassigned',
        status: 'active',
      })
      await badgeRepo.create({
        serialNumber: 'STATS003',
        assignmentType: 'unassigned',
        status: 'lost',
      })
    })

    it('should return 200 with badge statistics', async () => {
      const response = await request(app)
        .get('/api/badges/stats')

      if (response.status !== 200) {
        console.log('Stats error:', response.status, response.body)
      }

      expect(response.status).toBe(200)

      expect(response.body).toMatchObject({
        total: 3,
        assigned: 1,
        unassigned: 2,
      })
      expect(response.body).toHaveProperty('byStatus')
      expect(response.body).toHaveProperty('byAssignmentType')
      expect(response.body.byStatus.active).toBe(2)
      expect(response.body.byStatus.lost).toBe(1)
    })

    it('should return correct counts when no badges exist', async () => {
      await testDb.reset()

      const response = await request(app)
        .get('/api/badges/stats')
        .expect(200)

      expect(response.body).toMatchObject({
        total: 0,
        assigned: 0,
        unassigned: 0,
      })
    })
  })
})
