import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { VisitorRepository } from '../../../src/repositories/visitor-repository.js'

describe('Visitors Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let visitorRepo: VisitorRepository
  let testVisitorId: string

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

    visitorRepo = new VisitorRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
  })

  describe('GET /api/visitors/active', () => {
    it('should return 200 with empty array when no active visitors', async () => {
      const response = await request(app)
        .get('/api/visitors/active')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('visitors')
      expect(response.body.visitors).toEqual([])
      expect(response.body.count).toBe(0)
    })

    it('should return 200 with active visitors list', async () => {
      // Create active visitors (no checkout time)
      await visitorRepo.create({
        name: 'John Visitor',
        organization: 'ABC Corp',
        visitType: 'contractor',
        visitReason: 'Maintenance work',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })

      await visitorRepo.create({
        name: 'Jane Guest',
        organization: 'XYZ Ltd',
        visitType: 'guest',
        visitReason: 'Meeting',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })

      // Create checked-out visitor (should not appear)
      await visitorRepo.create({
        name: 'Departed Visitor',
        organization: 'DEF Inc',
        visitType: 'contractor',
        checkInTime: new Date(Date.now() - 3600000),
        checkOutTime: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app)
        .get('/api/visitors/active')
        .expect(200)

      expect(response.body.visitors).toHaveLength(2)
      expect(response.body.count).toBe(2)
      expect(response.body.visitors[0]).toHaveProperty('id')
      expect(response.body.visitors[0]).toHaveProperty('name')
      expect(response.body.visitors[0]).toHaveProperty('visitType')
      expect(response.body.visitors[0].checkOutTime).toBeNull()
    })
  })

  describe('GET /api/visitors', () => {
    it('should return 200 with empty array when no visitors exist', async () => {
      const response = await request(app)
        .get('/api/visitors')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        visitors: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      })
    })

    it('should return 200 with paginated visitors list', async () => {
      // Create test visitors
      await visitorRepo.create({
        name: 'Visitor 1',
        organization: 'Org 1',
        visitType: 'contractor',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })

      await visitorRepo.create({
        name: 'Visitor 2',
        organization: 'Org 2',
        visitType: 'guest',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app)
        .get('/api/visitors')
        .expect(200)

      expect(response.body.visitors).toHaveLength(2)
      expect(response.body.total).toBe(2)
      expect(response.body.page).toBe(1)
      expect(response.body.limit).toBe(50)
    })

    it('should support pagination query parameters', async () => {
      // Create 5 test visitors
      for (let i = 1; i <= 5; i++) {
        await visitorRepo.create({
          name: `Visitor ${i}`,
          organization: `Org ${i}`,
          visitType: 'guest',
          checkInTime: new Date(),
          kioskId: 'KIOSK001',
        })
      }

      const response = await request(app)
        .get('/api/visitors?page=1&limit=2')
        .expect(200)

      expect(response.body.visitors).toHaveLength(2)
      expect(response.body.total).toBe(5)
      expect(response.body.page).toBe(1)
      expect(response.body.limit).toBe(2)
      expect(response.body.totalPages).toBe(3)
    })

    it('should filter by visitType', async () => {
      await visitorRepo.create({
        name: 'Contractor Visitor',
        visitType: 'contractor',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })

      await visitorRepo.create({
        name: 'Guest Visitor',
        visitType: 'guest',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app)
        .get('/api/visitors?visitType=contractor')
        .expect(200)

      expect(response.body.visitors).toHaveLength(1)
      expect(response.body.visitors[0].visitType).toBe('contractor')
    })
  })

  describe('POST /api/visitors', () => {
    it('should return 201 and create visitor with valid data', async () => {
      const newVisitor = {
        name: 'Test Visitor',
        organization: 'Test Org',
        visitType: 'contractor',
        visitReason: 'Testing',
        kioskId: 'KIOSK001',
      }

      const response = await request(app)
        .post('/api/visitors')
        .send(newVisitor)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toMatchObject({
        name: 'Test Visitor',
        organization: 'Test Org',
        visitType: 'contractor',
        visitReason: 'Testing',
        kioskId: 'KIOSK001',
      })
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('checkInTime')
      expect(response.body.checkOutTime).toBeNull()

      // Verify visitor was created in database
      const created = await visitorRepo.findById(response.body.id)
      expect(created).toBeDefined()
      expect(created?.name).toBe('Test Visitor')
    })

    it('should create visitor with minimal required fields', async () => {
      const minimalVisitor = {
        name: 'Minimal Visitor',
        visitType: 'guest',
        kioskId: 'KIOSK001',
      }

      const response = await request(app)
        .post('/api/visitors')
        .send(minimalVisitor)
        .expect(201)

      expect(response.body.name).toBe('Minimal Visitor')
      expect(response.body.visitType).toBe('guest')
      expect(response.body.organization).toBeNull()
      expect(response.body.visitReason).toBeNull()
    })
  })

  describe('GET /api/visitors/:id', () => {
    beforeEach(async () => {
      const visitor = await visitorRepo.create({
        name: 'Test Visitor',
        organization: 'Test Org',
        visitType: 'contractor',
        visitReason: 'Testing',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })
      testVisitorId = visitor.id
    })

    it('should return 200 with visitor data when visitor exists', async () => {
      const response = await request(app)
        .get(`/api/visitors/${testVisitorId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testVisitorId,
        name: 'Test Visitor',
        organization: 'Test Org',
        visitType: 'contractor',
        visitReason: 'Testing',
        kioskId: 'KIOSK001',
      })
      expect(response.body).toHaveProperty('checkInTime')
      expect(response.body).toHaveProperty('createdAt')
    })

    it('should return 404 when visitor does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .get(`/api/visitors/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/visitors/invalid-id')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PATCH /api/visitors/:id', () => {
    beforeEach(async () => {
      const visitor = await visitorRepo.create({
        name: 'Original Visitor',
        organization: 'Original Org',
        visitType: 'contractor',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })
      testVisitorId = visitor.id
    })

    it('should return 200 and update visitor with valid data', async () => {
      const updates = {
        name: 'Updated Visitor',
        organization: 'Updated Org',
        visitReason: 'Updated reason',
      }

      const response = await request(app)
        .patch(`/api/visitors/${testVisitorId}`)
        .send(updates)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testVisitorId,
        name: 'Updated Visitor',
        organization: 'Updated Org',
        visitReason: 'Updated reason',
      })

      // Verify changes in database
      const updated = await visitorRepo.findById(testVisitorId)
      expect(updated?.name).toBe('Updated Visitor')
      expect(updated?.organization).toBe('Updated Org')
    })

    it('should return 404 when visitor does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .patch(`/api/visitors/${nonExistentId}`)
        .send({ name: 'Updated' })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })

    it('should allow partial updates', async () => {
      const response = await request(app)
        .patch(`/api/visitors/${testVisitorId}`)
        .send({ visitReason: 'New reason only' })
        .expect(200)

      expect(response.body.visitReason).toBe('New reason only')
      expect(response.body.name).toBe('Original Visitor') // Unchanged
    })
  })

  describe('POST /api/visitors/:id/checkout', () => {
    beforeEach(async () => {
      const visitor = await visitorRepo.create({
        name: 'Visitor to Checkout',
        organization: 'Test Org',
        visitType: 'contractor',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })
      testVisitorId = visitor.id
    })

    it('should return 200 and checkout visitor', async () => {
      const response = await request(app)
        .post(`/api/visitors/${testVisitorId}/checkout`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('message')
      expect(response.body.visitor).toHaveProperty('id', testVisitorId)
      expect(response.body.visitor.checkOutTime).toBeTruthy()

      // Verify checkout time in database
      const checkedOut = await visitorRepo.findById(testVisitorId)
      expect(checkedOut?.checkOutTime).toBeTruthy()
    })

    it('should return 404 when visitor does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .post(`/api/visitors/${nonExistentId}/checkout`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })

    it('should handle already checked-out visitor gracefully', async () => {
      // Checkout once
      await request(app)
        .post(`/api/visitors/${testVisitorId}/checkout`)
        .expect(200)

      // Try to checkout again
      const response = await request(app)
        .post(`/api/visitors/${testVisitorId}/checkout`)
        .expect(200)

      expect(response.body.visitor.checkOutTime).toBeTruthy()
    })
  })
})
