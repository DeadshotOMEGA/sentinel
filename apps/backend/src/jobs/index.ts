import Bree from 'bree'
import { logger } from '../lib/logger.js'
import { checkMissedDailyReset, runDailyReset } from './daily-reset.js'
import { runDutyWatchAlerts } from './duty-watch-alerts.js'
import { runLockupAlerts } from './lockup-alerts.js'

// ============================================================================
// Job Configuration Types
// ============================================================================

export interface JobScheduleConfig {
  dayRolloverTime: string // HH:MM format, e.g., "03:00"
  timezone: string // IANA timezone, e.g., "America/Winnipeg"
  dutyWatchAlertTime: string // HH:MM format, e.g., "19:00"
  lockupWarningTime: string // HH:MM format, e.g., "22:00"
  lockupCriticalTime: string // HH:MM format, e.g., "23:00"
}

const DEFAULT_CONFIG: JobScheduleConfig = {
  dayRolloverTime: '03:00',
  timezone: 'America/Winnipeg',
  dutyWatchAlertTime: '19:00',
  lockupWarningTime: '22:00',
  lockupCriticalTime: '23:00',
}

// ============================================================================
// Job Scheduler
// ============================================================================

let bree: Bree | null = null
let config: JobScheduleConfig = DEFAULT_CONFIG

/**
 * Initialize and start the job scheduler
 */
export async function startJobScheduler(customConfig?: Partial<JobScheduleConfig>): Promise<void> {
  if (bree) {
    logger.warn('Job scheduler already running')
    return
  }

  // Merge custom config with defaults
  config = { ...DEFAULT_CONFIG, ...customConfig }

  logger.info('Starting job scheduler', {
    config,
    nodeEnv: process.env.NODE_ENV,
  })

  // In development/test, we use inline functions instead of worker threads
  // This simplifies debugging and testing
  if (process.env.NODE_ENV === 'test') {
    logger.info('Job scheduler disabled in test environment')
    return
  }

  try {
    // Create Bree instance with jobs
    bree = new Bree({
      logger: {
        info: (msg: string) => logger.info(msg, { component: 'bree' }),
        warn: (msg: string) => logger.warn(msg, { component: 'bree' }),
        error: (msg: string) => logger.error(msg, { component: 'bree' }),
      },
      root: false, // Disable file-based workers
      jobs: [
        // Daily reset at configured time (default 3:00 AM)
        // Cron format: minute hour day-of-month month day-of-week
        {
          name: 'daily-reset',
          path: () => runDailyReset(),
          cron: `${config.dayRolloverTime.split(':')[1]} ${config.dayRolloverTime.split(':')[0]} * * *`,
          timezone: config.timezone,
        },
        // Duty Watch alerts on Tue/Thu at configured time (default 7:00 PM)
        {
          name: 'duty-watch-alerts',
          path: () => runDutyWatchAlerts(),
          cron: `${config.dutyWatchAlertTime.split(':')[1]} ${config.dutyWatchAlertTime.split(':')[0]} * * 2,4`,
          timezone: config.timezone,
        },
        // Lockup warning at configured time (default 10:00 PM)
        {
          name: 'lockup-warning',
          path: () => runLockupAlerts('warning'),
          cron: `${config.lockupWarningTime.split(':')[1]} ${config.lockupWarningTime.split(':')[0]} * * *`,
          timezone: config.timezone,
        },
        // Lockup critical at configured time (default 11:00 PM)
        {
          name: 'lockup-critical',
          path: () => runLockupAlerts('critical'),
          cron: `${config.lockupCriticalTime.split(':')[1]} ${config.lockupCriticalTime.split(':')[0]} * * *`,
          timezone: config.timezone,
        },
      ],
      // Handle job execution inline (no worker threads)
      workerMessageHandler: () => {
        // Not used when running inline
      },
    })

    // Listen for job events
    bree.on('worker created', (name) => {
      logger.debug(`Job worker created: ${name}`)
    })

    bree.on('worker deleted', (name) => {
      logger.debug(`Job worker deleted: ${name}`)
    })

    // Start the scheduler
    await bree.start()

    logger.info('Job scheduler started successfully', {
      jobs: bree.config.jobs.map((j) => ({
        name: typeof j === 'string' ? j : j.name,
        cron: typeof j === 'string' ? null : j.cron,
      })),
    })

    // Check for missed daily reset on startup
    try {
      await checkMissedDailyReset()
    } catch (catchUpError) {
      logger.error('Failed to run missed daily reset catch-up', {
        error: catchUpError instanceof Error ? catchUpError.message : 'Unknown error',
        stack: catchUpError instanceof Error ? catchUpError.stack : undefined,
      })
      // Non-fatal: scheduler continues even if catch-up fails
    }
  } catch (error) {
    logger.error('Failed to start job scheduler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
}

/**
 * Stop the job scheduler gracefully
 */
export async function stopJobScheduler(): Promise<void> {
  if (!bree) {
    logger.debug('Job scheduler not running')
    return
  }

  logger.info('Stopping job scheduler')

  try {
    await bree.stop()
    bree = null
    logger.info('Job scheduler stopped')
  } catch (error) {
    logger.error('Error stopping job scheduler', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Manually trigger a job (for testing/admin purposes)
 */
export async function triggerJob(
  jobName: 'daily-reset' | 'duty-watch-alerts' | 'lockup-warning' | 'lockup-critical'
): Promise<void> {
  logger.info(`Manually triggering job: ${jobName}`)

  switch (jobName) {
    case 'daily-reset':
      await runDailyReset()
      break
    case 'duty-watch-alerts':
      await runDutyWatchAlerts()
      break
    case 'lockup-warning':
      await runLockupAlerts('warning')
      break
    case 'lockup-critical':
      await runLockupAlerts('critical')
      break
    default:
      throw new Error(`Unknown job: ${jobName}`)
  }
}

/**
 * Get current job scheduler configuration
 */
export function getJobConfig(): JobScheduleConfig {
  return { ...config }
}

/**
 * Update job scheduler configuration
 * Note: Requires restart to take effect
 */
export function updateJobConfig(newConfig: Partial<JobScheduleConfig>): void {
  config = { ...config, ...newConfig }
  logger.info('Job config updated (restart required for changes to take effect)', { config })
}

/**
 * Check if job scheduler is running
 */
export function isJobSchedulerRunning(): boolean {
  return bree !== null
}
