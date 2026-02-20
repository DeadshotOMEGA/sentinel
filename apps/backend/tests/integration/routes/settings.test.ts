import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { MemberRepository } from '../../../src/repositories/member-repository.js'
import { DivisionRepository } from '../../../src/repositories/division-repository.js'

describe('Settings Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let memberRepo: MemberRepository
  let divisionRepo: DivisionRepository

  let basicToken = ''
  let adminToken = ''

  beforeAll(async () => {
    await testDb.start()

    const modulesToClear = Object.keys(require.cache).filter(
      (key) =>
        key.includes('@sentinel/database') || key.includes('src/app') || key.includes('src/routes')
    )
    modulesToClear.forEach((key) => delete require.cache[key])

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

    await testDb.prisma!.rank.createMany({
      data: [
        {
          code: 'S2',
          name: 'Able Seaman',
          branch: 'navy',
          category: 'junior_ncm',
          displayOrder: 2,
        },
      ],
      skipDuplicates: true,
    })

    const division = await divisionRepo.create({
      name: 'Test Division',
      code: 'TD',
      description: 'Test division',
    })

    const basicMember = await memberRepo.create({
      serviceNumber: 'SN20001',
      rank: 'S2',
      firstName: 'Basic',
      lastName: 'Member',
      divisionId: division.id,
      memberType: 'class_a',
    })

    const adminMember = await memberRepo.create({
      serviceNumber: 'SN20002',
      rank: 'S2',
      firstName: 'Admin',
      lastName: 'Member',
      divisionId: division.id,
      memberType: 'class_a',
    })

    await testDb.prisma!.member.update({
      where: { id: adminMember.id },
      data: { accountLevel: 5 },
    })

    basicToken = `basic-session-${Date.now()}`
    adminToken = `admin-session-${Date.now()}`

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await testDb.prisma!.memberSession.create({
      data: {
        memberId: basicMember.id,
        token: basicToken,
        expiresAt,
      },
    })

    await testDb.prisma!.memberSession.create({
      data: {
        memberId: adminMember.id,
        token: adminToken,
        expiresAt,
      },
    })
  })

  describe('GET /api/settings', () => {
    it('should return 401 without authentication', async () => {
      await request(app).get('/api/settings').expect(401)
    })

    it('should return 200 for authenticated member', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Cookie', `sentinel-session=${basicToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        settings: [],
        total: 0,
      })
    })
  })

  describe('GET /api/settings/:key', () => {
    it('should return 404 when setting does not exist', async () => {
      await request(app)
        .get('/api/settings/dds.page.content.v1')
        .set('Cookie', `sentinel-session=${basicToken}`)
        .expect(404)
    })

    it('should return 200 when setting exists', async () => {
      await testDb.prisma!.setting.create({
        data: {
          key: 'dds.page.content.v1',
          value: { version: 1, seeded: true },
          category: 'app_config',
          description: 'DDS content',
        },
      })

      const response = await request(app)
        .get('/api/settings/dds.page.content.v1')
        .set('Cookie', `sentinel-session=${basicToken}`)
        .expect(200)

      expect(response.body.key).toBe('dds.page.content.v1')
      expect(response.body.category).toBe('app_config')
    })
  })

  describe('POST /api/settings', () => {
    it('should return 403 for non-admin member', async () => {
      await request(app)
        .post('/api/settings')
        .set('Cookie', `sentinel-session=${basicToken}`)
        .send({
          key: 'dds.page.content.v1',
          value: { version: 1 },
          category: 'app_config',
        })
        .expect(403)
    })

    it('should return 201 for admin member', async () => {
      const response = await request(app)
        .post('/api/settings')
        .set('Cookie', `sentinel-session=${adminToken}`)
        .send({
          key: 'dds.page.content.v1',
          value: { version: 1 },
          category: 'app_config',
          description: 'DDS operations content',
        })
        .expect(201)

      expect(response.body.key).toBe('dds.page.content.v1')
    })
  })

  describe('PUT /api/settings/:key', () => {
    it('should return 200 for admin update', async () => {
      await testDb.prisma!.setting.create({
        data: {
          key: 'dds.page.content.v1',
          value: { version: 1, original: true },
          category: 'app_config',
          description: 'Original',
        },
      })

      const response = await request(app)
        .put('/api/settings/dds.page.content.v1')
        .set('Cookie', `sentinel-session=${adminToken}`)
        .send({
          value: { version: 1, updated: true },
          description: 'Updated',
        })
        .expect(200)

      expect(response.body.key).toBe('dds.page.content.v1')
      expect(response.body.description).toBe('Updated')
    })
  })

  describe('DELETE /api/settings/:key', () => {
    it('should return 200 for admin delete', async () => {
      await testDb.prisma!.setting.create({
        data: {
          key: 'dds.page.content.v1',
          value: { version: 1 },
          category: 'app_config',
          description: 'To delete',
        },
      })

      await request(app)
        .delete('/api/settings/dds.page.content.v1')
        .set('Cookie', `sentinel-session=${adminToken}`)
        .expect(200)

      const deleted = await testDb.prisma!.setting.findUnique({
        where: { key: 'dds.page.content.v1' },
      })
      expect(deleted).toBeNull()
    })
  })
})
