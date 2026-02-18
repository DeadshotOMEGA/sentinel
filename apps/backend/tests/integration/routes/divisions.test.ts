import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { DivisionRepository } from '../../../src/repositories/division-repository.js'
import { MemberRepository } from '../../../src/repositories/member-repository.js'

describe('Divisions Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let divisionRepo: DivisionRepository
  let memberRepo: MemberRepository
  let testDivisionId: string

  beforeAll(async () => {
    await testDb.start()

    // Dynamically import app AFTER setting DATABASE_URL
    const { createApp } = await import('../../../src/app.js')
    app = createApp()

    divisionRepo = new DivisionRepository(testDb.prisma!)
    memberRepo = new MemberRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seedRanks()
  }, 30000)

  describe('GET /api/divisions', () => {
    it('should return 200 with empty array when no divisions exist', async () => {
      const response = await request(app)
        .get('/api/divisions')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        divisions: [],
        total: 0,
      })
    })

    it('should return 200 with divisions list', async () => {
      // Create test divisions
      await divisionRepo.create({
        name: 'Operations',
        code: 'OPS',
        description: 'Operations division',
      })
      await divisionRepo.create({
        name: 'Engineering',
        code: 'ENG',
        description: 'Engineering division',
      })

      const response = await request(app)
        .get('/api/divisions')
        .expect(200)

      expect(response.body.divisions).toHaveLength(2)
      expect(response.body.total).toBe(2)
      expect(response.body.divisions[0]).toHaveProperty('id')
      expect(response.body.divisions[0]).toHaveProperty('name')
      expect(response.body.divisions[0]).toHaveProperty('code')
      expect(response.body.divisions[0]).toHaveProperty('createdAt')
      expect(response.body.divisions[0]).toHaveProperty('updatedAt')
    })

    it('should return created divisions in list response', async () => {
      const division = await divisionRepo.create({
        name: 'Test Division',
        code: 'TD',
      })

      // Create members in division
      await memberRepo.create({
        serviceNumber: 'SN0001',
        rank: 'S2',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: division.id,
        memberType: 'reserve',
      })
      await memberRepo.create({
        serviceNumber: 'SN0002',
        rank: 'S1',
        firstName: 'Jane',
        lastName: 'Smith',
        divisionId: division.id,
        memberType: 'reserve',
      })

      const response = await request(app)
        .get('/api/divisions')
        .expect(200)

      const testDiv = response.body.divisions.find((d: any) => d.id === division.id)
      expect(testDiv).toBeDefined()
      expect(testDiv.code).toBe('TD')
    })
  })

  describe('GET /api/divisions/:id', () => {
    beforeEach(async () => {
      const division = await divisionRepo.create({
        name: 'Test Division',
        code: 'TD',
        description: 'Test description',
      })
      testDivisionId = division.id
    })

    it('should return 200 with division data when division exists', async () => {
      const response = await request(app)
        .get(`/api/divisions/${testDivisionId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testDivisionId,
        name: 'Test Division',
        code: 'TD',
        description: 'Test description',
      })
      expect(response.body).toHaveProperty('createdAt')
      expect(response.body).toHaveProperty('updatedAt')
    })

    it('should return 404 when division does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .get(`/api/divisions/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })

    it('should return division details after members are added', async () => {
      await memberRepo.create({
        serviceNumber: 'SN0001',
        rank: 'S2',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
      })

      const response = await request(app)
        .get(`/api/divisions/${testDivisionId}`)
        .expect(200)

      expect(response.body.id).toBe(testDivisionId)
      expect(response.body.code).toBe('TD')
    })
  })

  describe('POST /api/divisions', () => {
    it('should return 201 and create division with valid data', async () => {
      const newDivision = {
        name: 'New Division',
        code: 'ND',
        description: 'A new division',
      }

      const response = await request(app)
        .post('/api/divisions')
        .send(newDivision)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toMatchObject({
        name: 'New Division',
        code: 'ND',
        description: 'A new division',
      })
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('createdAt')
      expect(response.body).toHaveProperty('updatedAt')

      // Verify division was created in database
      const created = await divisionRepo.findById(response.body.id)
      expect(created).toBeDefined()
      expect(created?.code).toBe('ND')
    })

    it('should create division without description (optional field)', async () => {
      const newDivision = {
        name: 'Minimal Division',
        code: 'MD',
      }

      const response = await request(app)
        .post('/api/divisions')
        .send(newDivision)
        .expect(201)

      expect(response.body).toMatchObject({
        name: 'Minimal Division',
        code: 'MD',
        description: null,
      })
    })

    it('should return 409 when division code already exists', async () => {
      // Create initial division
      await divisionRepo.create({
        name: 'Existing Division',
        code: 'EX',
      })

      // Try to create duplicate
      const duplicate = {
        name: 'Different Name',
        code: 'EX', // Same code
        description: 'Different description',
      }

      const response = await request(app)
        .post('/api/divisions')
        .send(duplicate)
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'CONFLICT',
        message: expect.stringContaining('EX'),
      })
    })

    it('should return 400 for missing required fields', async () => {
      const invalidDivision = {
        description: 'Missing name and code',
      }

      const response = await request(app)
        .post('/api/divisions')
        .send(invalidDivision)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for invalid code length', async () => {
      const invalidDivision = {
        name: 'Test Division',
        code: 'TOOLONGCODE', // Exceeds max length
      }

      const response = await request(app)
        .post('/api/divisions')
        .send(invalidDivision)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PATCH /api/divisions/:id', () => {
    beforeEach(async () => {
      const division = await divisionRepo.create({
        name: 'Original Name',
        code: 'ON',
        description: 'Original description',
      })
      testDivisionId = division.id
    })

    it('should return 200 and update division with valid data', async () => {
      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
      }

      const response = await request(app)
        .patch(`/api/divisions/${testDivisionId}`)
        .send(updates)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testDivisionId,
        name: 'Updated Name',
        code: 'ON', // Unchanged
        description: 'Updated description',
      })

      // Verify changes in database
      const updated = await divisionRepo.findById(testDivisionId)
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.description).toBe('Updated description')
    })

    it('should return 404 when division does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .patch(`/api/divisions/${nonExistentId}`)
        .send({ name: 'New Name' })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })

    it('should return 409 when updating to existing code', async () => {
      // Create second division
      await divisionRepo.create({
        name: 'Other Division',
        code: 'OD',
      })

      const response = await request(app)
        .patch(`/api/divisions/${testDivisionId}`)
        .send({ code: 'OD' }) // Try to use existing code
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'CONFLICT',
        message: expect.stringContaining('OD'),
      })
    })

    it('should allow partial updates', async () => {
      const response = await request(app)
        .patch(`/api/divisions/${testDivisionId}`)
        .send({ description: 'Only description updated' })
        .expect(200)

      expect(response.body.description).toBe('Only description updated')
      expect(response.body.name).toBe('Original Name') // Unchanged
      expect(response.body.code).toBe('ON') // Unchanged
    })

    it('should return updated division when members exist', async () => {
      // Add members to division
      await memberRepo.create({
        serviceNumber: 'SN0001',
        rank: 'S2',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
      })

      const response = await request(app)
        .patch(`/api/divisions/${testDivisionId}`)
        .send({ name: 'Updated Name' })
        .expect(200)

      expect(response.body.id).toBe(testDivisionId)
      expect(response.body.name).toBe('Updated Name')
    })
  })

  describe('DELETE /api/divisions/:id', () => {
    beforeEach(async () => {
      const division = await divisionRepo.create({
        name: 'Delete Test',
        code: 'DT',
      })
      testDivisionId = division.id
    })

    it('should return 200 and delete division when empty', async () => {
      const response = await request(app)
        .delete(`/api/divisions/${testDivisionId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted'),
      })

      // Verify division was deleted
      const deleted = await divisionRepo.findById(testDivisionId)
      expect(deleted).toBeNull()
    })

    it('should return 404 when division does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .delete(`/api/divisions/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })

    it('should return 409 when division has members', async () => {
      // Add member to division
      await memberRepo.create({
        serviceNumber: 'SN0001',
        rank: 'S2',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: testDivisionId,
      })

      const response = await request(app)
        .delete(`/api/divisions/${testDivisionId}`)
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'CONFLICT',
        message: expect.stringContaining('Cannot delete'),
      })

      // Verify division was not deleted
      const stillExists = await divisionRepo.findById(testDivisionId)
      expect(stillExists).not.toBeNull()
    })
  })
})
