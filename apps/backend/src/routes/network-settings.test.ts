import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createExpressEndpoints } from '@ts-rest/express'
import { networkSettingContract } from '@sentinel/contracts'
import express from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { networkSettingsRouter } from './network-settings.js'

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
        session: {
          remoteSystemName: 'Server',
        },
      })
    }
    next()
  })
  createExpressEndpoints(networkSettingContract, networkSettingsRouter, app)
  return app
}

describe('networkSettingsRouter', () => {
  const originalRequestDir = process.env.HOST_HOTSPOT_RECOVERY_REQUEST_DIR

  afterEach(async () => {
    if (originalRequestDir === undefined) {
      delete process.env.HOST_HOTSPOT_RECOVERY_REQUEST_DIR
    } else {
      process.env.HOST_HOTSPOT_RECOVERY_REQUEST_DIR = originalRequestDir
    }
  })

  it('requires admin access for host hotspot recovery', async () => {
    const app = createTestApp(1)
    const response = await request(app).post('/api/network-settings/host-hotspot-recovery')

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({
      error: 'FORBIDDEN',
    })
  })

  it('queues a host hotspot recovery request for admins', async () => {
    const requestDir = await mkdtemp(join(tmpdir(), 'sentinel-hotspot-recovery-'))
    process.env.HOST_HOTSPOT_RECOVERY_REQUEST_DIR = requestDir

    const app = createTestApp(5)
    const response = await request(app)
      .post('/api/network-settings/host-hotspot-recovery')
      .set('user-agent', 'vitest')

    expect(response.status).toBe(202)
    expect(response.body).toEqual({
      success: true,
      message: 'Host hotspot recovery request queued',
    })

    const requestFiles = await readdir(requestDir)
    expect(requestFiles).toHaveLength(1)

    const payload = JSON.parse(
      await readFile(join(requestDir, requestFiles[0] as string), 'utf-8')
    ) as {
      requestedByMemberId: string
      requestedByMemberName: string
      requestedByRemoteSystemName: string | null
      requestedFromUserAgent: string | null
    }

    expect(payload).toMatchObject({
      requestedByMemberId: 'member-1',
      requestedByMemberName: 'PO2 Alex Example',
      requestedByRemoteSystemName: 'Server',
      requestedFromUserAgent: 'vitest',
    })

    await rm(requestDir, { recursive: true, force: true })
  })
})
