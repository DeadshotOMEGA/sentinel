import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TestDatabase } from '../../helpers/testcontainers.js'
import { AdminUserRepository } from '../../../src/repositories/admin-user-repository.js'

describe('Security Alerts Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  let app: Express
  let adminUserRepo: AdminUserRepository
  let testAdminId: string
  let testAlertId: string

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

    adminUserRepo = new AdminUserRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()

    // Create test admin user for acknowledgements
    const admin = await adminUserRepo.create({
      username: 'testadmin',
      displayName: 'Test Admin',
      role: 'admin',
      passwordHash: 'testhash123', // Not used in tests
      firstName: 'Test',
      lastName: 'Admin',
      email: 'testadmin@test.com',
    })
    testAdminId = admin.id
  })

  describe('GET /api/security-alerts/active', () => {
    it('should return 200 with empty array when no active alerts', async () => {
      const response = await request(app)
        .get('/api/security-alerts/active')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        alerts: [],
        count: 0,
      })
    })

    it('should return 200 with active alerts list', async () => {
      // Create test security alerts
      await testDb.prisma!.securityAlert.create({
        data: {
          alertType: 'badge_disabled',
          severity: 'critical',
          badgeSerial: 'BADGE001',
          memberId: null,
          kioskId: 'KIOSK001',
          message: 'Badge disabled scan attempt',
          details: { reason: 'badge_disabled' },
          status: 'active',
        },
      })

      await testDb.prisma!.securityAlert.create({
        data: {
          alertType: 'badge_unknown',
          severity: 'warning',
          badgeSerial: 'UNKNOWN123',
          memberId: null,
          kioskId: 'KIOSK002',
          message: 'Unknown badge scanned',
          details: { reason: 'unknown' },
          status: 'active',
        },
      })

      // Create acknowledged alert (should not appear)
      await testDb.prisma!.securityAlert.create({
        data: {
          alertType: 'inactive_member',
          severity: 'info',
          badgeSerial: 'BADGE002',
          memberId: null,
          kioskId: 'KIOSK001',
          message: 'Inactive member scan',
          details: {},
          status: 'acknowledged',
        },
      })

      const response = await request(app)
        .get('/api/security-alerts/active')
        .expect(200)

      expect(response.body.alerts).toHaveLength(2)
      expect(response.body.count).toBe(2)
      expect(response.body.alerts[0]).toHaveProperty('id')
      expect(response.body.alerts[0]).toHaveProperty('alertType')
      expect(response.body.alerts[0]).toHaveProperty('severity')
      expect(response.body.alerts[0].status).toBe('active')
    })
  })

  describe('POST /api/security-alerts', () => {
    it('should return 201 and create alert with valid data', async () => {
      const newAlert = {
        alertType: 'badge_disabled' as const,
        severity: 'critical' as const,
        badgeSerial: 'TEST001',
        kioskId: 'KIOSK001',
        message: 'Test security alert',
        details: { test: 'data' },
      }

      const response = await request(app)
        .post('/api/security-alerts')
        .send(newAlert)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toMatchObject({
        alertType: 'badge_disabled',
        severity: 'critical',
        badgeSerial: 'TEST001',
        kioskId: 'KIOSK001',
        message: 'Test security alert',
        status: 'active',
      })
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('createdAt')

      // Verify alert was created in database
      const created = await testDb.prisma!.securityAlert.findUnique({
        where: { id: response.body.id },
      })

      expect(created).toBeDefined()
      expect(created?.alertType).toBe('badge_disabled')
    })

    it('should create alert with null badgeSerial', async () => {
      const newAlert = {
        alertType: 'inactive_member' as const,
        severity: 'info' as const,
        badgeSerial: null,
        kioskId: 'KIOSK001',
        message: 'Inactive member check',
      }

      const response = await request(app)
        .post('/api/security-alerts')
        .send(newAlert)
        .expect(201)

      expect(response.body.badgeSerial).toBeNull()
      expect(response.body.message).toBe('Inactive member check')
    })

    it('should create alert with memberId', async () => {
      const testMemberId = '00000000-0000-0000-0000-000000000002'

      const newAlert = {
        alertType: 'badge_unknown' as const,
        severity: 'warning' as const,
        badgeSerial: 'BADGE999',
        memberId: testMemberId,
        kioskId: 'KIOSK001',
        message: 'Unknown badge for member',
      }

      const response = await request(app)
        .post('/api/security-alerts')
        .send(newAlert)
        .expect(201)

      expect(response.body.memberId).toBe(testMemberId)
    })
  })

  describe('GET /api/security-alerts/:id', () => {
    beforeEach(async () => {
      const alert = await testDb.prisma!.securityAlert.create({
        data: {
          alertType: 'badge_disabled',
          severity: 'critical',
          badgeSerial: 'ALERT001',
          memberId: null,
          kioskId: 'KIOSK001',
          message: 'Test alert for retrieval',
          details: {},
          status: 'active',
        },
      })
      testAlertId = alert.id
    })

    it('should return 200 with alert data when alert exists', async () => {
      const response = await request(app)
        .get(`/api/security-alerts/${testAlertId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testAlertId,
        alertType: 'badge_disabled',
        severity: 'critical',
        badgeSerial: 'ALERT001',
        kioskId: 'KIOSK001',
        message: 'Test alert for retrieval',
        status: 'active',
      })
      expect(response.body).toHaveProperty('createdAt')
    })

    it('should return 404 when alert does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app)
        .get(`/api/security-alerts/${nonExistentId}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/security-alerts/invalid-id')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/security-alerts/:id/acknowledge', () => {
    beforeEach(async () => {
      const alert = await testDb.prisma!.securityAlert.create({
        data: {
          alertType: 'badge_disabled',
          severity: 'critical',
          badgeSerial: 'ACK001',
          memberId: null,
          kioskId: 'KIOSK001',
          message: 'Alert to acknowledge',
          details: {},
          status: 'active',
        },
      })
      testAlertId = alert.id
    })

    it('should return 200 and acknowledge alert', async () => {
      const acknowledgeData = {
        adminId: testAdminId,
        note: 'Acknowledged by admin',
      }

      const response = await request(app)
        .post(`/api/security-alerts/${testAlertId}/acknowledge`)
        .send(acknowledgeData)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Security alert acknowledged successfully',
        alert: {
          id: testAlertId,
          alertType: 'badge_disabled',
          severity: 'critical',
          status: 'acknowledged',
        },
      })

      // Verify alert was acknowledged in database
      const acknowledged = await testDb.prisma!.securityAlert.findUnique({
        where: { id: testAlertId },
      })

      expect(acknowledged?.status).toBe('acknowledged')
    })

    it('should acknowledge alert without note', async () => {
      const acknowledgeData = {
        adminId: testAdminId,
      }

      const response = await request(app)
        .post(`/api/security-alerts/${testAlertId}/acknowledge`)
        .send(acknowledgeData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.alert.status).toBe('acknowledged')
    })

    it('should return 404 when alert does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const acknowledgeData = {
        adminId: testAdminId,
        note: 'Test note',
      }

      const response = await request(app)
        .post(`/api/security-alerts/${nonExistentId}/acknowledge`)
        .send(acknowledgeData)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: expect.stringContaining(nonExistentId),
      })
    })

    it('should return 400 when alert already acknowledged', async () => {
      // First acknowledgement
      await request(app)
        .post(`/api/security-alerts/${testAlertId}/acknowledge`)
        .send({ adminId: testAdminId })
        .expect(200)

      // Try to acknowledge again
      const response = await request(app)
        .post(`/api/security-alerts/${testAlertId}/acknowledge`)
        .send({ adminId: testAdminId })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'VALIDATION_ERROR',
        message: expect.stringContaining('already'),
      })
    })
  })
})
