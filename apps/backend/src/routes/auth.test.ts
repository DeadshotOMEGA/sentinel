import cookieParser from 'cookie-parser'
import express from 'express'
import request from 'supertest'
import type { PrismaClientInstance } from '@sentinel/database'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetPrismaClient, setPrismaClient } from '../lib/database.js'
import { resetRuntimeContextCachesForTests } from '../lib/runtime-context.js'
import { authRouter } from './auth.js'

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/auth', authRouter)
  return app
}

function createAuthPrismaHarness(initial?: { serviceNumber?: string }) {
  const memberRecord = {
    id: 'member-1',
    firstName: 'Alex',
    lastName: 'Example',
    rank: 'PO2',
    serviceNumber: initial?.serviceNumber ?? 'M12345678',
    accountLevel: 1,
    status: 'active',
  }

  const prisma = {
    badge: {
      findUnique: async ({ where }: { where: { serialNumber: string } }) =>
        where.serialNumber === 'serial-1'
          ? {
              id: 'badge-1',
              assignedToId: memberRecord.id,
              status: 'active',
              members: [],
            }
          : null,
    },
    member: {
      findUnique: async ({ where }: { where: { id?: string; serviceNumber?: string } }) => {
        if (where.id === memberRecord.id || where.serviceNumber === memberRecord.serviceNumber) {
          return memberRecord
        }

        return null
      },
    },
    remoteSystem: {
      findUnique: async ({ where }: { where: { code?: string } }) => {
        if (where.code === 'kiosk') {
          return {
            id: 'remote-kiosk',
            code: 'kiosk',
            name: 'Kiosk',
            description: 'Kiosk station',
            displayOrder: 1,
            isActive: true,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            updatedAt: new Date('2026-04-01T00:00:00.000Z'),
          }
        }

        if (where.code === 'deployment_laptop') {
          return {
            id: 'remote-server',
            code: 'deployment_laptop',
            name: 'Server',
            description: 'Server host for the Sentinel hotspot and shared services.',
            displayOrder: 2,
            isActive: true,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            updatedAt: new Date('2026-04-01T00:00:00.000Z'),
          }
        }

        return null
      },
      findMany: async ({ where }: { where: { id?: string; isActive?: boolean } }) => {
        if (where.id === 'remote-other' && where.isActive) {
          return [
            {
              id: 'remote-other',
              code: 'other',
              name: 'Other',
              description: 'Other station',
              displayOrder: 3,
              isActive: true,
              createdAt: new Date('2026-04-01T00:00:00.000Z'),
              updatedAt: new Date('2026-04-01T00:00:00.000Z'),
            },
          ]
        }

        return []
      },
    },
    memberSession: {
      updateMany: async () => ({ count: 0 }),
      create: async ({
        data,
      }: {
        data: {
          memberId: string
          remoteSystemId: string | null
          remoteSystemNameSnapshot: string
          token: string
          expiresAt: Date
          lastSeenAt: Date
        }
      }) => ({
        id: 'session-1',
        token: data.token,
        expiresAt: data.expiresAt,
        remoteSystemId: data.remoteSystemId,
        remoteSystemNameSnapshot: data.remoteSystemNameSnapshot,
        lastSeenAt: data.lastSeenAt,
      }),
    },
    checkin: {
      findFirst: async () => ({
        id: 'existing-checkin',
        memberId: memberRecord.id,
        badgeId: null,
        direction: 'in',
        timestamp: new Date('2026-04-01T12:00:00.000Z'),
        kioskId: 'remote-kiosk',
        synced: true,
        createdAt: new Date('2026-04-01T12:00:00.000Z'),
        method: 'login',
        createdByAdmin: null,
      }),
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'audit-1',
        adminUserId: data.adminUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        details: data.details,
        ipAddress: data.ipAddress,
        createdAt: new Date('2026-04-01T12:00:00.000Z'),
        adminUser: null,
      }),
    },
    setting: {
      findUnique: async () => null,
    },
  } as unknown as PrismaClientInstance

  return { prisma, memberRecord }
}

describe('authRouter', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    resetRuntimeContextCachesForTests()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    resetRuntimeContextCachesForTests()
    resetPrismaClient()
  })

  it('accepts badge login without a PIN', async () => {
    const { prisma } = createAuthPrismaHarness()
    setPrismaClient(prisma)

    const app = createTestApp()
    const response = await request(app).post('/api/auth/login').send({
      serialNumber: 'serial-1',
      useKioskRemoteSystem: true,
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      remoteSystemId: 'remote-kiosk',
      remoteSystemName: 'Kiosk',
      member: {
        id: 'member-1',
        serviceNumber: 'M12345678',
      },
    })
    expect(response.headers['set-cookie']).toBeDefined()
  })

  it('accepts Service Number login without a PIN', async () => {
    const { prisma } = createAuthPrismaHarness()
    setPrismaClient(prisma)

    const app = createTestApp()
    const response = await request(app).post('/api/auth/login').send({
      serialNumber: 'M12345678',
      useKioskRemoteSystem: true,
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      remoteSystemId: 'remote-kiosk',
      remoteSystemName: 'Kiosk',
      member: {
        id: 'member-1',
        serviceNumber: 'M12345678',
      },
    })
  })

  it('forces host-device logins onto the Server remote system in production', async () => {
    process.env.NODE_ENV = 'production'

    const { prisma } = createAuthPrismaHarness()
    setPrismaClient(prisma)

    const app = createTestApp()
    const response = await request(app)
      .post('/api/auth/login')
      .set('x-forwarded-for', '127.0.0.1')
      .send({
        serialNumber: 'serial-1',
        remoteSystemId: '11111111-1111-4111-8111-111111111111',
      })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      remoteSystemId: 'remote-server',
      remoteSystemName: 'Server',
    })
  })
})
