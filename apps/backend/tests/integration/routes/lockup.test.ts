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
import { QualificationRepository } from '../../../src/repositories/qualification-repository.js'
import { LockupRepository } from '../../../src/repositories/lockup-repository.js'

describe('Lockup Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let memberRepo: MemberRepository
  let divisionRepo: DivisionRepository
  let visitorRepo: VisitorRepository
  let tagRepo: TagRepository
  let checkinRepo: CheckinRepository
  let badgeRepo: BadgeRepository
  let qualificationRepo: QualificationRepository
  let lockupRepo: LockupRepository
  let testDivisionId: string
  let testMember1Id: string
  let testMember2Id: string
  let testMember3Id: string
  let testBadge1Id: string
  let testBadge2Id: string
  let testBadge3Id: string
  let lockupTagId: string
  let ddsQualTypeId: string
  let swkQualTypeId: string

  beforeAll(async () => {
    await testDb.start()

    // Clear module cache to force fresh imports with new DATABASE_URL
    const modulesToClear = Object.keys(require.cache).filter(
      (key) =>
        key.includes('@sentinel/database') || key.includes('src/app') || key.includes('src/routes')
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
    qualificationRepo = new QualificationRepository(testDb.prisma!)
    lockupRepo = new LockupRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()

    // Create required ranks
    await testDb.prisma!.rank.createMany({
      data: [
        {
          code: 'AB',
          name: 'Able Seaman',
          branch: 'navy',
          category: 'junior_ncm',
          displayOrder: 1,
        },
        {
          code: 'LS',
          name: 'Leading Seaman',
          branch: 'navy',
          category: 'junior_ncm',
          displayOrder: 2,
        },
        {
          code: 'MS',
          name: 'Master Seaman',
          branch: 'navy',
          category: 'senior_ncm',
          displayOrder: 3,
        },
      ],
      skipDuplicates: true,
    })

    // Create required member types
    await testDb.prisma!.memberType.createMany({
      data: [
        { code: 'class_a', name: 'Class A Reserve' },
        { code: 'class_b', name: 'Class B Reserve' },
      ],
      skipDuplicates: true,
    })

    // Create test division
    const division = await divisionRepo.create({
      name: 'Test Division',
      code: 'TESTDIV',
      description: 'Division for testing',
    })
    testDivisionId = division.id

    // Create Lockup tag (for backwards compatibility tests)
    const lockupTag = await tagRepo.create({
      name: 'Lockup',
      color: '#FF0000',
      description: 'Responsible for building lockup',
      displayOrder: 1,
    })
    lockupTagId = lockupTag.id

    // Create qualification types
    const ddsQualType = await testDb.prisma!.qualificationType.create({
      data: {
        code: 'DDS',
        name: 'Duty Day Staff',
        description: 'Duty Day Staff qualification',
        canReceiveLockup: true,
        displayOrder: 1,
      },
    })
    ddsQualTypeId = ddsQualType.id

    const swkQualType = await testDb.prisma!.qualificationType.create({
      data: {
        code: 'SWK',
        name: 'Senior Watch Keeper',
        description: 'Senior Watch Keeper qualification',
        canReceiveLockup: true,
        displayOrder: 2,
      },
    })
    swkQualTypeId = swkQualType.id

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

    const badge3 = await badgeRepo.create({
      serialNumber: 'BADGE003',
      status: 'active',
      assignmentType: 'member',
    })
    testBadge3Id = badge3.id

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

    const member3 = await memberRepo.create({
      serviceNumber: 'SN0003',
      rank: 'MS',
      firstName: 'Bob',
      lastName: 'Wilson',
      divisionId: testDivisionId,
      badgeId: testBadge3Id,
      memberType: 'class_a',
    })
    testMember3Id = member3.id
  })

  // ============================================================================
  // Status Endpoints
  // ============================================================================

  describe('GET /api/lockup/status', () => {
    it('should return 200 with current status (auto-creates for today)', async () => {
      const response = await request(app).get('/api/lockup/status').expect(200)

      expect(response.body).toMatchObject({
        date: expect.any(String),
        buildingStatus: 'open',
        currentHolder: null,
        acquiredAt: null,
        securedAt: null,
        securedBy: null,
        isActive: true,
      })
    })

    it('should return current holder when lockup is assigned', async () => {
      // Grant qualification to member1
      await qualificationRepo.grant({
        memberId: testMember1Id,
        qualificationTypeId: ddsQualTypeId,
        grantedBy: testMember1Id,
      })

      // Check in member1
      await checkinRepo.create({
        memberId: testMember1Id,
        badgeId: testBadge1Id,
        direction: 'in',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      // Acquire lockup
      await request(app).post(`/api/lockup/acquire/${testMember1Id}`).send({}).expect(200)

      const response = await request(app).get('/api/lockup/status').expect(200)

      expect(response.body.currentHolder).toMatchObject({
        id: testMember1Id,
        firstName: 'John',
        lastName: 'Doe',
      })
      expect(response.body.acquiredAt).not.toBeNull()
    })
  })

  describe('GET /api/lockup/status/:date', () => {
    it('should return 404 for non-existent date', async () => {
      const response = await request(app).get('/api/lockup/status/2020-01-01').expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
      })
    })

    it('should return status for existing date', async () => {
      // Get current status to create today's entry
      await request(app).get('/api/lockup/status').expect(200)

      // Now query today's date
      const today = new Date().toISOString().split('T')[0]
      const response = await request(app).get(`/api/lockup/status/${today}`).expect(200)

      expect(response.body.date).toBe(today)
    })
  })

  // ============================================================================
  // Transfer Endpoints
  // ============================================================================

  describe('POST /api/lockup/transfer', () => {
    beforeEach(async () => {
      // Grant qualifications
      await qualificationRepo.grant({
        memberId: testMember1Id,
        qualificationTypeId: ddsQualTypeId,
        grantedBy: testMember1Id,
      })
      await qualificationRepo.grant({
        memberId: testMember2Id,
        qualificationTypeId: swkQualTypeId,
        grantedBy: testMember1Id,
      })

      // Check in both members
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

      // Member1 acquires lockup first
      await request(app).post(`/api/lockup/acquire/${testMember1Id}`).send({}).expect(200)
    })

    it('should transfer lockup to qualified checked-in member', async () => {
      const response = await request(app)
        .post('/api/lockup/transfer')
        .send({
          toMemberId: testMember2Id,
          reason: 'manual',
          notes: 'Test transfer',
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('Jane Smith'),
        transfer: {
          fromMemberId: testMember1Id,
          toMemberId: testMember2Id,
          reason: 'manual',
          notes: 'Test transfer',
        },
        newHolder: {
          id: testMember2Id,
          firstName: 'Jane',
          lastName: 'Smith',
        },
      })
    })

    it('should return 400 when no active lockup holder', async () => {
      // Reset by creating fresh status
      await testDb.prisma!.lockupStatus.deleteMany({})

      const response = await request(app)
        .post('/api/lockup/transfer')
        .send({
          toMemberId: testMember2Id,
          reason: 'manual',
        })
        .expect(400)

      expect(response.body.error).toBe('NO_ACTIVE_LOCKUP')
    })

    it('should return 403 when recipient is not qualified', async () => {
      // member3 has no qualifications
      await checkinRepo.create({
        memberId: testMember3Id,
        badgeId: testBadge3Id,
        direction: 'in',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app)
        .post('/api/lockup/transfer')
        .send({
          toMemberId: testMember3Id,
          reason: 'manual',
        })
        .expect(403)

      expect(response.body.error).toBe('NOT_QUALIFIED')
    })

    it('should return 400 when recipient is not checked in', async () => {
      // Check out member2
      await checkinRepo.create({
        memberId: testMember2Id,
        badgeId: testBadge2Id,
        direction: 'out',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app)
        .post('/api/lockup/transfer')
        .send({
          toMemberId: testMember2Id,
          reason: 'manual',
        })
        .expect(400)

      expect(response.body.error).toBe('NOT_CHECKED_IN')
    })
  })

  describe('POST /api/lockup/acquire/:id', () => {
    it('should allow qualified member to acquire lockup', async () => {
      // Grant qualification
      await qualificationRepo.grant({
        memberId: testMember1Id,
        qualificationTypeId: ddsQualTypeId,
        grantedBy: testMember1Id,
      })

      // Check in member
      await checkinRepo.create({
        memberId: testMember1Id,
        badgeId: testBadge1Id,
        direction: 'in',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app)
        .post(`/api/lockup/acquire/${testMember1Id}`)
        .send({ notes: 'Taking over lockup' })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Lockup responsibility acquired successfully',
      })
    })

    it('should return 403 when member is not qualified', async () => {
      await checkinRepo.create({
        memberId: testMember1Id,
        badgeId: testBadge1Id,
        direction: 'in',
        timestamp: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app)
        .post(`/api/lockup/acquire/${testMember1Id}`)
        .send({})
        .expect(403)

      expect(response.body.error).toBe('NOT_QUALIFIED')
    })

    it('should return 409 when lockup is already held', async () => {
      // Grant qualifications to both
      await qualificationRepo.grant({
        memberId: testMember1Id,
        qualificationTypeId: ddsQualTypeId,
        grantedBy: testMember1Id,
      })
      await qualificationRepo.grant({
        memberId: testMember2Id,
        qualificationTypeId: swkQualTypeId,
        grantedBy: testMember1Id,
      })

      // Check in both
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

      // member1 acquires first
      await request(app).post(`/api/lockup/acquire/${testMember1Id}`).send({}).expect(200)

      // member2 tries to acquire
      const response = await request(app)
        .post(`/api/lockup/acquire/${testMember2Id}`)
        .send({})
        .expect(409)

      expect(response.body.error).toBe('ALREADY_HELD')
    })

    it('should return 404 for non-existent member', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await request(app).post(`/api/lockup/acquire/${fakeId}`).send({}).expect(404)

      expect(response.body.error).toBe('NOT_FOUND')
    })
  })

  // ============================================================================
  // Checkout Options Endpoint
  // ============================================================================

  describe('GET /api/lockup/checkout-options/:id', () => {
    it('should return normal checkout when member does not hold lockup', async () => {
      const response = await request(app)
        .get(`/api/lockup/checkout-options/${testMember1Id}`)
        .expect(200)

      expect(response.body).toMatchObject({
        memberId: testMember1Id,
        holdsLockup: false,
        canCheckout: true,
        blockReason: null,
        availableOptions: ['normal_checkout'],
      })
    })

    it('should return lockup options when member holds lockup', async () => {
      // Grant qualifications
      await qualificationRepo.grant({
        memberId: testMember1Id,
        qualificationTypeId: ddsQualTypeId,
        grantedBy: testMember1Id,
      })
      await qualificationRepo.grant({
        memberId: testMember2Id,
        qualificationTypeId: swkQualTypeId,
        grantedBy: testMember1Id,
      })

      // Check in both
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

      // Acquire lockup
      await request(app).post(`/api/lockup/acquire/${testMember1Id}`).send({}).expect(200)

      const response = await request(app)
        .get(`/api/lockup/checkout-options/${testMember1Id}`)
        .expect(200)

      expect(response.body).toMatchObject({
        memberId: testMember1Id,
        holdsLockup: true,
        canCheckout: false,
        blockReason: expect.stringContaining('transfer or execute'),
        availableOptions: expect.arrayContaining(['execute_lockup', 'transfer_lockup']),
      })
      expect(response.body.eligibleRecipients).toBeInstanceOf(Array)
      expect(response.body.eligibleRecipients.length).toBeGreaterThan(0)
    })

    it('should return 404 for non-existent member', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await request(app)
        .get(`/api/lockup/checkout-options/${fakeId}`)
        .expect(404)

      expect(response.body.error).toBe('NOT_FOUND')
    })
  })

  // ============================================================================
  // History Endpoint
  // ============================================================================

  describe('GET /api/lockup/history', () => {
    it('should return empty history when no transfers or executions', async () => {
      const response = await request(app).get('/api/lockup/history').expect(200)

      expect(response.body).toMatchObject({
        items: [],
        total: 0,
        hasMore: false,
      })
    })

    it('should return transfer history', async () => {
      // Setup: Grant qualifications and check in
      await qualificationRepo.grant({
        memberId: testMember1Id,
        qualificationTypeId: ddsQualTypeId,
        grantedBy: testMember1Id,
      })
      await qualificationRepo.grant({
        memberId: testMember2Id,
        qualificationTypeId: swkQualTypeId,
        grantedBy: testMember1Id,
      })

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

      // Acquire and transfer
      await request(app).post(`/api/lockup/acquire/${testMember1Id}`).send({}).expect(200)
      await request(app)
        .post('/api/lockup/transfer')
        .send({ toMemberId: testMember2Id, reason: 'manual' })
        .expect(200)

      const response = await request(app).get('/api/lockup/history').expect(200)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0]).toMatchObject({
        type: 'transfer',
        fromMember: { id: testMember1Id },
        toMember: { id: testMember2Id },
        reason: 'manual',
      })
    })
  })

  // ============================================================================
  // Legacy Endpoints (Backwards Compatibility)
  // ============================================================================

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
      await visitorRepo.create({
        name: 'Test Visitor',
        organization: 'Test Org',
        visitType: 'guest',
        checkInTime: new Date(),
        kioskId: 'KIOSK001',
      })

      const response = await request(app).get('/api/lockup/present').expect(200)

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

      const response = await request(app).get('/api/lockup/present').expect(200)

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

      const response = await request(app).get('/api/lockup/present').expect(200)

      expect(response.body.visitors).toHaveLength(0)
      expect(response.body.totalCount).toBe(0)
    })
  })

  describe('GET /api/lockup/check-auth/:id', () => {
    it('should return authorized:true when member has qualification', async () => {
      // Grant qualification to member
      await qualificationRepo.grant({
        memberId: testMember1Id,
        qualificationTypeId: ddsQualTypeId,
        grantedBy: testMember1Id,
      })

      const response = await request(app)
        .get(`/api/lockup/check-auth/${testMember1Id}`)
        .expect(200)

      expect(response.body).toMatchObject({
        authorized: true,
        message: 'Member is authorized to perform lockup',
      })
    })

    it('should return authorized:true when member has Lockup tag (backwards compatibility)', async () => {
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

    it('should return authorized:false when member has no qualification or tag', async () => {
      const response = await request(app)
        .get(`/api/lockup/check-auth/${testMember1Id}`)
        .expect(200)

      expect(response.body).toMatchObject({
        authorized: false,
        message: expect.stringContaining('not qualified'),
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
      const response = await request(app).get('/api/lockup/check-auth/invalid-id').expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/lockup/execute/:id', () => {
    beforeEach(async () => {
      // Grant qualification to member1 (authorized)
      await qualificationRepo.grant({
        memberId: testMember1Id,
        qualificationTypeId: ddsQualTypeId,
        grantedBy: testMember1Id,
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

      // Member1 acquires lockup
      await request(app).post(`/api/lockup/acquire/${testMember1Id}`).send({}).expect(200)
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
      // member3 does not have qualification
      const response = await request(app)
        .post(`/api/lockup/execute/${testMember3Id}`)
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
