import { prisma } from '@sentinel/database'
import { logger } from '../lib/logger.js'
import { AlertService } from '../services/alert-service.js'
import { LockupService } from '../services/lockup-service.js'
import { PresenceService } from '../services/presence-service.js'
import { getOperationalDateISO } from '../utils/operational-date.js'

/**
 * Lockup Alerts Job
 *
 * Runs at configured times (default 10 PM warning, 11 PM critical) to:
 * 1. Check if building has been secured
 * 2. If not, emit reminder alerts with appropriate severity
 *
 * @param severity - 'warning' for first reminder, 'critical' for urgent reminder
 */
export async function runLockupAlerts(severity: 'warning' | 'critical'): Promise<void> {
  const operationalDate = getOperationalDateISO()
  const jobLogger = logger.child({
    job: 'lockup-alerts',
    operationalDate,
    severity,
  })

  jobLogger.info('Starting lockup alerts job', { severity })

  const alertService = new AlertService(prisma)
  const lockupService = new LockupService(prisma)
  const presenceService = new PresenceService(prisma)

  try {
    // Get current lockup status
    const lockupStatus = await lockupService.getCurrentStatus()

    // If building is already secured, no alert needed
    if (lockupStatus.buildingStatus === 'secured') {
      jobLogger.info('Building already secured, no alert needed')
      return
    }

    // Get presence stats for context
    const presenceStats = await presenceService.getStats()
    const checkedInMembers = presenceStats.presentMembers
    const checkedInVisitors = presenceStats.presentVisitors

    // Log current state
    jobLogger.info('Building not secured', {
      buildingStatus: lockupStatus.buildingStatus,
      checkedInMembers,
      checkedInVisitors,
      lockupHolder: lockupStatus.currentHolder
        ? `${lockupStatus.currentHolder.rank} ${lockupStatus.currentHolder.firstName} ${lockupStatus.currentHolder.lastName}`
        : 'No one',
    })

    // Check if someone has lockup
    if (!lockupStatus.currentHolder) {
      // Critical: No one has lockup responsibility
      await alertService.createAlert({
        type: 'lockup_not_executed',
        severity: 'critical',
        title: 'Lockup Unassigned',
        message: 'Building is not secured and no one has lockup responsibility. Immediate action required.',
        data: {
          buildingStatus: lockupStatus.buildingStatus,
          checkedInMembers,
          checkedInVisitors,
        },
      })
    } else {
      // Emit reminder based on severity
      const holderName = `${lockupStatus.currentHolder.rank} ${lockupStatus.currentHolder.firstName} ${lockupStatus.currentHolder.lastName}`

      await alertService.emitLockupReminder(severity)

      // Also emit a more detailed alert for tracking
      await alertService.createAlert({
        type: severity === 'warning' ? 'lockup_reminder' : 'lockup_not_executed',
        severity,
        title: severity === 'warning' ? 'Lockup Reminder' : 'Lockup Overdue',
        message:
          severity === 'warning'
            ? `Building is not yet secured. ${holderName} holds lockup responsibility.`
            : `Building lockup is overdue. ${holderName} must secure the building immediately.`,
        data: {
          buildingStatus: lockupStatus.buildingStatus,
          checkedInMembers,
          checkedInVisitors,
          lockupHolderId: lockupStatus.currentHolder.id,
          lockupHolderName: holderName,
        },
      })
    }

    // Check for people still in building
    if (checkedInMembers > 0 || checkedInVisitors > 0) {
      const totalPeople = checkedInMembers + checkedInVisitors
      jobLogger.warn('People still in building', {
        members: checkedInMembers,
        visitors: checkedInVisitors,
        total: totalPeople,
      })
    }

    jobLogger.info('Lockup alerts job completed', {
      alertEmitted: true,
      severity,
    })
  } catch (error) {
    jobLogger.error('Lockup alerts job failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
}
