import net from 'node:net'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createExpressEndpoints } from '@ts-rest/express'
import { systemUpdateContract } from '@sentinel/contracts'
import express from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createSystemUpdateRouter } from './system-update.js'

function createMember(accountLevel: number) {
  return {
    id: 'member-1',
    firstName: 'Alex',
    lastName: 'Example',
    rank: 'PO2',
    serviceNumber: 'M12345678',
    accountLevel,
    mustChangePin: false,
  }
}

function createTestApp(accountLevel?: number) {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    if (accountLevel !== undefined) {
      Object.assign(req, {
        member: createMember(accountLevel),
      })
    }
    next()
  })
  createExpressEndpoints(systemUpdateContract, createSystemUpdateRouter(), app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  return app
}

function createJob(overrides?: Partial<Record<string, unknown>>) {
  return {
    schemaVersion: 1,
    jobId: 'system-update-1713744000000-123e4567-e89b-12d3-a456-426614174000',
    status: 'requested',
    message: 'Queued for update.',
    requestedAt: '2026-04-22T12:00:00.000Z',
    startedAt: null,
    finishedAt: null,
    currentVersion: 'v2.6.1',
    latestVersion: 'v2.6.2',
    targetVersion: 'v2.6.2',
    failureSummary: null,
    rollbackAttempted: false,
    requestedBy: {
      memberId: 'member-1',
      memberName: 'PO2 Alex Example',
      accountLevel: 5,
      fromIp: '127.0.0.1',
    },
    ...overrides,
  }
}

async function writeJson(path: string, payload: unknown) {
  await writeFile(path, JSON.stringify(payload, null, 2), 'utf-8')
}

