import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { CheckinRepository } from '../../../src/repositories/checkin-repository.js'
import { MemberRepository } from '../../../src/repositories/member-repository.js'
import { DivisionRepository } from '../../../src/repositories/division-repository.js'
import { BadgeRepository } from '../../../src/repositories/badge-repository.js'
import { LockupRepository } from '../../../src/repositories/lockup-repository.js'
import { AdminUserRepository } from '../../../src/repositories/admin-user-repository.js'

describe('Checkins Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let checkinRepo: CheckinRepository
  let memberRepo: MemberRepository
  let divisionRepo: DivisionRepository
  let badgeRepo: BadgeRepository
  let testMemberId: string
  let testBadgeId: string
  let testCheckinId: string

  beforeAll(async () => {
    await testDb.start()

    // Dynamically import app AFTER setting DATABASE_URL
    const { createApp } = await import('../../../src/app.js')
    app = createApp()

    checkinRepo = new CheckinRepository(testDb.prisma!)
    memberRepo = new MemberRepository(testDb.prisma!)
    divisionRepo = new DivisionRepository(testDb.prisma!)
    badgeRepo = new BadgeRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()

    // Seed ranks (required for member creation)
    await testDb.prisma!.rank.createMany({
      data: [
        { code: 'S2', name: 'Able Seaman', branch: 'navy', category: 'junior_ncm', displayOrder: 2 },
        { code: 'S1', name: 'Leading Seaman', branch: 'navy', category: 'junior_ncm', displayOrder: 3 },
      ],
      skipDuplicates: true,
    })

    // Create test division
    const division = await divisionRepo.create({
      name: 'Test Division',
      code: 'TD',
    })

    // Create test badge
    const badge = await badgeRepo.create({
      serialNumber: 'BADGE001',
      assignmentType: 'member',
      status: 'active',
    })
    testBadgeId = badge.id

    // Create test member
    const member = await memberRepo.create({
      serviceNumber: 'SN0001',
      rank: 'S2',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: division.id,
      badgeId: badge.id,
      memberType: 'reserve',
    })
    testMemberId = member.id
  })

  describe('GET /api/checkins', () => {
    it('should return 200 with empty array when no checkins exist', async () => {
      const response = await request(app)
        .get('/api/checkins')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        checkins: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      })
    })

    it('should return 200 with paginated checkins list', async () => {
      // Create test checkins
      await checkinRepo.create({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        synced: true,
      })
      await checkinRepo.create({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'OUT',
        kioskId: 'KIOSK1',
        synced: true,
      })

      const response = await request(app)
        .get('/api/checkins')
        .expect(200)

      expect(response.body.checkins).toHaveLength(2)
      expect(response.body.total).toBe(2)
      expect(response.body.checkins[0]).toHaveProperty('id')
      expect(response.body.checkins[0]).toHaveProperty('memberId')
      expect(response.body.checkins[0]).toHaveProperty('direction')
      expect(response.body.checkins[0]).toHaveProperty('timestamp')
      expect(response.body.checkins[0].member).toBeDefined()
    })

    it('should support pagination query parameters', async () => {
      // Create 5 test checkins
      for (let i = 0; i < 5; i++) {
        await checkinRepo.create({
          memberId: testMemberId,
          badgeId: testBadgeId,
          direction: i % 2 === 0 ? 'in' : 'out',
          kioskId: 'KIOSK1',
          synced: true,
        })
      }

      const response = await request(app)
        .get('/api/checkins?page=1&limit=2')
        .expect(200)

      expect(response.body.checkins).toHaveLength(2)
      expect(response.body.total).toBe(5)
      expect(response.body.totalPages).toBe(3)
    })

    it('should filter by memberId', async () => {
      // Create second member
      const member2 = await memberRepo.create({
        serviceNumber: 'SN0002',
        rank: 'S1',
        firstName: 'Jane',
        lastName: 'Smith',
        divisionId: (await divisionRepo.findAll())[0]!.id,
        memberType: 'reserve',
      })

      await checkinRepo.create({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        synced: true,
      })
      await checkinRepo.create({
        memberId: member2.id,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        synced: true,
      })

      const response = await request(app)
        .get(`/api/checkins?memberId=${testMemberId}`)
        .expect(200)

      expect(response.body.checkins).toHaveLength(1)
      expect(response.body.checkins[0].memberId).toBe(testMemberId)
    })

    it('should filter by date range', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      await checkinRepo.create({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        timestamp: new Date(),
        synced: true,
      })

      const response = await request(app)
        .get(`/api/checkins?startDate=${yesterday.toISOString()}&endDate=${tomorrow.toISOString()}`)
        .expect(200)

      expect(response.body.checkins.length).toBeGreaterThan(0)
    })
  })

  describe('GET /api/checkins/:id', () => {
    beforeEach(async () => {
      const checkin = await checkinRepo.create({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        synced: true,
      })
      testCheckinId = checkin.id
    })

    it('should return 200 with checkin data when checkin exists', async () => {
      const response = await request(app)
        .get(`/api/checkins/${testCheckinId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testCheckinId,
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        synced: true,
      })
      expect(response.body.member).toBeDefined()
      expect(response.body.member.firstName).toBe('John')
    })

    it('should return 404 when checkin does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .get(`/api/checkins/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('POST /api/checkins', () => {
    it('should return 201 and create checkin with valid data', async () => {
      const newCheckin = {
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
      }

      const response = await request(app)
        .post('/api/checkins')
        .send(newCheckin)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toMatchObject({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        synced: true,
      })
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body.member).toBeDefined()

      // Verify checkin was created
      const created = await checkinRepo.findById(response.body.id)
      expect(created).toBeDefined()
    })

    it('should accept custom timestamp', async () => {
      const customTimestamp = new Date('2024-01-15T10:00:00Z')

      const response = await request(app)
        .post('/api/checkins')
        .send({
          memberId: testMemberId,
          badgeId: testBadgeId,
          direction: 'IN',
          kioskId: 'KIOSK1',
          timestamp: customTimestamp.toISOString(),
        })
        .expect(201)

      const checkinTimestamp = new Date(response.body.timestamp)
      expect(checkinTimestamp.getTime()).toBe(customTimestamp.getTime())
    })

    it('should return 400 for missing required fields', async () => {
      const invalidCheckin = {
        direction: 'IN',
        // Missing memberId, badgeId, kioskId
      }

      const response = await request(app)
        .post('/api/checkins')
        .send(invalidCheckin)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 404 for non-existent member', async () => {
      const response = await request(app)
        .post('/api/checkins')
        .send({
          memberId: '00000000-0000-0000-0000-000000000000',
          badgeId: testBadgeId,
          direction: 'IN',
          kioskId: 'KIOSK1',
        })
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    describe('DDS check-in gating', () => {
      let adminUserRepo: AdminUserRepository
      let lockupRepo: LockupRepository
      let testAdminId: string
      let testMember2Id: string

      beforeAll(() => {
        adminUserRepo = new AdminUserRepository(testDb.prisma!)
        lockupRepo = new LockupRepository(testDb.prisma!)
      })

      async function seedDdsAndLockup(options: {
        ddsMemberId: string
        ddsStatus?: string
        buildingStatus: 'secured' | 'open' | 'locking_up'
      }) {
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

        const today = new Date()
        const assignedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

        await testDb.prisma!.ddsAssignment.create({
          data: {
            memberId: options.ddsMemberId,
            assignedDate,
            status: options.ddsStatus ?? 'pending',
            assignedBy: testAdminId,
          },
        })

        await lockupRepo.createStatus({
          date: assignedDate,
          buildingStatus: options.buildingStatus,
        })
      }

      it('should trigger DDS acceptance when DDS member checks in and building is secured', async () => {
        await seedDdsAndLockup({
          ddsMemberId: testMemberId,
          ddsStatus: 'pending',
          buildingStatus: 'secured',
        })

        const response = await request(app)
          .post('/api/checkins')
          .send({
            memberId: testMemberId,
            badgeId: testBadgeId,
            direction: 'in',
            kioskId: 'KIOSK1',
          })
          .expect(201)

        expect(response.body.memberId).toBe(testMemberId)

        // Verify DDS assignment was accepted
        const dds = await testDb.prisma!.ddsAssignment.findFirst({
          where: { memberId: testMemberId },
          orderBy: { createdAt: 'desc' },
        })
        expect(dds?.status).toBe('active')
        expect(dds?.acceptedAt).not.toBeNull()
      })

      it('should skip DDS acceptance when building is open', async () => {
        await seedDdsAndLockup({
          ddsMemberId: testMemberId,
          ddsStatus: 'pending',
          buildingStatus: 'open',
        })

        const response = await request(app)
          .post('/api/checkins')
          .send({
            memberId: testMemberId,
            badgeId: testBadgeId,
            direction: 'in',
            kioskId: 'KIOSK1',
          })
          .expect(201)

        expect(response.body.memberId).toBe(testMemberId)

        // Verify DDS assignment stays pending
        const dds = await testDb.prisma!.ddsAssignment.findFirst({
          where: { memberId: testMemberId },
          orderBy: { createdAt: 'desc' },
        })
        expect(dds?.status).toBe('pending')
        expect(dds?.acceptedAt).toBeNull()
      })

      it('should not trigger DDS for non-DDS member check-in', async () => {
        // Create second member
        const member2 = await memberRepo.create({
          serviceNumber: 'SN0002',
          rank: 'S1',
          firstName: 'Jane',
          lastName: 'Smith',
          divisionId: (await divisionRepo.findAll())[0]!.id,
          memberType: 'reserve',
        })
        testMember2Id = member2.id

        // DDS is assigned to member2, but testMember checks in
        await seedDdsAndLockup({
          ddsMemberId: testMember2Id,
          ddsStatus: 'pending',
          buildingStatus: 'secured',
        })

        const response = await request(app)
          .post('/api/checkins')
          .send({
            memberId: testMemberId,
            badgeId: testBadgeId,
            direction: 'in',
            kioskId: 'KIOSK1',
          })
          .expect(201)

        expect(response.body.memberId).toBe(testMemberId)

        // DDS assignment for member2 should remain pending
        const dds = await testDb.prisma!.ddsAssignment.findFirst({
          where: { memberId: testMember2Id },
          orderBy: { createdAt: 'desc' },
        })
        expect(dds?.status).toBe('pending')
      })

      it('should succeed even when DDS is already active (ConflictError absorbed)', async () => {
        await seedDdsAndLockup({
          ddsMemberId: testMemberId,
          ddsStatus: 'active',
          buildingStatus: 'secured',
        })

        const response = await request(app)
          .post('/api/checkins')
          .send({
            memberId: testMemberId,
            badgeId: testBadgeId,
            direction: 'in',
            kioskId: 'KIOSK1',
          })
          .expect(201)

        expect(response.body.memberId).toBe(testMemberId)
      })

      it('should skip DDS gating for check-out direction', async () => {
        await seedDdsAndLockup({
          ddsMemberId: testMemberId,
          ddsStatus: 'pending',
          buildingStatus: 'secured',
        })

        const response = await request(app)
          .post('/api/checkins')
          .send({
            memberId: testMemberId,
            badgeId: testBadgeId,
            direction: 'out',
            kioskId: 'KIOSK1',
          })
          .expect(201)

        // DDS should remain pending (check-out doesn't trigger DDS acceptance)
        const dds = await testDb.prisma!.ddsAssignment.findFirst({
          where: { memberId: testMemberId },
          orderBy: { createdAt: 'desc' },
        })
        expect(dds?.status).toBe('pending')
      })
    })
  })

  describe('POST /api/checkins/bulk', () => {
    it('should return 201 and create multiple checkins', async () => {
      const bulkCheckins = {
        checkins: [
          {
            memberId: testMemberId,
            badgeId: testBadgeId,
            direction: 'IN',
            kioskId: 'KIOSK1',
          },
          {
            memberId: testMemberId,
            badgeId: testBadgeId,
            direction: 'OUT',
            kioskId: 'KIOSK1',
          },
        ],
      }

      const response = await request(app)
        .post('/api/checkins/bulk')
        .send(bulkCheckins)
        .expect(201)

      expect(response.body.success).toBeGreaterThan(0)
      expect(response.body.failed).toBe(0)
      expect(response.body.errors).toHaveLength(0)
    })

    it('should handle partial failures in bulk create', async () => {
      const bulkCheckins = {
        checkins: [
          {
            memberId: testMemberId,
            badgeId: testBadgeId,
            direction: 'IN',
            kioskId: 'KIOSK1',
          },
          {
            memberId: '00000000-0000-0000-0000-000000000000', // Invalid
            badgeId: testBadgeId,
            direction: 'IN',
            kioskId: 'KIOSK1',
          },
        ],
      }

      const response = await request(app)
        .post('/api/checkins/bulk')
        .send(bulkCheckins)
        .expect(201)

      expect(response.body.success).toBe(1)
      expect(response.body.failed).toBe(1)
      expect(response.body.errors).toHaveLength(1)
      expect(response.body.errors[0]).toHaveProperty('index')
      expect(response.body.errors[0]).toHaveProperty('message')
    })
  })

  describe('PATCH /api/checkins/:id', () => {
    beforeEach(async () => {
      const checkin = await checkinRepo.create({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        synced: true,
      })
      testCheckinId = checkin.id
    })

    it('should return 200 and update checkin direction', async () => {
      const response = await request(app)
        .patch(`/api/checkins/${testCheckinId}`)
        .send({ direction: 'OUT' })
        .expect(200)

      expect(response.body.direction).toBe('OUT')

      // Verify update in database
      const updated = await checkinRepo.findById(testCheckinId)
      expect(updated?.direction).toBe('OUT')
    })

    it('should return 404 when checkin does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .patch(`/api/checkins/${nonExistentId}`)
        .send({ direction: 'OUT' })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('DELETE /api/checkins/:id', () => {
    beforeEach(async () => {
      const checkin = await checkinRepo.create({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        synced: true,
      })
      testCheckinId = checkin.id
    })

    it('should return 200 and delete checkin', async () => {
      const response = await request(app)
        .delete(`/api/checkins/${testCheckinId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
      })

      // Verify deletion
      const deleted = await checkinRepo.findById(testCheckinId)
      expect(deleted).toBeNull()
    })

    it('should return 404 when checkin does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .delete(`/api/checkins/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })
  })

  describe('GET /api/checkins/presence', () => {
    it('should return 200 with presence statistics', async () => {
      // Create some checkins
      await checkinRepo.create({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        synced: true,
      })

      const response = await request(app)
        .get('/api/checkins/presence')
        .expect(200)

      expect(response.body).toHaveProperty('totalPresent')
      expect(response.body).toHaveProperty('totalMembers')
      expect(response.body).toHaveProperty('byDivision')
      expect(response.body).toHaveProperty('lastUpdated')
      expect(Array.isArray(response.body.byDivision)).toBe(true)
    })
  })

  describe('GET /api/members/:id/checkins', () => {
    beforeEach(async () => {
      // Create checkins for test member
      await checkinRepo.create({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'IN',
        kioskId: 'KIOSK1',
        synced: true,
      })
      await checkinRepo.create({
        memberId: testMemberId,
        badgeId: testBadgeId,
        direction: 'OUT',
        kioskId: 'KIOSK1',
        synced: true,
      })
    })

    it('should return 200 with member checkins', async () => {
      const response = await request(app)
        .get(`/api/members/${testMemberId}/checkins`)
        .expect(200)

      expect(response.body.checkins).toHaveLength(2)
      expect(response.body.total).toBe(2)
      expect(response.body.checkins[0].memberId).toBe(testMemberId)
    })

    it('should support pagination for member checkins', async () => {
      const response = await request(app)
        .get(`/api/members/${testMemberId}/checkins?page=1&limit=1`)
        .expect(200)

      expect(response.body.checkins).toHaveLength(1)
      expect(response.body.total).toBe(2)
      expect(response.body.totalPages).toBe(2)
    })
  })
})
