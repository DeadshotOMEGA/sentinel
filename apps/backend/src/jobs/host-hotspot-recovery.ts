import { logger } from '../lib/logger.js'
import { HostHotspotRecoveryService } from '../services/host-hotspot-recovery-service.js'

/**
 * Scheduled Host Hotspot Recovery Job
 *
 * Queues the same host-side hotspot repair request used by the manual recovery UI.
 * The host processor remains responsible for performing the actual adapter/profile work.
 */
export async function runScheduledHostHotspotRecovery(): Promise<void> {
  const jobLogger = logger.child({ job: 'host-hotspot-recovery' })
  const recoveryService = new HostHotspotRecoveryService()
  const currentStatus = await recoveryService.readLatestStatus()

  if (currentStatus?.state === 'queued' || currentStatus?.state === 'running') {
    jobLogger.info('Host hotspot recovery already queued or running, skipping scheduled request', {
      state: currentStatus.state,
      stage: currentStatus.stage,
      requestId: currentStatus.requestId,
    })
    return
  }

  const queued = await recoveryService.queueRecoveryRequest({
    requestedByMemberId: 'system',
    requestedByMemberName: 'Sentinel scheduled maintenance',
    requestedByRemoteSystemName: 'Scheduled job',
    requestedFromIp: null,
    requestedFromUserAgent: null,
    source: 'backend-scheduler',
  })

  jobLogger.info('Scheduled host hotspot recovery request queued', {
    requestId: queued.requestId,
  })
}
