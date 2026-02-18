import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { MemberRepository } from '../../../src/repositories/member-repository.js'
import { DivisionRepository } from '../../../src/repositories/division-repository.js'

describe('Qualifications Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let memberRepo: MemberRepository
  let divisionRepo: DivisionRepository
  let testDivisionId: string
  let testMember1Id: string
  let testMember2Id: string
  let testQualTypeId: string
  let testQualTypeSWKId: string
  let testQualTypeBuildingAuthId: string

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

    // Create ranks (required for member creation)
    await testDb.prisma!.rank.createMany({
      data: [
        { code: 'S2', name: 'Able Seaman', branch: 'navy', category: 'junior_ncm', displayOrder: 2 },
        { code: 'S1', name: 'Leading Seaman', branch: 'navy', category: 'junior_ncm', displayOrder: 3 },
        { code: 'PO2', name: 'Petty Officer 2nd Class', branch: 'navy', category: 'senior_ncm', displayOrder: 5 },
      ],
      skipDuplicates: true,
    })

    // Create member types (required for member creation)
    await testDb.prisma!.memberType.createMany({
      data: [
        { code: 'reserve', name: 'Reserve', description: 'Reserve member' },
      ],
      skipDuplicates: true,
    })

    // Create member statuses
    await testDb.prisma!.memberStatus.createMany({
      data: [
        { code: 'active', name: 'Active', description: 'Member is active' },
      ],
      skipDuplicates: true,
    })

    // Create test qualification types
    const ddsType = await testDb.prisma!.qualificationType.create({
      data: {
        code: 'DDS',
        name: 'DDS Qualified',
        description: 'Qualified to serve as Duty Day Staff',
        canReceiveLockup: true,
        displayOrder: 1,
      },
    })
    testQualTypeId = ddsType.id

    const swkType = await testDb.prisma!.qualificationType.create({
      data: {
        code: 'SWK',
        name: 'SWK Qualified',
        description: 'Qualified to serve as Shipwright',
        canReceiveLockup: true,
        displayOrder: 2,
      },
    })
    testQualTypeSWKId = swkType.id

    const buildingAuthType = await testDb.prisma!.qualificationType.create({
      data: {
        code: 'BUILDING_AUTH',
        name: 'Building Authorized',
        description: 'Authorized to lock up the building',
        canReceiveLockup: true,
        displayOrder: 3,
      },
    })
    testQualTypeBuildingAuthId = buildingAuthType.id

    // Create non-lockup qualification type
    await testDb.prisma!.qualificationType.create({
      data: {
        code: 'FM',
        name: 'Facilities Manager',
        description: 'Facilities management access',
        canReceiveLockup: false,
        displayOrder: 4,
      },
    })

    // Create test division
    const division = await divisionRepo.create({
      name: 'Test Division',
      code: 'TESTDIV',
      description: 'Division for testing',
    })
    testDivisionId = division.id

    // Create test members
    const member1 = await memberRepo.create({
      serviceNumber: 'SN0001',
      rank: 'S2',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: testDivisionId,
      memberType: 'reserve',
    })
    testMember1Id = member1.id

    const member2 = await memberRepo.create({
      serviceNumber: 'SN0002',
      rank: 'S1',
      firstName: 'Jane',
      lastName: 'Smith',
      divisionId: testDivisionId,
      memberType: 'reserve',
    })
    testMember2Id = member2.id
  })

  describe('GET /api/qualifications/types', () => {
    it('should return 200 with all qualification types', async () => {
      const response = await request(app)
        .get('/api/qualifications/types')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body.data).toHaveLength(4)
      expect(response.body.data[0]).toMatchObject({
        code: 'DDS',
        name: 'DDS Qualified',
        canReceiveLockup: true,
      })
    })

    it('should return qualification types ordered by displayOrder', async () => {
      const response = await request(app).get('/api/qualifications/types').expect(200)

      const codes = response.body.data.map((t: { code: string }) => t.code)
      expect(codes).toEqual(['DDS', 'SWK', 'BUILDING_AUTH', 'FM'])
    })
  })

  describe('GET /api/members/:memberId/qualifications', () => {
    it('should return 200 with empty array when member has no qualifications', async () => {
      const response = await request(app)
        .get(`/api/members/${testMember1Id}/qualifications`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body.data).toEqual([])
    })

    it('should return 200 with member qualifications', async () => {
      // Grant qualification to member
      await testDb.prisma!.memberQualification.create({
        data: {
          memberId: testMember1Id,
          qualificationTypeId: testQualTypeId,
          status: 'active',
          grantedAt: new Date(),
        },
      })

      const response = await request(app)
        .get(`/api/members/${testMember1Id}/qualifications`)
        .expect(200)

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0]).toMatchObject({
        memberId: testMember1Id,
        qualificationTypeId: testQualTypeId,
        status: 'active',
      })
      expect(response.body.data[0].qualificationType).toMatchObject({
        code: 'DDS',
        name: 'DDS Qualified',
      })
    })

    it('should return 404 when member does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .get(`/api/members/${nonExistentId}/qualifications`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })
  })

  describe('POST /api/members/:memberId/qualifications', () => {
    it('should return 201 and grant qualification to member', async () => {
      const grantData = {
        qualificationTypeId: testQualTypeId,
        notes: 'Completed DDS training',
      }

      const response = await request(app)
        .post(`/api/members/${testMember1Id}/qualifications`)
        .send(grantData)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toMatchObject({
        memberId: testMember1Id,
        qualificationTypeId: testQualTypeId,
        status: 'active',
        notes: 'Completed DDS training',
      })
      expect(response.body.qualificationType).toMatchObject({
        code: 'DDS',
        name: 'DDS Qualified',
      })
    })

    it('should return 201 with expiration date when provided', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const grantData = {
        qualificationTypeId: testQualTypeId,
        expiresAt: futureDate.toISOString(),
      }

      const response = await request(app)
        .post(`/api/members/${testMember1Id}/qualifications`)
        .send(grantData)
        .expect(201)

      expect(response.body.expiresAt).toBeTruthy()
    })

    it('should return 404 when member does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const grantData = {
        qualificationTypeId: testQualTypeId,
      }

      const response = await request(app)
        .post(`/api/members/${nonExistentId}/qualifications`)
        .send(grantData)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining('Member not found'),
      })
    })

    it('should return 404 when qualification type does not exist', async () => {
      const nonExistentTypeId = '00000000-0000-0000-0000-000000000000'

      const grantData = {
        qualificationTypeId: nonExistentTypeId,
      }

      const response = await request(app)
        .post(`/api/members/${testMember1Id}/qualifications`)
        .send(grantData)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining('Qualification type not found'),
      })
    })

    it('should return 409 when member already has the qualification', async () => {
      // Grant qualification first
      await testDb.prisma!.memberQualification.create({
        data: {
          memberId: testMember1Id,
          qualificationTypeId: testQualTypeId,
          status: 'active',
          grantedAt: new Date(),
        },
      })

      const grantData = {
        qualificationTypeId: testQualTypeId,
      }

      const response = await request(app)
        .post(`/api/members/${testMember1Id}/qualifications`)
        .send(grantData)
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'CONFLICT',
        message: expect.stringContaining('already has'),
      })
    })
  })

  describe('DELETE /api/members/:memberId/qualifications/:qualificationId', () => {
    let testQualificationId: string

    beforeEach(async () => {
      // Grant qualification to member
      const qual = await testDb.prisma!.memberQualification.create({
        data: {
          memberId: testMember1Id,
          qualificationTypeId: testQualTypeId,
          status: 'active',
          grantedAt: new Date(),
        },
      })
      testQualificationId = qual.id
    })

    it('should return 200 and revoke qualification', async () => {
      const revokeData = {
        revokeReason: 'No longer meets requirements',
      }

      const response = await request(app)
        .delete(`/api/members/${testMember1Id}/qualifications/${testQualificationId}`)
        .send(revokeData)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Qualification revoked successfully',
      })

      // Verify qualification was revoked in database
      const updated = await testDb.prisma!.memberQualification.findUnique({
        where: { id: testQualificationId },
      })

      expect(updated?.status).toBe('revoked')
      expect(updated?.revokeReason).toBe('No longer meets requirements')
    })

    it('should return 200 when revoking without reason', async () => {
      const response = await request(app)
        .delete(`/api/members/${testMember1Id}/qualifications/${testQualificationId}`)
        .send({})
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('should return 404 when qualification does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .delete(`/api/members/${testMember1Id}/qualifications/${nonExistentId}`)
        .send({})
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining('Qualification not found'),
      })
    })

    it('should return 400 when qualification is already revoked', async () => {
      // Revoke the qualification first
      await testDb.prisma!.memberQualification.update({
        where: { id: testQualificationId },
        data: {
          status: 'revoked',
          revokedAt: new Date(),
        },
      })

      const response = await request(app)
        .delete(`/api/members/${testMember1Id}/qualifications/${testQualificationId}`)
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'BAD_REQUEST',
        message: expect.stringContaining('already revoked'),
      })
    })
  })

  describe('GET /api/qualifications/lockup-eligible', () => {
    beforeEach(async () => {
      // Grant lockup-eligible qualification to member1
      await testDb.prisma!.memberQualification.create({
        data: {
          memberId: testMember1Id,
          qualificationTypeId: testQualTypeId,
          status: 'active',
          grantedAt: new Date(),
        },
      })

      // Grant SWK qualification to member2
      await testDb.prisma!.memberQualification.create({
        data: {
          memberId: testMember2Id,
          qualificationTypeId: testQualTypeSWKId,
          status: 'active',
          grantedAt: new Date(),
        },
      })
    })

    it('should return 200 with all lockup-eligible members', async () => {
      const response = await request(app)
        .get('/api/qualifications/lockup-eligible')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body.data).toHaveLength(2)

      const member1 = response.body.data.find((m: { id: string }) => m.id === testMember1Id)
      expect(member1).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        rank: 'S2',
      })
      expect(member1.qualifications).toHaveLength(1)
      expect(member1.qualifications[0].code).toBe('DDS')
    })

    it('should return only checked-in members when checkedInOnly=true', async () => {
      // Check in member1
      await testDb.prisma!.checkin.create({
        data: {
          memberId: testMember1Id,
          direction: 'in',
          timestamp: new Date(),
          kioskId: 'test-kiosk-1',
        },
      })

      const response = await request(app)
        .get('/api/qualifications/lockup-eligible?checkedInOnly=true')
        .expect(200)

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].id).toBe(testMember1Id)
      expect(response.body.data[0].isCheckedIn).toBe(true)
    })

    it('should not include members with only non-lockup qualifications', async () => {
      // Create a member with only FM qualification (non-lockup)
      const member3 = await memberRepo.create({
        serviceNumber: 'SN0003',
        rank: 'PO2',
        firstName: 'Bob',
        lastName: 'Wilson',
        divisionId: testDivisionId,
        memberType: 'reserve',
      })

      const fmType = await testDb.prisma!.qualificationType.findFirst({
        where: { code: 'FM' },
      })

      await testDb.prisma!.memberQualification.create({
        data: {
          memberId: member3.id,
          qualificationTypeId: fmType!.id,
          status: 'active',
          grantedAt: new Date(),
        },
      })

      const response = await request(app).get('/api/qualifications/lockup-eligible').expect(200)

      // Should still only have member1 and member2
      expect(response.body.data).toHaveLength(2)
      const ids = response.body.data.map((m: { id: string }) => m.id)
      expect(ids).not.toContain(member3.id)
    })

    it('should not include members with expired qualifications', async () => {
      // Create member3 with expired qualification
      const member3 = await memberRepo.create({
        serviceNumber: 'SN0003',
        rank: 'PO2',
        firstName: 'Bob',
        lastName: 'Wilson',
        divisionId: testDivisionId,
        memberType: 'reserve',
      })

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1) // Yesterday

      await testDb.prisma!.memberQualification.create({
        data: {
          memberId: member3.id,
          qualificationTypeId: testQualTypeBuildingAuthId,
          status: 'active',
          grantedAt: new Date(),
          expiresAt: pastDate, // Expired
        },
      })

      const response = await request(app).get('/api/qualifications/lockup-eligible').expect(200)

      // Should still only have member1 and member2
      expect(response.body.data).toHaveLength(2)
      const ids = response.body.data.map((m: { id: string }) => m.id)
      expect(ids).not.toContain(member3.id)
    })

    it('should not include members with revoked qualifications', async () => {
      // Create member3 with revoked qualification
      const member3 = await memberRepo.create({
        serviceNumber: 'SN0003',
        rank: 'PO2',
        firstName: 'Bob',
        lastName: 'Wilson',
        divisionId: testDivisionId,
        memberType: 'reserve',
      })

      await testDb.prisma!.memberQualification.create({
        data: {
          memberId: member3.id,
          qualificationTypeId: testQualTypeBuildingAuthId,
          status: 'revoked',
          grantedAt: new Date(),
          revokedAt: new Date(),
        },
      })

      const response = await request(app).get('/api/qualifications/lockup-eligible').expect(200)

      // Should still only have member1 and member2
      expect(response.body.data).toHaveLength(2)
      const ids = response.body.data.map((m: { id: string }) => m.id)
      expect(ids).not.toContain(member3.id)
    })

    it('should include multiple qualifications for a single member', async () => {
      // Grant additional qualification to member1
      await testDb.prisma!.memberQualification.create({
        data: {
          memberId: testMember1Id,
          qualificationTypeId: testQualTypeBuildingAuthId,
          status: 'active',
          grantedAt: new Date(),
        },
      })

      const response = await request(app).get('/api/qualifications/lockup-eligible').expect(200)

      const member1 = response.body.data.find((m: { id: string }) => m.id === testMember1Id)
      expect(member1.qualifications).toHaveLength(2)

      const qualCodes = member1.qualifications.map((q: { code: string }) => q.code)
      expect(qualCodes).toContain('DDS')
      expect(qualCodes).toContain('BUILDING_AUTH')
    })
  })
})
