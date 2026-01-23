import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { MemberRepository } from '../../../src/repositories/member-repository.js'
import { DivisionRepository } from '../../../src/repositories/division-repository.js'
import { VisitorRepository } from '../../../src/repositories/visitor-repository.js'
import { TagRepository } from '../../../src/repositories/tag-repository.js'
import { CheckinRepository } from '../../../src/repositories/checkin-repository.js'
import { BadgeRepository } from '../../../src/repositories/badge-repository.js'

describe('Lockup Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let memberRepo: MemberRepository
  let divisionRepo: DivisionRepository
  let visitorRepo: VisitorRepository
  let tagRepo: TagRepository
  let checkinRepo: CheckinRepository
  let badgeRepo: BadgeRepository
  let testDivisionId: string
  let testMember1Id: string
  let testMember2Id: string
  let testBadge1Id: string
  let testBadge2Id: string
  let lockupTagId: string

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
    visitorRepo = new VisitorRepository(testDb.prisma!)
    tagRepo = new TagRepository(testDb.prisma!)
    checkinRepo = new CheckinRepository(testDb.prisma!)
    badgeRepo = new BadgeRepository(testDb.prisma!)
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

    // Create Lockup tag
    const lockupTag = await tagRepo.create({
      name: 'Lockup',
      color: '#FF0000',
      description: 'Responsible for building lockup',
      displayOrder: 1,
    })
    lockupTagId = lockupTag.id

    // Create test badges
    const badge1 = await badgeRepo.create({
      serialNumber: 'BADGE001',
      status: 'active',
      assignmentType: 'member',
    })
    testBadge1Id = badge1.id

    const badge2 = await badgeRepo.create({
      serialNumber: 'BADGE002',
      status: 'active',
      assignmentType: 'member',
    })
    testBadge2Id = badge2.id

    // Create test members
    const member1 = await memberRepo.create({
      serviceNumber: 'SN0001',
      rank: 'AB',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: testDivisionId,
      badgeId: testBadge1Id,
      memberType: 'class_a',
    })
    testMember1Id = member1.id

    const member2 = await memberRepo.create({
      serviceNumber: 'SN0002',
      rank: 'LS',
      firstName: 'Jane',
      lastName: 'Smith',
      divisionId: testDivisionId,
      badgeId: testBadge2Id,
      memberType: 'class_a',
    })
    testMember2Id = member2.id
  })

  describe('GET /api/lockup/present', () => {
    it('should return 200 with empty lists when no one is present', async () => {
      const response = await request(app)
        .get('/api/lockup/present')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        members: [],
        visitors: [],
        totalCount: 0,
      })
    })

    it('should return 200 with present members and visitors', async () => {
      // Create check-in records for members (present)
      await checkinRepo.create({
        memberId: testMember1Id,
        badgeId: testBadge1Id,
        direction: 'in',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      await checkinRepo.create({
        memberId: testMember2Id,
        badgeId: testBadge2Id,
        direction: 'in',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      // Create active visitor (no checkout time)
      const visitor = await visitorRepo.create({
        name: 'Test Visitor',
        organization: 'Test Org',
        visitType: 'guest',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app)
        .get('/api/lockup/present')
        .expect(200)

      expect(response.body.members).toHaveLength(2)
      expect(response.body.visitors).toHaveLength(1)
      expect(response.body.totalCount).toBe(3)

      // Verify member data structure
      expect(response.body.members[0]).toHaveProperty('id')
      expect(response.body.members[0]).toHaveProperty('firstName')
      expect(response.body.members[0]).toHaveProperty('lastName')
      expect(response.body.members[0]).toHaveProperty('rank')
      expect(response.body.members[0]).toHaveProperty('checkedInAt')

      // Verify visitor data structure
      expect(response.body.visitors[0]).toHaveProperty('id')
      expect(response.body.visitors[0]).toHaveProperty('name')
      expect(response.body.visitors[0]).toHaveProperty('organization')
      expect(response.body.visitors[0]).toHaveProperty('visitType')
      expect(response.body.visitors[0]).toHaveProperty('checkInTime')
    })

    it('should not include checked-out members', async () => {
      // Member with check-in and check-out
      await checkinRepo.create({
        memberId: testMember1Id,
        badgeId: testBadge1Id,
        direction: 'in',
        timestamp: new Date(Date.now() - 3600000),
        kioskId: 'KIOSK001',
      })

      await checkinRepo.create({
        memberId: testMember1Id,
        badgeId: testBadge1Id,
        direction: 'out',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app)
        .get('/api/lockup/present')
        .expect(200)

      expect(response.body.members).toHaveLength(0)
      expect(response.body.totalCount).toBe(0)
    })

    it('should not include checked-out visitors', async () => {
      // Visitor with checkout time
      await visitorRepo.create({
        name: 'Departed Visitor',
        visitType: 'guest',
        checkInTime: new Date(Date.now() - 3600000),
        checkOutTime: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app)
        .get('/api/lockup/present')
        .expect(200)

      expect(response.body.visitors).toHaveLength(0)
      expect(response.body.totalCount).toBe(0)
    })
  })

  describe('GET /api/lockup/check-auth/:id', () => {
    it('should return 200 with authorized: true when member has Lockup tag', async () => {
      // Assign Lockup tag to member
      await testDb.prisma!.memberTag.create({
        data: {
          memberId: testMember1Id,
          tagId: lockupTagId,
        },
      })

      const response = await request(app)
        .get(`/api/lockup/check-auth/${testMember1Id}`)
        .expect(200)

      expect(response.body).toMatchObject({
        authorized: true,
        message: 'Member is authorized to perform lockup',
      })
    })

    it('should return 200 with authorized: false when member does not have Lockup tag', async () => {
      const response = await request(app)
        .get(`/api/lockup/check-auth/${testMember1Id}`)
        .expect(200)

      expect(response.body).toMatchObject({
        authorized: false,
        message: 'Member does not have the Lockup tag',
      })
    })

    it('should return 404 when member does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .get(`/api/lockup/check-auth/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/lockup/check-auth/invalid-id')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/lockup/execute/:id', () => {
    beforeEach(async () => {
      // Assign Lockup tag to member1 (authorized)
      await testDb.prisma!.memberTag.create({
        data: {
          memberId: testMember1Id,
          tagId: lockupTagId,
        },
      })

      // Create present members and visitors
      await checkinRepo.create({
        memberId: testMember1Id,
        badgeId: testBadge1Id,
        direction: 'in',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      await checkinRepo.create({
        memberId: testMember2Id,
        badgeId: testBadge2Id,
        direction: 'in',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      await visitorRepo.create({
        name: 'Test Visitor',
        visitType: 'guest',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })
    })

    it('should return 200 and check out all present people', async () => {
      const lockupData = {
        note: 'End of day lockup',
      }

      const response = await request(app)
        .post(`/api/lockup/execute/${testMember1Id}`)
        .send(lockupData)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('Lockup executed successfully'),
      })
      expect(response.body.stats).toMatchObject({
        membersCheckedOut: 2,
        visitorsCheckedOut: 1,
        totalCheckedOut: 3,
      })
      expect(response.body.checkedOut).toHaveProperty('members')
      expect(response.body.checkedOut).toHaveProperty('visitors')
      expect(response.body).toHaveProperty('auditLogId')

      // Verify members were checked out
      const checkins = await testDb.prisma!.checkin.findMany({
        where: {
          memberId: { in: [testMember1Id, testMember2Id] },
          direction: 'out',
        },
      })
      expect(checkins.length).toBeGreaterThanOrEqual(2)

      // Verify visitors were checked out
      const visitors = await testDb.prisma!.visitor.findMany({
        where: {
          checkOutTime: { not: null },
        },
      })
      expect(visitors.length).toBeGreaterThanOrEqual(1)
    })

    it('should execute lockup without note', async () => {
      const response = await request(app)
        .post(`/api/lockup/execute/${testMember1Id}`)
        .send({})
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.stats.totalCheckedOut).toBe(3)
    })

    it('should return 400 when member is not authorized', async () => {
      // member2 does not have Lockup tag
      const response = await request(app)
        .post(`/api/lockup/execute/${testMember2Id}`)
        .send({ note: 'Unauthorized attempt' })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'UNAUTHORIZED',
        message: expect.stringContaining('not authorized'),
      })
    })

    it('should return 404 when member does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .post(`/api/lockup/execute/${nonExistentId}`)
        .send({ note: 'Test' })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })

    it('should handle lockup when no one is present', async () => {
      // Check out all members and visitors first
      await checkinRepo.create({
        memberId: testMember1Id,
        badgeId: testBadge1Id,
        direction: 'out',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      await checkinRepo.create({
        memberId: testMember2Id,
        badgeId: testBadge2Id,
        direction: 'out',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      await testDb.prisma!.visitor.updateMany({
        where: { checkOutTime: null },
        data: { checkOutTime: new Date() },
      })

      const response = await request(app)
        .post(`/api/lockup/execute/${testMember1Id}`)
        .send({ note: 'Empty building' })
        .expect(200)

      expect(response.body.stats).toMatchObject({
        membersCheckedOut: 0,
        visitorsCheckedOut: 0,
        totalCheckedOut: 0,
      })
    })
  })
})
