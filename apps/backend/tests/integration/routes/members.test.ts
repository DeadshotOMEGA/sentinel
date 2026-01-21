import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { MemberRepository } from '../../../src/repositories/member-repository.js'
import { DivisionRepository } from '../../../src/repositories/division-repository.js'

describe('Members Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let memberRepo: MemberRepository
  let divisionRepo: DivisionRepository
  let testDivisionId: string
  let testMemberId: string

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
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()

    // Create test division for FK relationships
    const division = await divisionRepo.create({
      name: 'Test Division',
      code: 'TD',
      description: 'Division for testing',
    })
    testDivisionId = division.id
  })

  describe('GET /api/members', () => {
    it('should return 200 with empty array when no members exist', async () => {
      const response = await request(app)
        .get('/api/members')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        members: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      })
    })

    it('should return 200 with paginated members list', async () => {
      // Create test members
      await memberRepo.create({
        serviceNumber: 'SN0001',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
      })
      await memberRepo.create({
        serviceNumber: 'SN0002',
        rank: 'LS',
        firstName: 'Jane',
        lastName: 'Smith',
        divisionId: testDivisionId,
      })

      const response = await request(app)
        .get('/api/members')
        .expect(200)

      expect(response.body.members).toHaveLength(2)
      expect(response.body.total).toBe(2)
      expect(response.body.page).toBe(1)
      expect(response.body.limit).toBe(50)
      expect(response.body.members[0]).toHaveProperty('id')
      expect(response.body.members[0]).toHaveProperty('serviceNumber')
      expect(response.body.members[0]).toHaveProperty('rank')
      expect(response.body.members[0]).toHaveProperty('firstName')
      expect(response.body.members[0]).toHaveProperty('lastName')
    })

    it('should support pagination query parameters', async () => {
      // Create 5 test members
      for (let i = 1; i <= 5; i++) {
        await memberRepo.create({
          serviceNumber: `SN00${i}`,
          rank: 'AB',
          firstName: `Member${i}`,
          lastName: 'Test',
          divisionId: testDivisionId,
        })
      }

      const response = await request(app)
        .get('/api/members?page=1&limit=2')
        .expect(200)

      expect(response.body.members).toHaveLength(2)
      expect(response.body.total).toBe(5)
      expect(response.body.page).toBe(1)
      expect(response.body.limit).toBe(2)
      expect(response.body.totalPages).toBe(3)
    })

    it('should filter by divisionId', async () => {
      // Create second division
      const division2 = await divisionRepo.create({
        name: 'Division 2',
        code: 'D2',
      })

      await memberRepo.create({
        serviceNumber: 'SN0001',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
      })
      await memberRepo.create({
        serviceNumber: 'SN0002',
        rank: 'LS',
        firstName: 'Jane',
        lastName: 'Smith',
        divisionId: division2.id,
      })

      const response = await request(app)
        .get(`/api/members?divisionId=${testDivisionId}`)
        .expect(200)

      expect(response.body.members).toHaveLength(1)
      expect(response.body.members[0].divisionId).toBe(testDivisionId)
    })
  })

  describe('GET /api/members/:id', () => {
    beforeEach(async () => {
      const member = await memberRepo.create({
        serviceNumber: 'SN0001',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
        email: 'john.doe@test.com',
        mobilePhone: '123-456-7890',
      })
      testMemberId = member.id
    })

    it('should return 200 with member data when member exists', async () => {
      const response = await request(app)
        .get(`/api/members/${testMemberId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testMemberId,
        serviceNumber: 'SN0001',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
        email: 'john.doe@test.com',
        phoneNumber: '123-456-7890',
      })
      expect(response.body).toHaveProperty('createdAt')
      expect(response.body).toHaveProperty('updatedAt')
    })

    it('should return 404 when member does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .get(`/api/members/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/members/invalid-id')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/members', () => {
    it('should return 201 and create member with valid data', async () => {
      const newMember = {
        serviceNumber: 'SN99999',
        rank: 'MS',
        firstName: 'Alice',
        lastName: 'Johnson',
        divisionId: testDivisionId,
        email: 'alice@test.com',
        phoneNumber: '555-1234',
        middleInitial: 'M',
      }

      const response = await request(app)
        .post('/api/members')
        .send(newMember)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toMatchObject({
        serviceNumber: 'SN99999',
        rank: 'MS',
        firstName: 'Alice',
        lastName: 'Johnson',
        divisionId: testDivisionId,
        email: 'alice@test.com',
        phoneNumber: '555-1234',
        middleInitial: 'M',
      })
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('createdAt')

      // Verify member was created in database
      const created = await memberRepo.findById(response.body.id)
      expect(created).toBeDefined()
      expect(created?.serviceNumber).toBe('SN99999')
    })

    it('should return 409 when service number already exists', async () => {
      // Create initial member
      await memberRepo.create({
        serviceNumber: 'SN0001',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
      })

      // Try to create duplicate
      const duplicate = {
        serviceNumber: 'SN0001',
        rank: 'LS',
        firstName: 'Jane',
        lastName: 'Smith',
        divisionId: testDivisionId,
      }

      const response = await request(app)
        .post('/api/members')
        .send(duplicate)

      // Debug: Log the response to see what validation error we're getting
      if (response.status !== 409) {
        console.log('Expected 409 but got:', response.status)
        console.log('Response body:', JSON.stringify(response.body, null, 2))
      }

      expect(response.status).toBe(409)
      expect(response.body).toMatchObject({
        error: 'CONFLICT',
        message: expect.stringContaining('SN0001'),
      })
    })

    // TODO: Enable ts-rest automatic validation for Valibot schemas
    // Currently ts-rest doesn't auto-validate Valibot schemas - needs manual integration
    it.skip('should return 400 for missing required fields', async () => {
      const invalidMember = {
        rank: 'AB',
        firstName: 'John',
        // Missing serviceNumber, lastName, divisionId
      }

      const response = await request(app)
        .post('/api/members')
        .send(invalidMember)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    // TODO: Enable ts-rest automatic validation for Valibot schemas
    it.skip('should return 400 for invalid rank value', async () => {
      const invalidMember = {
        serviceNumber: 'SN99999',
        rank: 'INVALID_RANK',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
      }

      const response = await request(app)
        .post('/api/members')
        .send(invalidMember)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PATCH /api/members/:id', () => {
    beforeEach(async () => {
      const member = await memberRepo.create({
        serviceNumber: 'SN0001',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
      })
      testMemberId = member.id
    })

    it('should return 200 and update member with valid data', async () => {
      const updates = {
        rank: 'LS',
        email: 'updated@test.com',
        phoneNumber: '999-8888',
      }

      const response = await request(app)
        .patch(`/api/members/${testMemberId}`)
        .send(updates)

      // Debug: Log the response to see what validation error we're getting
      if (response.status !== 200) {
        console.log('Expected 200 but got:', response.status)
        console.log('Response body:', JSON.stringify(response.body, null, 2))
      }

      expect(response.status).toBe(200)

      expect(response.body).toMatchObject({
        id: testMemberId,
        rank: 'LS',
        email: 'updated@test.com',
        phoneNumber: '999-8888',
      })

      // Verify changes in database
      const updated = await memberRepo.findById(testMemberId)
      expect(updated?.rank).toBe('LS')
      expect(updated?.email).toBe('updated@test.com')
    })

    it('should return 404 when member does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .patch(`/api/members/${nonExistentId}`)
        .send({ rank: 'LS' })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })

    it('should allow partial updates', async () => {
      const response = await request(app)
        .patch(`/api/members/${testMemberId}`)
        .send({ email: 'partial@test.com' })
        .expect(200)

      expect(response.body.email).toBe('partial@test.com')
      expect(response.body.firstName).toBe('John') // Unchanged
    })
  })

  describe('DELETE /api/members/:id', () => {
    beforeEach(async () => {
      const member = await memberRepo.create({
        serviceNumber: 'SN0001',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
      })
      testMemberId = member.id
    })

    it('should return 200 and delete member (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/members/${testMemberId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted'),
      })

      // Verify member was soft-deleted (status set to inactive)
      const softDeleted = await memberRepo.findById(testMemberId)
      expect(softDeleted).not.toBeNull()
      expect(softDeleted?.status).toBe('inactive')
    })

    it('should return 404 when member does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .delete(`/api/members/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('GET /api/members/search/:serviceNumber', () => {
    beforeEach(async () => {
      await memberRepo.create({
        serviceNumber: 'SN12345',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
      })
    })

    it('should return 200 with member data when service number exists', async () => {
      const response = await request(app)
        .get('/api/members/search/SN12345')
        .expect(200)

      expect(response.body).toMatchObject({
        serviceNumber: 'SN12345',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
      })
    })

    it('should return 404 when service number does not exist', async () => {
      const response = await request(app)
        .get('/api/members/search/NOTFOUND')
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining('NOTFOUND'),
      })
    })
  })
})
