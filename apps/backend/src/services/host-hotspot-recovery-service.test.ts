import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HOST_HOTSPOT_RECOVERY_REQUEST_DIR,
  DEFAULT_HOST_HOTSPOT_RECOVERY_STATUS_FILE,
  HostHotspotRecoveryQueueError,
  HostHotspotRecoveryService,
} from './host-hotspot-recovery-service.js'

describe('HostHotspotRecoveryService', () => {
  it('defaults to the runtime queue watched by the host recovery processor', () => {
    expect(DEFAULT_HOST_HOTSPOT_RECOVERY_REQUEST_DIR).toBe(
      '/opt/sentinel/deploy/runtime/hotspot-recovery/requests'
    )
    expect(DEFAULT_HOST_HOTSPOT_RECOVERY_STATUS_FILE).toBe(
      '/opt/sentinel/deploy/runtime/hotspot-recovery/status.json'
    )
  })

  it('writes and reads a queued recovery status when a repair is requested', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'sentinel-hotspot-recovery-'))
    const requestDir = join(rootDir, 'requests')
    const statusFile = join(rootDir, 'status.json')
    const service = new HostHotspotRecoveryService(requestDir, statusFile)

    const queued = await service.queueRecoveryRequest({
      requestedByMemberId: 'member-1',
      requestedByMemberName: 'PO2 Alex Example',
      requestedByRemoteSystemName: 'Server',
      requestedFromIp: '10.42.0.1',
      requestedFromUserAgent: 'vitest',
    })
    const status = await service.readLatestStatus()
    const payload = JSON.parse(await readFile(queued.requestPath, 'utf-8')) as {
      source?: string
    }

    expect(status).toMatchObject({
      state: 'queued',
      stage: 'request_queued',
      requestId: queued.requestId,
      message: 'Host hotspot repair request queued. Waiting for the host processor to start.',
    })
    expect(status?.updatedAt).toBeTruthy()
    expect(payload.source).toBe('frontend-admin')

    await rm(rootDir, { recursive: true, force: true })
  })

  it('stores explicit request sources for scheduled repairs', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'sentinel-hotspot-recovery-'))
    const requestDir = join(rootDir, 'requests')
    const statusFile = join(rootDir, 'status.json')
    const service = new HostHotspotRecoveryService(requestDir, statusFile)

    const queued = await service.queueRecoveryRequest({
      requestedByMemberId: 'system',
      requestedByMemberName: 'Sentinel scheduled maintenance',
      requestedByRemoteSystemName: 'Scheduled job',
      requestedFromIp: null,
      requestedFromUserAgent: null,
      source: 'backend-scheduler',
    })
    const payload = JSON.parse(await readFile(queued.requestPath, 'utf-8')) as {
      source?: string
      requestedByMemberName?: string
    }

    expect(payload.source).toBe('backend-scheduler')
    expect(payload.requestedByMemberName).toBe('Sentinel scheduled maintenance')

    await rm(rootDir, { recursive: true, force: true })
  })

  it('explains permission failures without leaking raw EACCES text to operators', () => {
    const cause = Object.assign(new Error('permission denied'), {
      code: 'EACCES',
    })

    const error = new HostHotspotRecoveryQueueError('/queue', cause)

    expect(error.message).toBe(
      [
        'Sentinel could not write the host hotspot repair queue at /queue.',
        'Run the installer or update process again so the runtime directory is created for the backend service.',
      ].join(' ')
    )
  })
})
