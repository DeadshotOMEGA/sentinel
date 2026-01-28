import { prisma } from '@sentinel/database'
import { logger } from '../lib/logger.js'
import { AlertService } from '../services/alert-service.js'
import { ScheduleService } from '../services/schedule-service.js'
import { LockupService } from '../services/lockup-service.js'
import { getOperationalDateISO, isDutyWatchNight } from '../utils/operational-date.js'

/**
 * Duty Watch Alerts Job
 *
 * Runs at 7:00 PM on Tuesday and Thursday to:
 * 1. Check if SWK or DSWK has taken lockup
 * 2. Check if all Duty Watch members are checked in
 * 3. Emit critical alerts via Socket.IO if conditions not met
 */
export async function runDutyWatchAlerts(): Promise<void> {
  const operationalDate = getOperationalDateISO()
  const jobLogger = logger.child({ job: 'duty-watch-alerts', operationalDate })

  // Only run on Duty Watch nights (Tuesday/Thursday)
  if (!isDutyWatchNight()) {
    jobLogger.info('Not a Duty Watch night, skipping alerts')
    return
  }

  jobLogger.info('Starting Duty Watch alerts job')

  const alertService = new AlertService(prisma)
  const scheduleService = new ScheduleService(prisma)
  const lockupService = new LockupService(prisma)

  try {
    // Get current Duty Watch team
    const dutyWatch = await scheduleService.getCurrentDutyWatch()

    if (!dutyWatch.scheduleId) {
      jobLogger.warn('No Duty Watch schedule found for this week')
      await alertService.createAlert({
        type: 'duty_watch_missing',
        severity: 'critical',
        title: 'No Duty Watch Scheduled',
        message: 'No Duty Watch team has been scheduled for this week.',
      })
      return
    }

    // Check for missing positions
    const requiredPositions = ['SWK', 'DSWK', 'QM', 'BM', 'APS']
    const assignedPositions = dutyWatch.team
      .map((m) => m.position?.code)
      .filter((code): code is string => code !== null && code !== undefined)

    const missingPositions = requiredPositions.filter((pos) => !assignedPositions.includes(pos))

    if (missingPositions.length > 0) {
      jobLogger.warn('Duty Watch missing positions', { missingPositions })
      await alertService.emitDutyWatchAlert('missing', { missingPositions })
    }

    // Check if team members are checked in
    const notCheckedIn = dutyWatch.team
      .filter((m) => !m.isCheckedIn)
      .map((m) => ({
        name: `${m.member.rank} ${m.member.firstName} ${m.member.lastName}`,
        position: m.position?.code || 'Unassigned',
      }))

    if (notCheckedIn.length > 0) {
      jobLogger.warn('Duty Watch members not checked in', {
        count: notCheckedIn.length,
        members: notCheckedIn,
      })
      await alertService.emitDutyWatchAlert('not_checked_in', { notCheckedIn })
    }

    // Check if SWK or DSWK has lockup
    const lockupStatus = await lockupService.getCurrentStatus()

    if (lockupStatus.currentHolder) {
      // Check if current holder is SWK or DSWK
      const swkMember = dutyWatch.team.find((m) => m.position?.code === 'SWK')
      const dswkMember = dutyWatch.team.find((m) => m.position?.code === 'DSWK')

      const holderIsSWK = swkMember && lockupStatus.currentHolder.id === swkMember.member.id
      const holderIsDSWK = dswkMember && lockupStatus.currentHolder.id === dswkMember.member.id

      if (!holderIsSWK && !holderIsDSWK) {
        const holderName = `${lockupStatus.currentHolder.rank} ${lockupStatus.currentHolder.firstName} ${lockupStatus.currentHolder.lastName}`

        jobLogger.warn('Lockup not held by SWK or DSWK', {
          currentHolder: lockupStatus.currentHolder.id,
          swkId: swkMember?.member.id,
          dswkId: dswkMember?.member.id,
        })

        await alertService.createAlert({
          type: 'duty_watch_missing',
          severity: 'warning',
          title: 'Lockup Not Transferred',
          message: `Lockup responsibility has not been transferred to SWK or DSWK. Current holder: ${holderName}`,
          data: {
            currentHolderId: lockupStatus.currentHolder.id,
            currentHolderName: holderName,
          },
        })
      } else {
        jobLogger.info('Lockup correctly held by Duty Watch leader', {
          position: holderIsSWK ? 'SWK' : 'DSWK',
          memberId: lockupStatus.currentHolder.id,
        })
      }
    } else {
      jobLogger.warn('No one currently holds lockup')
      await alertService.createAlert({
        type: 'duty_watch_missing',
        severity: 'critical',
        title: 'Lockup Unassigned',
        message: 'No one currently holds lockup responsibility. This must be resolved immediately.',
      })
    }

    jobLogger.info('Duty Watch alerts job completed', {
      missingPositions: missingPositions.length,
      notCheckedIn: notCheckedIn.length,
      lockupHolder: lockupStatus.currentHolder?.id || 'none',
    })
  } catch (error) {
    jobLogger.error('Duty Watch alerts job failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
}
