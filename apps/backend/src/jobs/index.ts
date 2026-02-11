import cron, { type ScheduledTask } from 'node-cron'
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
// Job Scheduler (node-cron, runs in main thread)
// ============================================================================

const scheduledTasks: ScheduledTask[] = []
let config: JobScheduleConfig = DEFAULT_CONFIG

/**
 * Wrap a job function with error logging so failures don't crash the process
 */
function wrapJob(name: string, fn: () => Promise<void>): () => void {
  return () => {
    logger.info(`Job "${name}" starting`, { component: 'scheduler' })
    fn()
      .then(() => logger.info(`Job "${name}" completed`, { component: 'scheduler' }))
      .catch((error) =>
        logger.error(`Job "${name}" failed`, {
          component: 'scheduler',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        })
      )
  }
}

/**
 * Build cron expression from HH:MM time string
 * Optional dayOfWeek for day-specific schedules (e.g., "2,4" for Tue/Thu)
 */
function toCron(time: string, dayOfWeek = '*'): string {
  const [hour, minute] = time.split(':')
  return `${minute} ${hour} * * ${dayOfWeek}`
}

/**
 * Initialize and start the job scheduler
 */
export async function startJobScheduler(customConfig?: Partial<JobScheduleConfig>): Promise<void> {
  if (scheduledTasks.length > 0) {
    logger.warn('Job scheduler already running')
    return
  }

  config = { ...DEFAULT_CONFIG, ...customConfig }

  logger.info('Starting job scheduler', { config, nodeEnv: process.env.NODE_ENV })

  if (process.env.NODE_ENV === 'test') {
    logger.info('Job scheduler disabled in test environment')
    return
  }

  try {
    const jobs = [
      {
        name: 'daily-reset',
        cronExpr: toCron(config.dayRolloverTime),
        fn: runDailyReset,
      },
      {
        name: 'duty-watch-alerts',
        cronExpr: toCron(config.dutyWatchAlertTime, '2,4'),
        fn: runDutyWatchAlerts,
      },
      {
        name: 'lockup-warning',
        cronExpr: toCron(config.lockupWarningTime),
        fn: () => runLockupAlerts('warning'),
      },
      {
        name: 'lockup-critical',
        cronExpr: toCron(config.lockupCriticalTime),
        fn: () => runLockupAlerts('critical'),
      },
    ]

    for (const job of jobs) {
      const task = cron.schedule(job.cronExpr, wrapJob(job.name, job.fn), {
        timezone: config.timezone,
      })
      scheduledTasks.push(task)
    }

    logger.info('Job scheduler started successfully', {
      jobs: jobs.map((j) => ({ name: j.name, cron: j.cronExpr })),
    })

    // Check for missed daily reset on startup
    try {
      await checkMissedDailyReset()
    } catch (catchUpError) {
      logger.error('Failed to run missed daily reset catch-up', {
        error: catchUpError instanceof Error ? catchUpError.message : 'Unknown error',
        stack: catchUpError instanceof Error ? catchUpError.stack : undefined,
      })
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
  if (scheduledTasks.length === 0) {
    logger.debug('Job scheduler not running')
    return
  }

  logger.info('Stopping job scheduler')

  for (const task of scheduledTasks) {
    task.stop()
  }
  scheduledTasks.length = 0

  logger.info('Job scheduler stopped')
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
  return scheduledTasks.length > 0
}
