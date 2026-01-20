import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { EventRepository } from '../../../src/repositories/event-repository'
import type {
  CreateEventInput,
  UpdateEventInput,
  CreateAttendeeInput,
  UpdateAttendeeInput,
  EventCheckinDirection,
} from '@sentinel/types'

describe('EventRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: EventRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new EventRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    // Create admin user for createdBy field
    await testDb.prisma!.adminUser.create({
      data: {
        username: 'admin',
        passwordHash: 'test',
        email: 'admin@test.com',
        displayName: 'Admin User',
        role: 'ADMIN',
      },
    })
  })

  describe('Event CRUD - create', () => {
    it('should create an event with all required fields', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const input: CreateEventInput = {
        name: 'Test Event',
        code: 'TEST001',
        description: 'A test event',
        startDate: new Date('2026-01-20'),
        endDate: new Date('2026-01-21'),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      }

      const event = await repo.create(input)

      expect(event.id).toBeDefined()
      expect(event.name).toBe(input.name)
      expect(event.code).toBe(input.code)
      expect(event.status).toBe('active')
      expect(event.autoExpireBadges).toBe(true)
      expect(event.createdBy).toBe(admin!.id)
    })

    it('should create event without description', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const input: CreateEventInput = {
        name: 'Test Event',
        code: 'TEST002',
        startDate: new Date('2026-01-20'),
        endDate: new Date('2026-01-21'),
        status: 'active',
        autoExpireBadges: false,
        createdBy: admin!.id,
      }

      const event = await repo.create(input)

      expect(event.description).toBeNull()
      expect(event.autoExpireBadges).toBe(false)
    })

    it('should throw error when status is missing', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const input: any = {
        name: 'Test Event',
        code: 'TEST003',
        startDate: new Date(),
        endDate: new Date(),
        autoExpireBadges: true,
        createdBy: admin!.id,
      }

      await expect(repo.create(input)).rejects.toThrow('Event status is required')
    })

    it('should throw error when autoExpireBadges is undefined', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const input: any = {
        name: 'Test Event',
        code: 'TEST004',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        createdBy: admin!.id,
      }

      await expect(repo.create(input)).rejects.toThrow('autoExpireBadges must be explicitly set')
    })

    it('should handle invalid createdBy UUID', async () => {
      const input: CreateEventInput = {
        name: 'Test Event',
        code: 'TEST005',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: 'invalid-uuid',
      }

      const event = await repo.create(input)
      expect(event.createdBy).toBeNull()
    })

    it('should throw error on duplicate code', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const input: CreateEventInput = {
        name: 'Test Event',
        code: 'DUPLICATE',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      }

      await repo.create(input)
      await expect(repo.create({ ...input, name: 'Different Name' })).rejects.toThrow()
    })
  })

  describe('Event CRUD - findAll', () => {
    it('should return empty array when no events exist', async () => {
      const events = await repo.findAll()
      expect(events).toEqual([])
    })

    it('should return all events sorted by startDate desc', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      await repo.create({
        name: 'Event 1',
        code: 'E1',
        startDate: new Date('2026-01-20'),
        endDate: new Date('2026-01-21'),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })
      await repo.create({
        name: 'Event 2',
        code: 'E2',
        startDate: new Date('2026-01-25'),
        endDate: new Date('2026-01-26'),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })
      await repo.create({
        name: 'Event 3',
        code: 'E3',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-16'),
        status: 'completed',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const events = await repo.findAll()

      expect(events).toHaveLength(3)
      expect(events[0].code).toBe('E2') // Latest startDate
      expect(events[1].code).toBe('E1')
      expect(events[2].code).toBe('E3') // Earliest startDate
    })
  })

  describe('Event CRUD - findById', () => {
    it('should find existing event by ID', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const created = await repo.create({
        name: 'Test Event',
        code: 'FIND001',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.code).toBe('FIND001')
    })

    it('should return null when event does not exist', async () => {
      const found = await repo.findById('550e8400-e29b-41d4-a716-446655440000')
      expect(found).toBeNull()
    })
  })

  describe('Event CRUD - findByCode', () => {
    it('should find existing event by code', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      await repo.create({
        name: 'Test Event',
        code: 'UNIQUE001',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const found = await repo.findByCode('UNIQUE001')

      expect(found).toBeDefined()
      expect(found?.code).toBe('UNIQUE001')
    })

    it('should return null when code does not exist', async () => {
      const found = await repo.findByCode('NONEXISTENT')
      expect(found).toBeNull()
    })
  })

  describe('Event CRUD - update', () => {
    it('should update event name', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const created = await repo.create({
        name: 'Old Name',
        code: 'UPDATE001',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const updated = await repo.update(created.id, { name: 'New Name' })

      expect(updated.name).toBe('New Name')
      expect(updated.code).toBe('UPDATE001')
    })

    it('should update multiple fields', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const created = await repo.create({
        name: 'Old Name',
        code: 'UPDATE002',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const update: UpdateEventInput = {
        name: 'New Name',
        status: 'completed',
        autoExpireBadges: false,
      }
      const updated = await repo.update(created.id, update)

      expect(updated.name).toBe('New Name')
      expect(updated.status).toBe('completed')
      expect(updated.autoExpireBadges).toBe(false)
    })

    it('should throw error when updating non-existent event', async () => {
      await expect(
        repo.update('550e8400-e29b-41d4-a716-446655440000', { name: 'New Name' })
      ).rejects.toThrow('Event not found')
    })

    it('should throw error when updating with empty data', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const created = await repo.create({
        name: 'Test Event',
        code: 'UPDATE003',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      await expect(repo.update(created.id, {})).rejects.toThrow('No fields to update')
    })
  })

  describe('Event CRUD - delete', () => {
    it('should delete existing event', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const created = await repo.create({
        name: 'Test Event',
        code: 'DELETE001',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      await repo.delete(created.id)

      const found = await repo.findById(created.id)
      expect(found).toBeNull()
    })

    it('should throw error when deleting non-existent event', async () => {
      await expect(repo.delete('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
        'Event not found'
      )
    })
  })

  describe('Event Attendee - addAttendee', () => {
    it('should add attendee with all fields', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'ATT001',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const input: CreateAttendeeInput = {
        eventId: event.id,
        name: 'John Doe',
        rank: 'CPO1',
        organization: 'Test Org',
        role: 'Participant',
        status: 'active',
      }

      const attendee = await repo.addAttendee(input)

      expect(attendee.id).toBeDefined()
      expect(attendee.name).toBe('John Doe')
      expect(attendee.eventId).toBe(event.id)
      expect(attendee.status).toBe('active')
    })

    it('should throw error when status is missing', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'ATT002',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const input: any = {
        eventId: event.id,
        name: 'John Doe',
        organization: 'Test Org',
        role: 'Participant',
      }

      await expect(repo.addAttendee(input)).rejects.toThrow('Attendee status is required')
    })
  })

  describe('Event Attendee - findByEventId', () => {
    it('should return empty array when no attendees', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'ATT003',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const attendees = await repo.findByEventId(event.id)
      expect(attendees).toEqual([])
    })

    it('should return all attendees sorted by name', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'ATT004',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      await repo.addAttendee({
        eventId: event.id,
        name: 'Charlie',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })
      await repo.addAttendee({
        eventId: event.id,
        name: 'Alice',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })
      await repo.addAttendee({
        eventId: event.id,
        name: 'Bob',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })

      const attendees = await repo.findByEventId(event.id)

      expect(attendees).toHaveLength(3)
      expect(attendees[0].name).toBe('Alice')
      expect(attendees[1].name).toBe('Bob')
      expect(attendees[2].name).toBe('Charlie')
    })
  })

  describe('Event Attendee - findAttendeeById', () => {
    it('should find existing attendee', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'ATT005',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const created = await repo.addAttendee({
        eventId: event.id,
        name: 'John Doe',
        organization: 'Test Org',
        role: 'Guest',
        status: 'active',
      })

      const found = await repo.findAttendeeById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe('John Doe')
    })

    it('should return null when attendee does not exist', async () => {
      const found = await repo.findAttendeeById('550e8400-e29b-41d4-a716-446655440000')
      expect(found).toBeNull()
    })
  })

  describe('Event Attendee - updateAttendee', () => {
    it('should update attendee fields', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'ATT006',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const created = await repo.addAttendee({
        eventId: event.id,
        name: 'Old Name',
        organization: 'Old Org',
        role: 'Guest',
        status: 'active',
      })

      const update: UpdateAttendeeInput = {
        name: 'New Name',
        organization: 'New Org',
        status: 'checked_out',
      }
      const updated = await repo.updateAttendee(created.id, update)

      expect(updated.name).toBe('New Name')
      expect(updated.organization).toBe('New Org')
      expect(updated.status).toBe('checked_out')
    })

    it('should throw error when attendee not found', async () => {
      await expect(
        repo.updateAttendee('550e8400-e29b-41d4-a716-446655440000', { name: 'New Name' })
      ).rejects.toThrow('Event attendee not found')
    })

    it('should throw error when updating with empty data', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'ATT007',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const created = await repo.addAttendee({
        eventId: event.id,
        name: 'John Doe',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })

      await expect(repo.updateAttendee(created.id, {})).rejects.toThrow('No fields to update')
    })
  })

  describe('Event Attendee - removeAttendee', () => {
    it('should remove existing attendee', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'ATT008',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const created = await repo.addAttendee({
        eventId: event.id,
        name: 'John Doe',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })

      await repo.removeAttendee(created.id)

      const found = await repo.findAttendeeById(created.id)
      expect(found).toBeNull()
    })

    it('should throw error when attendee not found', async () => {
      await expect(repo.removeAttendee('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
        'Event attendee not found'
      )
    })
  })

  describe('Badge Assignment - assignBadge', () => {
    it('should assign badge to attendee', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'BADGE001',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const badge = await testDb.prisma!.badge.create({
        data: {
          serialNumber: 'B001',
          status: 'ACTIVE',
          assignmentType: 'none',
        },
      })

      const attendee = await repo.addAttendee({
        eventId: event.id,
        name: 'John Doe',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })

      const updated = await repo.assignBadge(attendee.id, badge.id)

      expect(updated.badgeId).toBe(badge.id)
      expect(updated.badgeAssignedAt).toBeDefined()
    })

    it('should throw error when attendee not found', async () => {
      const badge = await testDb.prisma!.badge.create({
        data: {
          serialNumber: 'B002',
          status: 'ACTIVE',
          assignmentType: 'none',
        },
      })

      await expect(
        repo.assignBadge('550e8400-e29b-41d4-a716-446655440000', badge.id)
      ).rejects.toThrow('Event attendee not found')
    })
  })

  describe('Badge Assignment - unassignBadge', () => {
    it('should unassign badge from attendee', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'BADGE003',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const badge = await testDb.prisma!.badge.create({
        data: {
          serialNumber: 'B003',
          status: 'ACTIVE',
          assignmentType: 'none',
        },
      })

      const attendee = await repo.addAttendee({
        eventId: event.id,
        name: 'John Doe',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })

      await repo.assignBadge(attendee.id, badge.id)
      const updated = await repo.unassignBadge(attendee.id)

      expect(updated.badgeId).toBeNull()
      expect(updated.badgeAssignedAt).toBeNull()
    })
  })

  describe('Presence - getEventPresenceStats', () => {
    it('should return statistics for event', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'PRESENCE001',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      await repo.addAttendee({
        eventId: event.id,
        name: 'Active 1',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })
      await repo.addAttendee({
        eventId: event.id,
        name: 'Active 2',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })
      await repo.addAttendee({
        eventId: event.id,
        name: 'Checked Out',
        organization: 'Org',
        role: 'Guest',
        status: 'checked_out',
      })

      const stats = await repo.getEventPresenceStats(event.id)

      expect(stats.eventId).toBe(event.id)
      expect(stats.totalAttendees).toBe(3)
      expect(stats.activeAttendees).toBe(2)
      expect(stats.checkedOut).toBe(1)
    })

    it('should throw error when no attendees', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'PRESENCE002',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      await expect(repo.getEventPresenceStats(event.id)).rejects.toThrow(
        'No attendees found for event'
      )
    })
  })

  describe('Presence - getActiveAttendees', () => {
    it('should return only active attendees', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'PRESENCE003',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      await repo.addAttendee({
        eventId: event.id,
        name: 'Active',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })
      await repo.addAttendee({
        eventId: event.id,
        name: 'Checked Out',
        organization: 'Org',
        role: 'Guest',
        status: 'checked_out',
      })

      const active = await repo.getActiveAttendees(event.id)

      expect(active).toHaveLength(1)
      expect(active[0].name).toBe('Active')
    })
  })

  describe('Check-ins - recordCheckin', () => {
    it('should record check-in', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'CHECKIN001',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const badge = await testDb.prisma!.badge.create({
        data: {
          serialNumber: 'B100',
          status: 'ACTIVE',
          assignmentType: 'none',
        },
      })

      const attendee = await repo.addAttendee({
        eventId: event.id,
        name: 'John Doe',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })

      const checkin = await repo.recordCheckin(attendee.id, badge.id, 'IN', 'KIOSK-001')

      expect(checkin.id).toBeDefined()
      expect(checkin.eventAttendeeId).toBe(attendee.id)
      expect(checkin.badgeId).toBe(badge.id)
      expect(checkin.direction).toBe('IN')
      expect(checkin.kioskId).toBe('KIOSK-001')
    })
  })

  describe('Check-ins - getAttendeeCheckins', () => {
    it('should return checkin history sorted by timestamp desc', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'CHECKIN002',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const badge = await testDb.prisma!.badge.create({
        data: {
          serialNumber: 'B101',
          status: 'ACTIVE',
          assignmentType: 'none',
        },
      })

      const attendee = await repo.addAttendee({
        eventId: event.id,
        name: 'John Doe',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })

      await repo.recordCheckin(
        attendee.id,
        badge.id,
        'IN',
        'KIOSK-001',
        new Date('2026-01-20T08:00:00')
      )
      await repo.recordCheckin(
        attendee.id,
        badge.id,
        'OUT',
        'KIOSK-001',
        new Date('2026-01-20T12:00:00')
      )
      await repo.recordCheckin(
        attendee.id,
        badge.id,
        'IN',
        'KIOSK-001',
        new Date('2026-01-20T13:00:00')
      )

      const checkins = await repo.getAttendeeCheckins(attendee.id)

      expect(checkins).toHaveLength(3)
      expect(checkins[0].direction).toBe('IN') // Latest
      expect(checkins[1].direction).toBe('OUT')
      expect(checkins[2].direction).toBe('IN') // Earliest
    })
  })

  describe('Check-ins - getLastCheckinDirection', () => {
    it('should return last checkin direction', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'CHECKIN003',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const badge = await testDb.prisma!.badge.create({
        data: {
          serialNumber: 'B102',
          status: 'ACTIVE',
          assignmentType: 'none',
        },
      })

      const attendee = await repo.addAttendee({
        eventId: event.id,
        name: 'John Doe',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })

      await repo.recordCheckin(
        attendee.id,
        badge.id,
        'IN',
        'KIOSK-001',
        new Date('2026-01-20T08:00:00')
      )
      await repo.recordCheckin(
        attendee.id,
        badge.id,
        'OUT',
        'KIOSK-001',
        new Date('2026-01-20T12:00:00')
      )

      const direction = await repo.getLastCheckinDirection(attendee.id)

      expect(direction).toBe('OUT')
    })

    it('should return null when no checkins', async () => {
      const admin = await testDb.prisma!.adminUser.findFirst()
      const event = await repo.create({
        name: 'Test Event',
        code: 'CHECKIN004',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        autoExpireBadges: true,
        createdBy: admin!.id,
      })

      const attendee = await repo.addAttendee({
        eventId: event.id,
        name: 'John Doe',
        organization: 'Org',
        role: 'Guest',
        status: 'active',
      })

      const direction = await repo.getLastCheckinDirection(attendee.id)

      expect(direction).toBeNull()
    })
  })
})
