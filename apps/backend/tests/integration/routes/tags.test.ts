import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { TagRepository } from '../../../src/repositories/tag-repository.js'
import { MemberRepository } from '../../../src/repositories/member-repository.js'
import { DivisionRepository } from '../../../src/repositories/division-repository.js'

describe('Tags Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let tagRepo: TagRepository
  let memberRepo: MemberRepository
  let divisionRepo: DivisionRepository
  let testDivisionId: string
  let testLockupTagId: string
  let testMember1Id: string
  let testMember2Id: string

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

    tagRepo = new TagRepository(testDb.prisma!)
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

    // Create Lockup tag
    const lockupTag = await tagRepo.create({
      name: 'Lockup',
      color: '#FF0000',
      description: 'Responsible for building lockup',
      displayOrder: 1,
    })
    testLockupTagId = lockupTag.id

    // Create test members
    const member1 = await memberRepo.create({
      serviceNumber: 'SN0001',
      rank: 'AB',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: testDivisionId,
      memberType: 'class_a',
    })
    testMember1Id = member1.id

    const member2 = await memberRepo.create({
      serviceNumber: 'SN0002',
      rank: 'LS',
      firstName: 'Jane',
      lastName: 'Smith',
      divisionId: testDivisionId,
      memberType: 'class_a',
    })
    testMember2Id = member2.id
  })

  describe('GET /api/tags/lockup/holder', () => {
    it('should return 200 with null when no one has lockup tag', async () => {
      const response = await request(app)
        .get('/api/tags/lockup/holder')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('holder', null)
    })

    it('should return 200 with holder when someone has lockup tag', async () => {
      // Assign lockup tag to member1
      await testDb.prisma!.memberTag.create({
        data: {
          memberId: testMember1Id,
          tagId: testLockupTagId,
        },
      })

      const response = await request(app)
        .get('/api/tags/lockup/holder')
        .expect(200)

      expect(response.body.holder).toMatchObject({
        id: testMember1Id,
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
      })
    })
  })

  describe('POST /api/tags/lockup/transfer', () => {
    beforeEach(async () => {
      // Assign lockup tag to member1 initially
      await testDb.prisma!.memberTag.create({
        data: {
          memberId: testMember1Id,
          tagId: testLockupTagId,
        },
      })
    })

    it('should return 200 and transfer lockup tag to new member', async () => {
      const transferData = {
        toMemberId: testMember2Id,
        performedBy: testMember1Id, // UUID of admin performing transfer
        performedByType: 'admin' as const,
        notes: 'Transfer for testing',
      }

      const response = await request(app)
        .post('/api/tags/lockup/transfer')
        .send(transferData)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        previousHolder: {
          id: testMember1Id,
          rank: 'AB',
          firstName: 'John',
          lastName: 'Doe',
        },
        newHolder: {
          id: testMember2Id,
          rank: 'LS',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      })

      // Verify tag was transferred in database
      const memberTags = await testDb.prisma!.memberTag.findMany({
        where: { tagId: testLockupTagId },
      })

      expect(memberTags).toHaveLength(1)
      expect(memberTags[0]!.memberId).toBe(testMember2Id)

      // Verify audit log was created
      const auditLog = await testDb.prisma!.responsibilityAuditLog.findFirst({
        where: {
          tagName: 'Lockup',
          action: 'transferred',
          fromMemberId: testMember1Id,
          toMemberId: testMember2Id,
        },
      })

      expect(auditLog).toBeDefined()
      expect(auditLog?.performedBy).toBe(testMember1Id)
      expect(auditLog?.performedByType).toBe('admin')
      expect(auditLog?.notes).toBe('Transfer for testing')
    })

    it('should return 200 and be idempotent when target already has tag', async () => {
      const transferData = {
        toMemberId: testMember1Id, // Same member who already has it
        performedBy: testMember2Id, // UUID of admin performing transfer
        performedByType: 'admin' as const,
      }

      const response = await request(app)
        .post('/api/tags/lockup/transfer')
        .send(transferData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        previousHolder: {
          id: testMember1Id,
        },
        newHolder: {
          id: testMember1Id,
        },
      })

      // Verify only one tag assignment exists
      const memberTags = await testDb.prisma!.memberTag.findMany({
        where: { tagId: testLockupTagId },
      })

      expect(memberTags).toHaveLength(1)
      expect(memberTags[0]!.memberId).toBe(testMember1Id)
    })

    it('should return 404 when target member does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const transferData = {
        toMemberId: nonExistentId,
        performedBy: testMember1Id, // UUID of admin performing transfer
        performedByType: 'admin' as const,
      }

      const response = await request(app)
        .post('/api/tags/lockup/transfer')
        .send(transferData)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })

      // Verify tag was NOT transferred
      const memberTags = await testDb.prisma!.memberTag.findMany({
        where: { tagId: testLockupTagId },
      })

      expect(memberTags).toHaveLength(1)
      expect(memberTags[0]!.memberId).toBe(testMember1Id) // Still with original holder
    })

    it('should transfer tag without notes', async () => {
      const transferData = {
        toMemberId: testMember2Id,
        performedBy: testMember1Id, // UUID of system performing transfer
        performedByType: 'system' as const,
        // notes omitted
      }

      const response = await request(app)
        .post('/api/tags/lockup/transfer')
        .send(transferData)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verify audit log has null notes
      const auditLog = await testDb.prisma!.responsibilityAuditLog.findFirst({
        where: {
          tagName: 'Lockup',
          toMemberId: testMember2Id,
        },
      })

      expect(auditLog?.notes).toBeNull()
    })

    it('should handle transfer when no current holder exists', async () => {
      // Remove all tag assignments
      await testDb.prisma!.memberTag.deleteMany({
        where: { tagId: testLockupTagId },
      })

      const transferData = {
        toMemberId: testMember2Id,
        performedBy: testMember1Id, // UUID of admin performing transfer
        performedByType: 'admin' as const,
      }

      const response = await request(app)
        .post('/api/tags/lockup/transfer')
        .send(transferData)
        .expect(200)

      // Service returns null when no current holder
      expect(response.body).toMatchObject({
        success: false,
        previousHolder: null,
        newHolder: {
          id: '',
          rank: '',
          firstName: '',
          lastName: '',
        },
      })

      // Verify no tag was assigned
      const memberTags = await testDb.prisma!.memberTag.findMany({
        where: { tagId: testLockupTagId },
      })

      expect(memberTags).toHaveLength(0)
    })
  })
})
