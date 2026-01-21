import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { EventRepository } from '../../../src/repositories/event-repository.js'
import { BadgeRepository } from '../../../src/repositories/badge-repository.js'

describe('Events Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let eventRepo: EventRepository
  let badgeRepo: BadgeRepository
  let testEventId: string
  let testAttendeeId: string

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

    eventRepo = new EventRepository(testDb.prisma!)
    badgeRepo = new BadgeRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
  })

  describe('GET /api/events', () => {
    it('should return 200 with empty array when no events exist', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('events')
      expect(response.body.events).toEqual([])
    })

    it('should return 200 with events list', async () => {
      // Create test events
      await eventRepo.create({
        name: 'Annual Conference',
        code: 'CONF2026',
        description: 'Annual naval conference',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'active',
        autoExpireBadges: true,
      })

      await eventRepo.create({
        name: 'Training Exercise',
        code: 'TRAIN2026',
        startDate: new Date('2026-07-15'),
        endDate: new Date('2026-07-20'),
        status: 'draft',
        autoExpireBadges: true,
      })

      const response = await request(app)
        .get('/api/events')
        .expect(200)

      expect(response.body.events).toHaveLength(2)
      expect(response.body.events[0]).toHaveProperty('id')
      expect(response.body.events[0]).toHaveProperty('name')
      expect(response.body.events[0]).toHaveProperty('code')
      expect(response.body.events[0]).toHaveProperty('status')
      expect(response.body.events[0]).toHaveProperty('startDate')
      expect(response.body.events[0]).toHaveProperty('endDate')
    })
  })

  describe('POST /api/events', () => {
    it('should return 201 and create event with valid data', async () => {
      const newEvent = {
        name: 'Test Event',
        code: 'TEST2026',
        description: 'Test event description',
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-08-05T00:00:00.000Z',
        status: 'draft',
        autoExpireBadges: true,
      }

      const response = await request(app)
        .post('/api/events')
        .send(newEvent)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toMatchObject({
        name: 'Test Event',
        code: 'TEST2026',
        description: 'Test event description',
        status: 'draft',
        autoExpireBadges: true,
      })
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('createdAt')
      expect(response.body).toHaveProperty('updatedAt')

      // Verify event was created in database
      const created = await eventRepo.findById(response.body.id)
      expect(created).toBeDefined()
      expect(created?.code).toBe('TEST2026')
    })

    it('should return 409 when event code already exists', async () => {
      // Create initial event
      await eventRepo.create({
        name: 'First Event',
        code: 'DUPLICATE',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'draft',
        autoExpireBadges: true,
      })

      // Try to create duplicate
      const duplicate = {
        name: 'Second Event',
        code: 'DUPLICATE',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-03T00:00:00.000Z',
        status: 'draft',
      }

      const response = await request(app)
        .post('/api/events')
        .send(duplicate)
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'CONFLICT',
        message: expect.stringContaining('DUPLICATE'),
      })
    })

    it('should return 500 when end date is before start date', async () => {
      const invalidEvent = {
        name: 'Invalid Event',
        code: 'INVALID',
        startDate: '2026-08-05T00:00:00.000Z',
        endDate: '2026-08-01T00:00:00.000Z', // Before start
        status: 'draft',
        autoExpireBadges: true,
      }

      const response = await request(app)
        .post('/api/events')
        .send(invalidEvent)
        .expect(500)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/events/:id', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Test Event',
        code: 'TEST001',
        description: 'Test event',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'active',
        autoExpireBadges: true,
      })
      testEventId = event.id
    })

    it('should return 200 with event data when event exists', async () => {
      const response = await request(app)
        .get(`/api/events/${testEventId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testEventId,
        name: 'Test Event',
        code: 'TEST001',
        description: 'Test event',
        status: 'active',
      })
      expect(response.body).toHaveProperty('startDate')
      expect(response.body).toHaveProperty('endDate')
      expect(response.body).toHaveProperty('createdAt')
      expect(response.body).toHaveProperty('updatedAt')
    })

    it('should return 404 when event does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .get(`/api/events/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/events/invalid-id')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PATCH /api/events/:id', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Original Event',
        code: 'ORIG001',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'draft',
        autoExpireBadges: true,
      })
      testEventId = event.id
    })

    it('should return 200 and update event with valid data', async () => {
      const updates = {
        name: 'Updated Event',
        description: 'Updated description',
        status: 'active',
      }

      const response = await request(app)
        .patch(`/api/events/${testEventId}`)
        .send(updates)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testEventId,
        name: 'Updated Event',
        description: 'Updated description',
        status: 'active',
      })

      // Verify changes in database
      const updated = await eventRepo.findById(testEventId)
      expect(updated?.name).toBe('Updated Event')
      expect(updated?.status).toBe('active')
    })

    it('should return 404 when event does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .patch(`/api/events/${nonExistentId}`)
        .send({ name: 'Updated' })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })

    it('should allow partial updates', async () => {
      const response = await request(app)
        .patch(`/api/events/${testEventId}`)
        .send({ description: 'New description only' })
        .expect(200)

      expect(response.body.description).toBe('New description only')
      expect(response.body.name).toBe('Original Event') // Unchanged
    })
  })

  describe('DELETE /api/events/:id', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Event to Delete',
        code: 'DEL001',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'draft',
        autoExpireBadges: true,
      })
      testEventId = event.id
    })

    it('should return 200 and delete event', async () => {
      const response = await request(app)
        .delete(`/api/events/${testEventId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted'),
      })

      // Verify event was deleted from database
      const deleted = await eventRepo.findById(testEventId)
      expect(deleted).toBeNull()
    })

    it('should return 404 when event does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .delete(`/api/events/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('POST /api/events/:id/close', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Event to Close',
        code: 'CLOSE001',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'active',
        autoExpireBadges: true,
      })
      testEventId = event.id
    })

    it('should return 200 and close event', async () => {
      const response = await request(app)
        .post(`/api/events/${testEventId}/close`)
        .expect(200)

      expect(response.body).toHaveProperty('event')
      expect(response.body.event.status).toBe('completed')
      expect(response.body).toHaveProperty('expiredCount')

      // Verify event status in database
      const closed = await eventRepo.findById(testEventId)
      expect(closed?.status).toBe('completed')
    })

    it('should return 404 when event does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .post(`/api/events/${nonExistentId}/close`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })
  })

  describe('GET /api/events/:id/stats', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Stats Event',
        code: 'STATS001',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'active',
        autoExpireBadges: true,
      })
      testEventId = event.id

      // Add attendees for stats calculation (method requires at least one attendee)
      await eventRepo.addAttendee({
        eventId: testEventId,
        name: 'Attendee 1',
        organization: 'Org 1',
        role: 'participant',
        status: 'pending',
      })

      await eventRepo.addAttendee({
        eventId: testEventId,
        name: 'Attendee 2',
        organization: 'Org 2',
        role: 'speaker',
        status: 'approved',
      })
    })

    it('should return 200 with event statistics', async () => {
      const response = await request(app)
        .get(`/api/events/${testEventId}/stats`)
        .expect(200)

      expect(response.body).toHaveProperty('eventId')
      expect(response.body).toHaveProperty('totalAttendees')
      expect(response.body.totalAttendees).toBe(2)
    })

    it('should return 404 when event does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .get(`/api/events/${nonExistentId}/stats`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })
  })

  describe('GET /api/events/:id/attendees', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Attendees Event',
        code: 'ATT001',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'active',
        autoExpireBadges: true,
      })
      testEventId = event.id
    })

    it('should return 200 with empty array when no attendees', async () => {
      const response = await request(app)
        .get(`/api/events/${testEventId}/attendees`)
        .expect(200)

      expect(response.body).toHaveProperty('attendees')
      expect(response.body.attendees).toEqual([])
    })

    it('should return 200 with attendees list', async () => {
      // Create test attendees
      await eventRepo.addAttendee({
        eventId: testEventId,
        name: 'John Doe',
        rank: 'AB',
        organization: 'HMCS Chippawa',
        role: 'participant',
        status: 'pending',
      })

      await eventRepo.addAttendee({
        eventId: testEventId,
        name: 'Jane Smith',
        rank: 'LS',
        organization: 'HMCS Chippawa',
        role: 'speaker',
        status: 'pending',
      })

      const response = await request(app)
        .get(`/api/events/${testEventId}/attendees`)
        .expect(200)

      expect(response.body.attendees).toHaveLength(2)
      expect(response.body.attendees[0]).toHaveProperty('id')
      expect(response.body.attendees[0]).toHaveProperty('name')
      expect(response.body.attendees[0]).toHaveProperty('organization')
      expect(response.body.attendees[0]).toHaveProperty('role')
    })
  })

  describe('POST /api/events/:id/attendees', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Add Attendee Event',
        code: 'ADDATT001',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'active',
        autoExpireBadges: true,
      })
      testEventId = event.id
    })

    it('should return 201 and add attendee with valid data', async () => {
      const newAttendee = {
        eventId: testEventId,
        name: 'Test Attendee',
        rank: 'MS',
        organization: 'Test Organization',
        role: 'participant',
        status: 'pending',
      }

      const response = await request(app)
        .post(`/api/events/${testEventId}/attendees`)
        .send(newAttendee)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toMatchObject({
        eventId: testEventId,
        name: 'Test Attendee',
        rank: 'MS',
        organization: 'Test Organization',
        role: 'participant',
        status: 'pending',
      })
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('createdAt')
    })
  })

  describe('PATCH /api/events/:id/attendees/:attendeeId', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Update Attendee Event',
        code: 'UPATT001',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'active',
        autoExpireBadges: true,
      })
      testEventId = event.id

      const attendee = await eventRepo.addAttendee({
        eventId: testEventId,
        name: 'Original Name',
        organization: 'Original Org',
        role: 'participant',
        status: 'pending',
      })
      testAttendeeId = attendee.id
    })

    it('should return 200 and update attendee', async () => {
      const updates = {
        name: 'Updated Name',
        role: 'speaker',
        status: 'approved',
      }

      const response = await request(app)
        .patch(`/api/events/${testEventId}/attendees/${testAttendeeId}`)
        .send(updates)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testAttendeeId,
        name: 'Updated Name',
        role: 'speaker',
        status: 'approved',
      })
    })

    it('should return 404 when attendee does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .patch(`/api/events/${testEventId}/attendees/${nonExistentId}`)
        .send({ name: 'Updated' })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('DELETE /api/events/:id/attendees/:attendeeId', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Delete Attendee Event',
        code: 'DELATT001',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'active',
        autoExpireBadges: true,
      })
      testEventId = event.id

      const attendee = await eventRepo.addAttendee({
        eventId: testEventId,
        name: 'To Be Deleted',
        organization: 'Test Org',
        role: 'participant',
        status: 'pending',
      })
      testAttendeeId = attendee.id
    })

    it('should return 200 and remove attendee', async () => {
      const response = await request(app)
        .delete(`/api/events/${testEventId}/attendees/${testAttendeeId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('removed'),
      })
    })

    it('should return 404 when attendee does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .delete(`/api/events/${testEventId}/attendees/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('POST /api/events/:id/attendees/:attendeeId/badge', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Badge Assignment Event',
        code: 'BADGE001',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'active',
        autoExpireBadges: true,
      })
      testEventId = event.id

      const attendee = await eventRepo.addAttendee({
        eventId: testEventId,
        name: 'Attendee Needing Badge',
        organization: 'Test Org',
        role: 'participant',
        status: 'pending',
      })
      testAttendeeId = attendee.id
    })

    it('should return 200 and assign badge to attendee', async () => {
      // Create available badge
      const badge = await badgeRepo.create({
        serialNumber: 'EVENT-BADGE-001',
        status: 'active',
        assignmentType: 'unassigned',
      })

      const response = await request(app)
        .post(`/api/events/${testEventId}/attendees/${testAttendeeId}/assign-badge`)
        .send({ badgeId: badge.id })
        .expect(200)

      expect(response.body).toMatchObject({
        id: testAttendeeId,
        badgeId: badge.id,
      })
      expect(response.body.badgeAssignedAt).toBeTruthy()
    })

    it('should return 404 when attendee does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const badge = await badgeRepo.create({
        serialNumber: 'EVENT-BADGE-002',
        status: 'active',
        assignmentType: 'unassigned',
      })

      const response = await request(app)
        .post(`/api/events/${testEventId}/attendees/${nonExistentId}/assign-badge`)
        .send({ badgeId: badge.id })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('DELETE /api/events/:id/attendees/:attendeeId/badge', () => {
    beforeEach(async () => {
      const event = await eventRepo.create({
        name: 'Badge Unassignment Event',
        code: 'UNBADGE001',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        status: 'active',
        autoExpireBadges: true,
      })
      testEventId = event.id

      const badge = await badgeRepo.create({
        serialNumber: 'EVENT-BADGE-REMOVE-001',
        status: 'active',
        assignmentType: 'unassigned',
      })

      const attendee = await eventRepo.addAttendee({
        eventId: testEventId,
        name: 'Attendee with Badge',
        organization: 'Test Org',
        role: 'participant',
        status: 'pending',
        badgeId: badge.id,
        badgeAssignedAt: new Date(),
      })
      testAttendeeId = attendee.id
    })

    it('should return 200 and unassign badge from attendee', async () => {
      const response = await request(app)
        .delete(`/api/events/${testEventId}/attendees/${testAttendeeId}/badge`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testAttendeeId,
        badgeId: null,
        badgeAssignedAt: null,
      })
    })

    it('should return 404 when attendee does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .delete(`/api/events/${testEventId}/attendees/${nonExistentId}/badge`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('GET /api/events/badges/available', () => {
    it('should return 200 with available badges', async () => {
      // Create some badges
      await badgeRepo.create({
        serialNumber: 'AVAIL-001',
        status: 'active',
        assignmentType: 'unassigned',
      })

      await badgeRepo.create({
        serialNumber: 'AVAIL-002',
        status: 'active',
        assignmentType: 'unassigned',
      })

      const response = await request(app)
        .get('/api/events/badges/available')
        .expect(200)

      expect(response.body).toHaveProperty('badges')
      expect(response.body.badges.length).toBeGreaterThanOrEqual(2)
    })
  })
})
