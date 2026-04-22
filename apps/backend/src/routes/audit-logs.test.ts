import { createExpressEndpoints } from '@ts-rest/express'
import { auditContract } from '@sentinel/contracts'
import type { PrismaClientInstance } from '@sentinel/database'
import express from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetPrismaClient, setPrismaClient } from '../lib/database.js'

const auditLogs = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    adminUserId: null,
    action: 'member_create',
    entityType: 'member',
    entityId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    details: {
      actorName: 'PO2 Alex Admin',
      memberName: 'PO2 Casey Example',
    },
    ipAddress: '127.0.0.1',
    createdAt: new Date('2026-04-21T12:00:00.000Z'),
    adminUser: null,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    adminUserId: '99999999-9999-4999-8999-999999999999',
    action: 'badge_assign',
    entityType: 'badge',
    entityId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    details: {
      badgeSerialNumber: 'SENT-0001',
    },
    ipAddress: '127.0.0.1',
    createdAt: new Date('2026-04-21T13:00:00.000Z'),
    adminUser: {
      id: '99999999-9999-4999-8999-999999999999',
      username: 'sentinel-admin',
      displayName: 'Sentinel Admin',
    },
  },
]

function createPrismaHarness(): PrismaClientInstance {
  return {
    auditLog: {
      findMany: async () =>
        [...auditLogs].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
      count: async () => auditLogs.length,
      findUnique: async ({ where }: { where: { id: string } }) =>
        auditLogs.find((log) => log.id === where.id) ?? null,
      groupBy: async ({ by }: { by: Array<'action' | 'entityType' | 'adminUserId'> }) => {
        if (by.includes('action')) {
          return [
            { action: 'member_create', _count: { action: 1 } },
            { action: 'badge_assign', _count: { action: 1 } },
          ]
        }

        if (by.includes('entityType')) {
          return [
            { entityType: 'member', _count: { entityType: 1 } },
            { entityType: 'badge', _count: { entityType: 1 } },
          ]
        }

        return [
          {
            adminUserId: '99999999-9999-4999-8999-999999999999',
            _count: { adminUserId: 1 },
          },
        ]
      },
      create: async () => auditLogs[0],
    },
    adminUser: {
      findMany: async () => [
        {
          id: '99999999-9999-4999-8999-999999999999',
          username: 'sentinel-admin',
          displayName: 'Sentinel Admin',
        },
      ],
    },
  } as unknown as PrismaClientInstance
}

async function createTestApp(accountLevel: number) {
  const { auditLogsRouter } = await import('./audit-logs.js')
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    Object.assign(req, {
      member: {
        id: 'member-1',
        firstName: 'Alex',
        lastName: 'Admin',
        rank: 'PO2',
        serviceNumber: 'M12345678',
        accountLevel,
      },
    })
    next()
  })
  createExpressEndpoints(auditContract, auditLogsRouter, app)
  return app
}

describe('auditLogsRouter', () => {
  afterEach(() => {
    resetPrismaClient()
    vi.resetModules()
  })

  it('serves audit stats from /api/audit-logs/stats', async () => {
    setPrismaClient(createPrismaHarness())

    const app = await createTestApp(5)
    const response = await request(app).get('/api/audit-logs/stats')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      total: 2,
      byAction: {
        member_create: 1,
        badge_assign: 1,
      },
      byEntityType: {
        member: 1,
        badge: 1,
      },
    })
    expect(response.body.recentActivity).toHaveLength(2)
  })

  it('requires admin access for audit log listing', async () => {
    setPrismaClient(createPrismaHarness())

    const app = await createTestApp(1)
    const response = await request(app).get('/api/audit-logs')

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({
      error: 'FORBIDDEN',
    })
  })
})
