import { createExpressEndpoints } from '@ts-rest/express'
import { remoteSystemContract } from '@sentinel/contracts'
import type { PrismaClientInstance } from '@sentinel/database'
import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetPrismaClient, setPrismaClient } from '../lib/database.js'
import { resetRuntimeContextCachesForTests } from '../lib/runtime-context.js'
import { remoteSystemsRouter } from './remote-systems.js'

function createTestApp() {
  const app = express()
  app.use(express.json())
  createExpressEndpoints(remoteSystemContract, remoteSystemsRouter, app)
  return app
}

function createPrismaHarness(): PrismaClientInstance {
  const remoteSystems = [
    {
      id: 'remote-brow',
      code: 'brow_controller',
      name: 'Brow',
      description: 'Brow station',
      displayOrder: 0,
      isActive: true,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
    {
      id: 'remote-server',
      code: 'deployment_laptop',
      name: 'Deployment Laptop',
      description: 'Deployment laptop local session and operator presence.',
      displayOrder: 1,
      isActive: true,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
    {
      id: 'remote-office',
      code: 'ships_office',
      name: "Ship's Office",
      description: 'Office station',
      displayOrder: 2,
      isActive: true,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
  ]

  return {
    remoteSystem: {
      findMany: async ({
        where,
      }: {
        where?: { isActive?: boolean; id?: string }
      } = {}) =>
        remoteSystems.filter((system) => {
          if (where?.isActive !== undefined && system.isActive !== where.isActive) {
            return false
          }
          if (where?.id !== undefined && system.id !== where.id) {
            return false
          }
          return true
        }),
      findUnique: async ({
        where,
      }: {
        where: { code?: string; id?: string }
      }) =>
        remoteSystems.find((system) => {
          if (where.code !== undefined) {
            return system.code === where.code
          }
          if (where.id !== undefined) {
            return system.id === where.id
          }
          return false
        }) ?? null,
    },
    memberSession: {
      groupBy: async () => [
        {
          remoteSystemId: 'remote-brow',
          _count: {
            _all: 1,
          },
        },
      ],
    },
  } as unknown as PrismaClientInstance
}

describe('remoteSystemsRouter', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    resetRuntimeContextCachesForTests()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    resetRuntimeContextCachesForTests()
    resetPrismaClient()
  })

  it('marks occupied systems and returns host-device login context', async () => {
    process.env.NODE_ENV = 'production'
    setPrismaClient(createPrismaHarness())

    const app = createTestApp()
    const response = await request(app)
      .get('/api/remote-systems')
      .set('x-forwarded-for', '127.0.0.1')

    expect(response.status).toBe(200)
    expect(response.body.loginContext).toEqual({
      isHostDevice: true,
      forcedRemoteSystemId: 'remote-server',
    })
    expect(response.body.systems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'remote-brow',
          name: 'Brow',
          isOccupied: true,
        }),
        expect.objectContaining({
          id: 'remote-server',
          name: 'Server',
          isOccupied: false,
        }),
      ])
    )
  })
})
