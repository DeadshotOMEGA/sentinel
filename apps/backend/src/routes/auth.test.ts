import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import express from 'express'
import request from 'supertest'
import type { PrismaClientInstance } from '@sentinel/database'
import { afterEach, describe, expect, it } from 'vitest'
import { resetPrismaClient, setPrismaClient } from '../lib/database.js'
import { authRouter } from './auth.js'

const TEST_BCRYPT_COST = 4

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/auth', authRouter)
  return app
}

function createAuthPrismaHarness(initial: {
  pinHash: string | null
  mustChangePin: boolean
  serviceNumber?: string
}) {
  const memberRecord = {
    id: 'member-1',
    firstName: 'Alex',
    lastName: 'Example',
    rank: 'PO2',
    serviceNumber: initial.serviceNumber ?? 'M12345678',
    accountLevel: 1,
    mustChangePin: initial.mustChangePin,
    status: 'active',
    pinHash: initial.pinHash,
  }

  const prisma = {
    badge: {
      findUnique: async () => ({
        id: 'badge-1',
        assignedToId: memberRecord.id,
        status: 'active',
        members: [],
      }),
    },
    member: {
      findUnique: async () => memberRecord,
      update: async ({ data }: { data: { pinHash?: string; mustChangePin?: boolean } }) => {
        if (data.pinHash !== undefined) {
          memberRecord.pinHash = data.pinHash
        }
        if (data.mustChangePin !== undefined) {
          memberRecord.mustChangePin = data.mustChangePin
        }

        return memberRecord
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

        return null
      },
      findFirst: async () => null,
    },
    memberSession: {
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
    setting: {
      findUnique: async () => null,
    },
  } as unknown as PrismaClientInstance

  return { prisma, memberRecord }
}

describe('authRouter', () => {
  afterEach(() => {
    resetPrismaClient()
  })

  it('returns setup-required during preflight for a member with no PIN', async () => {
    const { prisma } = createAuthPrismaHarness({
      pinHash: null,
      mustChangePin: false,
    })
    setPrismaClient(prisma)

    const app = createTestApp()
    const response = await request(app)
      .post('/api/auth/preflight-login')
      .send({ serialNumber: 'serial-1' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      pinState: 'setup_required',
      setupReason: 'missing',
      member: {
        id: 'member-1',
        mustChangePin: true,
      },
    })
  })

  it('allows public PIN setup for a member with a temporary default PIN', async () => {
    const { prisma, memberRecord } = createAuthPrismaHarness({
      pinHash: await bcrypt.hash('1111', TEST_BCRYPT_COST),
      mustChangePin: true,
    })
    setPrismaClient(prisma)

    const app = createTestApp()
    const response = await request(app)
      .post('/api/auth/setup-pin')
      .send({ serialNumber: 'serial-1', newPin: '2468' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ message: 'PIN set' })
    expect(memberRecord.mustChangePin).toBe(false)
    await expect(bcrypt.compare('2468', memberRecord.pinHash as string)).resolves.toBe(true)
  })

  it('blocks login until setup is complete and then accepts the new PIN', async () => {
    const { prisma } = createAuthPrismaHarness({
      pinHash: await bcrypt.hash('1111', TEST_BCRYPT_COST),
      mustChangePin: false,
    })
    setPrismaClient(prisma)

    const app = createTestApp()

    const blockedLogin = await request(app).post('/api/auth/login').send({
      serialNumber: 'serial-1',
      pin: '1111',
      useKioskRemoteSystem: true,
    })

    expect(blockedLogin.status).toBe(403)
    expect(blockedLogin.body).toEqual({
      error: 'PIN_SETUP_REQUIRED',
      message: 'PIN setup required before signing in',
    })

    const setupResponse = await request(app).post('/api/auth/setup-pin').send({
      serialNumber: 'serial-1',
      newPin: '2468',
    })

    expect(setupResponse.status).toBe(200)

    const successfulLogin = await request(app).post('/api/auth/login').send({
      serialNumber: 'serial-1',
      pin: '2468',
      useKioskRemoteSystem: true,
    })

    expect(successfulLogin.status).toBe(200)
    expect(successfulLogin.body).toMatchObject({
      remoteSystemId: 'remote-kiosk',
      remoteSystemName: 'Kiosk',
      member: {
        id: 'member-1',
        mustChangePin: false,
      },
    })
    expect(successfulLogin.headers['set-cookie']).toBeDefined()
  })
})