async function createBridgeServer(
  socketPath: string,
  onRequest: (payload: Record<string, unknown>) => Record<string, unknown>
) {
  const server = net.createServer((connection) => {
    const chunks: Buffer[] = []
    connection.on('data', (chunk) => {
      chunks.push(chunk)
    })
    connection.on('end', () => {
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>
      connection.end(JSON.stringify(onRequest(payload)))
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(socketPath, () => resolve())
  })

  return server
}

describe('systemUpdateRouter', () => {
  const originalAppVersion = process.env.APP_VERSION
  const originalStateRoot = process.env.SYSTEM_UPDATE_STATE_ROOT
  const originalSocketPath = process.env.SYSTEM_UPDATE_BRIDGE_SOCKET_PATH
  const originalReleaseRepository = process.env.SYSTEM_UPDATE_RELEASE_REPOSITORY

  afterEach(async () => {
    if (originalAppVersion === undefined) {
      delete process.env.APP_VERSION
    } else {
      process.env.APP_VERSION = originalAppVersion
    }

    if (originalStateRoot === undefined) {
      delete process.env.SYSTEM_UPDATE_STATE_ROOT
    } else {
      process.env.SYSTEM_UPDATE_STATE_ROOT = originalStateRoot
    }

    if (originalSocketPath === undefined) {
      delete process.env.SYSTEM_UPDATE_BRIDGE_SOCKET_PATH
    } else {
      process.env.SYSTEM_UPDATE_BRIDGE_SOCKET_PATH = originalSocketPath
    }

    if (originalReleaseRepository === undefined) {
      delete process.env.SYSTEM_UPDATE_RELEASE_REPOSITORY
    } else {
      process.env.SYSTEM_UPDATE_RELEASE_REPOSITORY = originalReleaseRepository
    }
  })

  it('requires authentication for update status', async () => {
    const app = createTestApp()
    const response = await request(app).get('/api/admin/system/update')

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      error: 'UNAUTHORIZED',
    })
  })

  it('requires admin access to start a system update', async () => {
    const app = createTestApp(1)
    const response = await request(app)
      .post('/api/admin/system/update')
      .send({ targetVersion: 'v2.6.2' })

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({
      error: 'FORBIDDEN',
    })
  })

  it('rejects invalid version input before reaching the bridge', async () => {
    const app = createTestApp(5)
    const response = await request(app)
      .post('/api/admin/system/update')
      .send({ targetVersion: 'latest' })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'VALIDATION_ERROR',
    })
  })

  it('starts a system update for admins through the Unix socket bridge', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'sentinel-system-update-state-'))
    const socketDir = await mkdtemp(join(tmpdir(), 'sentinel-system-update-socket-'))
    const socketPath = join(socketDir, 'update-bridge.sock')

    process.env.APP_VERSION = 'v2.6.1'
    process.env.SYSTEM_UPDATE_STATE_ROOT = stateRoot
    process.env.SYSTEM_UPDATE_BRIDGE_SOCKET_PATH = socketPath
    process.env.SYSTEM_UPDATE_RELEASE_REPOSITORY = ''

    const server = await createBridgeServer(socketPath, (payload) => {
      expect(payload).toMatchObject({
        targetVersion: 'v2.6.2',
        requestedByMemberId: 'member-1',
        requestedByMemberName: 'PO2 Alex Example',
      })

      return {
        status: 202,
        success: true,
        message: 'System update request accepted.',
        job: createJob({
          jobId: payload.jobId,
          targetVersion: payload.targetVersion,
        }),
      }
    })

    try {
      const app = createTestApp(5)
      const response = await request(app)
        .post('/api/admin/system/update')
        .send({ targetVersion: 'v2.6.2' })

      expect(response.status).toBe(202)
      expect(response.body).toMatchObject({
        success: true,
        message: 'System update request accepted.',
        job: {
          targetVersion: 'v2.6.2',
          requestedBy: {
            memberId: 'member-1',
          },
        },
      })
    } finally {
      server.close()
      await rm(stateRoot, { recursive: true, force: true })
      await rm(socketDir, { recursive: true, force: true })
    }
  })

  it('rejects duplicate active system update requests', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'sentinel-system-update-state-'))
    await mkdir(join(stateRoot, 'jobs'), { recursive: true })
    await writeJson(join(stateRoot, 'current-job.json'), createJob({ status: 'installing' }))

    process.env.APP_VERSION = 'v2.6.1'
    process.env.SYSTEM_UPDATE_STATE_ROOT = stateRoot
    process.env.SYSTEM_UPDATE_RELEASE_REPOSITORY = ''

    try {
      const app = createTestApp(5)
      const response = await request(app)
        .post('/api/admin/system/update')
        .send({ targetVersion: 'v2.6.2' })

      expect(response.status).toBe(409)
      expect(response.body).toMatchObject({
        error: 'CONFLICT',
      })
    } finally {
      await rm(stateRoot, { recursive: true, force: true })
    }
  })

  it('surfaces bridge/socket failures as internal errors', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'sentinel-system-update-state-'))

    process.env.APP_VERSION = 'v2.6.1'
    process.env.SYSTEM_UPDATE_STATE_ROOT = stateRoot
    process.env.SYSTEM_UPDATE_BRIDGE_SOCKET_PATH = join(stateRoot, 'missing.sock')
    process.env.SYSTEM_UPDATE_RELEASE_REPOSITORY = ''

    try {
      const app = createTestApp(5)
      const response = await request(app)
        .post('/api/admin/system/update')
        .send({ targetVersion: 'v2.6.2' })

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        error: 'INTERNAL_ERROR',
      })
    } finally {
      await rm(stateRoot, { recursive: true, force: true })
    }
  })

  it('returns a sanitized job history entry for an authenticated member', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'sentinel-system-update-state-'))
    await mkdir(join(stateRoot, 'jobs'), { recursive: true })
    await writeJson(
      join(
        stateRoot,
        'jobs',
        'system-update-1713744000000-123e4567-e89b-12d3-a456-426614174000.json'
      ),
      createJob({ status: 'completed', finishedAt: '2026-04-22T12:10:00.000Z' })
    )

    process.env.SYSTEM_UPDATE_STATE_ROOT = stateRoot
    process.env.SYSTEM_UPDATE_RELEASE_REPOSITORY = ''

    try {
      const app = createTestApp(5)
      const response = await request(app).get(
        '/api/admin/system/update/system-update-1713744000000-123e4567-e89b-12d3-a456-426614174000'
      )

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        jobId: 'system-update-1713744000000-123e4567-e89b-12d3-a456-426614174000',
        status: 'completed',
        step: 'completed',
      })
    } finally {
      await rm(stateRoot, { recursive: true, force: true })
    }
  })

  it('returns a clean error when the updater state file is corrupt', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'sentinel-system-update-state-'))
    await mkdir(join(stateRoot, 'jobs'), { recursive: true })
    await writeFile(join(stateRoot, 'current-job.json'), '{invalid-json', 'utf-8')

    process.env.SYSTEM_UPDATE_STATE_ROOT = stateRoot
    process.env.SYSTEM_UPDATE_RELEASE_REPOSITORY = ''

    try {
      const app = createTestApp(5)
      const response = await request(app).get('/api/admin/system/update')

      expect(response.status).toBe(500)
      expect(response.body).toMatchObject({
        error: 'INTERNAL_ERROR',
      })
      expect(String(response.body.message)).toContain('Unable to parse updater job state')
    } finally {
      await rm(stateRoot, { recursive: true, force: true })
    }
  })
})
