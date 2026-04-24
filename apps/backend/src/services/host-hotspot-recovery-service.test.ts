import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HOST_HOTSPOT_RECOVERY_REQUEST_DIR,
  HostHotspotRecoveryQueueError,
} from './host-hotspot-recovery-service.js'

describe('HostHotspotRecoveryService', () => {
  it('defaults to the runtime queue watched by the host recovery processor', () => {
    expect(DEFAULT_HOST_HOTSPOT_RECOVERY_REQUEST_DIR).toBe(
      '/opt/sentinel/deploy/runtime/hotspot-recovery/requests'
    )
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
