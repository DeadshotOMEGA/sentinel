import { DateTime } from 'luxon'

import { prisma } from '@sentinel/database'
import { logger } from '../lib/logger.js'
import { AlertService } from '../services/alert-service.js'
import { LockupService } from '../services/lockup-service.js'
import { PresenceService } from '../services/presence-service.js'
import {
  DEFAULT_TIMEZONE,
  OPERATIONAL_DAY_START_HOUR,
  getOperationalDate,
  getOperationalDateISO,
  getOperationalWeek,
} from '../utils/operational-date.js'
import { broadcastLockupTransfer, broadcastCheckin } from '../websocket/broadcast.js'

/**
 * Daily Reset Job
 *
 * Runs at 3:00 AM (operational day boundary) to:
 * 1. Check if building was secured (alert if not)
 * 2. Force-checkout any remaining members (create MissedCheckout records)
 * 3. Create new LockupStatus for new operational day
 * 4. Auto-assign lockup to scheduled DDS if known
 */
export async function runDailyReset(): Promise<void> {
  const operationalDate = getOperationalDateISO()
  const jobLogger = logger.child({ job: 'daily-reset', operationalDate })

  jobLogger.info('Starting daily reset job')

  const alertService = new AlertService(prisma)
  const lockupService = new LockupService(prisma)
  const presenceService = new PresenceService(prisma)

  try {
    // Step 1: Check building status from yesterday's lockup status
    const previousDate = getOperationalDate(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const previousDateStr = previousDate.toISOString().substring(0, 10)
    const previousStatus = await lockupService.getStatusByDate(previousDateStr)

    if (previousStatus && previousStatus.buildingStatus !== 'secured') {
      jobLogger.warn('Building was not secured before daily reset', {
        status: previousStatus.buildingStatus,
      })

      // Emit alert for unsecured building
      await alertService.emitBuildingNotSecuredAlert()
    }

    // Step 2: Force-checkout remaining members
    const presentMembers = await presenceService.getPresentMembers()

    if (presentMembers.length > 0) {
      jobLogger.info('Force-checking out remaining members', {
        count: presentMembers.length,
        members: presentMembers.map((m) => ({
          id: m.id,
          name: `${m.rank} ${m.lastName}`,
        })),
      })

      const missedMembers: Array<{ name: string; id: string }> = []

      for (const member of presentMembers) {
        try {
          // Get the original check-in time
          const lastCheckin = await prisma.checkin.findFirst({
            where: {
              memberId: member.id,
              direction: 'IN',
            },
            orderBy: { timestamp: 'desc' },
          })

          // Create missed checkout record
          await prisma.missedCheckout.create({
            data: {
              memberId: member.id,
              date: new Date(operationalDate),
              originalCheckinAt: lastCheckin?.timestamp || new Date(),
              resolvedBy: 'daily_reset',
              notes: 'Automatically force-checked out during 3am daily reset',
            },
          })

          // Increment member's missed checkout count
          await prisma.member.update({
            where: { id: member.id },
            data: {
              missedCheckoutCount: { increment: 1 },
              lastMissedCheckout: new Date(),
            },
          })

          // Create checkout record
          const badge = await prisma.badge.findFirst({
            where: { assignedToId: member.id },
          })

          if (badge) {
            const checkout = await prisma.checkin.create({
              data: {
                memberId: member.id,
                badgeId: badge.id,
                direction: 'OUT',
                kioskId: 'SYSTEM',
                method: 'system',
              },
            })

            // Broadcast checkout
            broadcastCheckin({
              id: checkout.id,
              memberId: member.id,
              memberName: `${member.rank} ${member.firstName} ${member.lastName}`,
              direction: 'out',
              timestamp: new Date().toISOString(),
              kioskId: 'SYSTEM',
            })
          }

          missedMembers.push({
            id: member.id,
            name: `${member.rank} ${member.firstName} ${member.lastName}`,
          })
        } catch (error) {
          jobLogger.error('Failed to force-checkout member', {
            memberId: member.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      // Emit alert for missed checkouts
      if (missedMembers.length > 0) {
        await alertService.emitMissedCheckoutAlert(missedMembers)
      }
    }

    // Step 3: Force-checkout remaining visitors
    const presentVisitors = await prisma.visitor.findMany({
      where: { checkOutTime: null },
    })

    if (presentVisitors.length > 0) {
      jobLogger.info('Force-checking out remaining visitors', {
        count: presentVisitors.length,
      })

      for (const visitor of presentVisitors) {
        try {
          await prisma.visitor.update({
            where: { id: visitor.id },
            data: {
              checkOutTime: new Date(),
            },
          })
        } catch (error) {
          jobLogger.error('Failed to force-checkout visitor', {
            visitorId: visitor.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    // Step 4: Create new lockup status for the day
    const todayDate = getOperationalDate()
    const existingStatus = await prisma.lockupStatus.findFirst({
      where: { date: todayDate },
    })

    if (!existingStatus) {
      // Find today's DDS from schedule
      const { start } = getOperationalWeek()
      const ddsRole = await prisma.dutyRole.findUnique({ where: { code: 'DDS' } })

      let initialHolderId: string | null = null

      if (ddsRole) {
        const ddsSchedule = await prisma.weeklySchedule.findUnique({
          where: {
            dutyRoleId_weekStartDate: {
              dutyRoleId: ddsRole.id,
              weekStartDate: start,
            },
          },
          include: {
            assignments: {
              where: { status: { not: 'released' } },
              take: 1,
            },
          },
        })

        if (ddsSchedule && ddsSchedule.assignments.length > 0) {
          initialHolderId = ddsSchedule.assignments[0]!.memberId
          jobLogger.info('Auto-assigning lockup to scheduled DDS', {
            memberId: initialHolderId,
          })
        }
      }

      const newStatus = await prisma.lockupStatus.create({
        data: {
          date: todayDate,
          buildingStatus: 'secured',
          currentHolderId: initialHolderId,
          acquiredAt: initialHolderId ? new Date() : null,
        },
      })

      jobLogger.info('Created new lockup status for operational day', {
        operationalDate,
        initialHolderId,
        statusId: newStatus.id,
      })

      // Broadcast lockup status update
      if (initialHolderId) {
        const holder = await prisma.member.findUnique({
          where: { id: initialHolderId },
        })

        if (holder) {
          broadcastLockupTransfer({
            transferId: newStatus.id,
            fromMemberId: 'system',
            fromMemberName: 'Daily Reset',
            toMemberId: initialHolderId,
            toMemberName: `${holder.rank} ${holder.firstName} ${holder.lastName}`,
            reason: 'dds_handoff',
            timestamp: new Date().toISOString(),
          })
        }
      }
    }

    jobLogger.info('Daily reset job completed successfully', {
      forceCheckedOutMembers: presentMembers.length,
      forceCheckedOutVisitors: presentVisitors.length,
      buildingWasSecured: previousStatus?.buildingStatus === 'secured',
    })
  } catch (error) {
    jobLogger.error('Daily reset job failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
}

/**
 * Check if the daily reset was missed (e.g., server was down at 3am)
 * and run a catch-up reset if needed.
 *
 * Uses the presence of a LockupStatus record for today's operational date
 * as the indicator — Step 4 of runDailyReset() creates this record.
 */
export async function checkMissedDailyReset(): Promise<void> {
  const todayDate = getOperationalDate()
  const operationalDate = getOperationalDateISO()
  const jobLogger = logger.child({ job: 'daily-reset-catchup', operationalDate })

  // Only run catch-up if we're past the rollover hour
  const now = DateTime.now().setZone(DEFAULT_TIMEZONE)
  if (now.hour < OPERATIONAL_DAY_START_HOUR) {
    jobLogger.info('Before rollover hour, skipping catch-up')
    return
  }

  const existingStatus = await prisma.lockupStatus.findFirst({
    where: { date: todayDate },
  })

  if (existingStatus) {
    jobLogger.info('Daily reset already completed for today')
    return
  }

  jobLogger.warn('Missed daily reset detected — running catch-up')
  await runDailyReset()
  jobLogger.info('Catch-up daily reset completed')
}
